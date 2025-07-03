# =============================================================================
# Loadings Web API - 統合版
# PCA解析とファイルアップロード機能の統合API
# =============================================================================

library(loadings)
library(plumber)
library(jsonlite)
library(base64enc)

# =============================================================================
# グローバル変数とデータ管理
# =============================================================================

# 一時データストレージ
TEMP_DATA <- new.env()

# =============================================================================
# データ処理ユーティリティ関数
# =============================================================================

# CSVファイルの読み込みと検証
read_and_validate_csv <- function(file_path) {
  tryCatch({
    data <- read.csv(file_path, header = TRUE, stringsAsFactors = FALSE)
    
    if (nrow(data) < 2) {
      stop("データが不足しています（最低2行必要）")
    }
    
    if (ncol(data) < 2) {
      stop("データが不足しています（最低2列必要）")
    }
    
    # 数値列の特定
    numeric_cols <- sapply(data, function(x) {
      suppressWarnings({
        num_vals <- as.numeric(as.character(x))
        sum(!is.na(num_vals)) > length(x) * 0.5
      })
    })
    
    if (sum(numeric_cols) < 2) {
      stop("数値データが不足しています（最低2列の数値データが必要）")
    }
    
    numeric_data <- data[, numeric_cols, drop = FALSE]
    
    # 行名設定
    if (ncol(data) > ncol(numeric_data)) {
      first_non_numeric <- which(!numeric_cols)[1]
      if (!is.na(first_non_numeric)) {
        rownames(numeric_data) <- make.unique(as.character(data[, first_non_numeric]))
      }
    }
    
    # 欠損値除去
    complete_data <- numeric_data[complete.cases(numeric_data), ]
    
    if (nrow(complete_data) < 2) {
      stop("完全なデータが不足しています（欠損値除去後）")
    }
    
    numeric_data_clean <- apply(complete_data, 2, as.numeric)
    rownames(numeric_data_clean) <- rownames(complete_data)
    
    return(list(
      data = numeric_data_clean,
      original_data = data,
      numeric_columns = names(numeric_data),
      removed_rows = nrow(data) - nrow(complete_data),
      validation_status = "success"
    ))
    
  }, error = function(e) {
    return(list(
      data = NULL,
      validation_status = "error",
      error_message = as.character(e)
    ))
  })
}

# データの基本統計情報生成
generate_data_summary <- function(data) {
  if (is.null(data) || !is.matrix(data) && !is.data.frame(data)) {
    return(NULL)
  }
  
  summary_stats <- list(
    dimensions = list(
      rows = nrow(data),
      columns = ncol(data)
    ),
    column_names = colnames(data),
    basic_stats = list(),
    correlation_matrix = NULL,
    data_quality = list()
  )
  
  # 各列の基本統計
  for (col in colnames(data)) {
    col_data <- data[, col]
    summary_stats$basic_stats[[col]] <- list(
      mean = round(mean(col_data, na.rm = TRUE), 4),
      median = round(median(col_data, na.rm = TRUE), 4),
      sd = round(sd(col_data, na.rm = TRUE), 4),
      min = round(min(col_data, na.rm = TRUE), 4),
      max = round(max(col_data, na.rm = TRUE), 4),
      missing_count = sum(is.na(col_data))
    )
  }
  
  # 相関行列
  if (ncol(data) > 1) {
    summary_stats$correlation_matrix <- round(cor(data, use = "complete.obs"), 3)
  }
  
  # データ品質評価
  summary_stats$data_quality <- list(
    total_missing = sum(is.na(data)),
    missing_percentage = round(sum(is.na(data)) / (nrow(data) * ncol(data)) * 100, 2),
    outliers_detected = detect_outliers(data),
    recommendation = generate_recommendations(data)
  )
  
  return(summary_stats)
}

# 外れ値検出
detect_outliers <- function(data) {
  outlier_info <- list()
  
  for (col in colnames(data)) {
    col_data <- data[, col]
    Q1 <- quantile(col_data, 0.25, na.rm = TRUE)
    Q3 <- quantile(col_data, 0.75, na.rm = TRUE)
    IQR <- Q3 - Q1
    
    lower_bound <- Q1 - 1.5 * IQR
    upper_bound <- Q3 + 1.5 * IQR
    
    outliers <- which(col_data < lower_bound | col_data > upper_bound)
    
    outlier_info[[col]] <- list(
      count = length(outliers),
      percentage = round(length(outliers) / length(col_data) * 100, 2),
      indices = outliers
    )
  }
  
  return(outlier_info)
}

# 推奨事項生成
generate_recommendations <- function(data) {
  recommendations <- c()
  
  if (nrow(data) < 30) {
    recommendations <- c(recommendations, "サンプルサイズが小さいため、結果の解釈に注意が必要です")
  }
  
  if (ncol(data) > nrow(data)) {
    recommendations <- c(recommendations, "変数数がサンプル数を上回っています。次元削減が推奨されます")
  }
  
  if (ncol(data) > 1) {
    cor_matrix <- cor(data, use = "complete.obs")
    high_cor <- which(abs(cor_matrix) > 0.9 & upper.tri(cor_matrix), arr.ind = TRUE)
    if (nrow(high_cor) > 0) {
      recommendations <- c(recommendations, "高い相関を持つ変数ペアが検出されました。多重共線性に注意してください")
    }
  }
  
  return(recommendations)
}

# データの一時保存
store_temp_data <- function(data, summary) {
  data_id <- paste0("data_", format(Sys.time(), "%Y%m%d_%H%M%S"), "_", 
                   sample(1000:9999, 1))
  
  TEMP_DATA[[data_id]] <- list(
    data = data,
    summary = summary,
    timestamp = Sys.time(),
    analysis_results = list()
  )
  
  return(data_id)
}

# 一時データ取得
get_temp_data <- function(data_id) {
  if (exists(data_id, envir = TEMP_DATA)) {
    return(TEMP_DATA[[data_id]])
  } else {
    return(NULL)
  }
}

# 解析結果の保存
store_analysis_result <- function(data_id, analysis_type, result) {
  if (exists(data_id, envir = TEMP_DATA)) {
    analysis_id <- paste0(analysis_type, "_", format(Sys.time(), "%H%M%S"))
    TEMP_DATA[[data_id]]$analysis_results[[analysis_id]] <- list(
      type = analysis_type,
      result = result,
      timestamp = Sys.time()
    )
    return(analysis_id)
  }
  return(NULL)
}

# PCA解析実行
perform_pca_analysis <- function(data, scale = TRUE, center = TRUE) {
  tryCatch({
    pca_result <- prcomp(data, scale = scale, center = center)
    pca_with_loading <- pca_loading(pca_result)
    
    result <- list(
      pca = pca_result,
      loadings = pca_with_loading,
      summary = list(
        variance_explained = summary(pca_result)$importance,
        num_components = ncol(pca_result$x),
        eigenvalues = pca_result$sdev^2
      ),
      parameters = list(scale = scale, center = center)
    )
    
    return(result)
    
  }, error = function(e) {
    return(list(
      error = TRUE,
      message = as.character(e)
    ))
  })
}

# 画像生成：biplot
generate_biplot_image <- function(pca_result, filename = NULL) {
  if (is.null(filename)) {
    filename <- tempfile(fileext = ".png")
  }
  
  png(filename, width = 800, height = 800)
  biplot(pca_result)
  dev.off()
  
  return(filename)
}

# 画像生成：因子負荷量分布
generate_loading_plot <- function(pca_result, component = 1, filename = NULL) {
  if (is.null(filename)) {
    filename <- tempfile(fileext = ".png")
  }
  
  png(filename, width = 800, height = 800)
  if (!is.null(pca_result$loadings) && !is.null(pca_result$loadings$R)) {
    mycol <- ifelse(sort(pca_result$loadings$R[, component]) > 0, 
                   yes = "green2", no = "red2")
    barplot(sort(pca_result$loadings$R[, component]),
           col = mycol,
           main = paste0("Loading ", component, " (Correlation Coefficient)"))
  } else {
    loadings_vals <- pca_result$pca$rotation[, component]
    mycol <- ifelse(sort(loadings_vals) > 0, yes = "green2", no = "red2")
    barplot(sort(loadings_vals),
           col = mycol,
           main = paste0("Loading ", component, " (Loadings)"))
  }
  dev.off()
  
  return(filename)
}

# 画像生成：p値分布
generate_pvalue_plot <- function(pca_result, component = 1, filename = NULL) {
  if (is.null(filename)) {
    filename <- tempfile(fileext = ".png")
  }
  
  png(filename, width = 800, height = 800)
  if (!is.null(pca_result$loadings) && !is.null(pca_result$loadings$p.value)) {
    barplot(sort(pca_result$loadings$p.value[, component]),
           main = paste0("Loading ", component, " (P-value)"))
  } else {
    plot(1, type = "n", xlab = "", ylab = "", main = "P-values not available")
    text(1, 1, "P-values require loadings package analysis", cex = 1.2)
  }
  dev.off()
  
  return(filename)
}

# データクリーンアップ
cleanup_temp_data <- function(max_age_hours = 24) {
  current_time <- Sys.time()
  to_remove <- c()
  
  for (data_id in ls(TEMP_DATA)) {
    data_info <- TEMP_DATA[[data_id]]
    if (difftime(current_time, data_info$timestamp, units = "hours") > max_age_hours) {
      to_remove <- c(to_remove, data_id)
    }
  }
  
  for (id in to_remove) {
    rm(list = id, envir = TEMP_DATA)
  }
  
  return(length(to_remove))
}

# 画像をBase64エンコード
encode_image_base64 <- function(image_file) {
  if (file.exists(image_file)) {
    image_data <- readBin(image_file, "raw", file.info(image_file)$size)
    base64_data <- base64enc::base64encode(image_data)
    file.remove(image_file)
    return(paste0("data:image/png;base64,", base64_data))
  }
  return(NULL)
}

# PCA結果取得または計算
get_or_compute_pca <- function(data_id, data) {
  temp_data <- get_temp_data(data_id)
  
  for (analysis_id in names(temp_data$analysis_results)) {
    if (temp_data$analysis_results[[analysis_id]]$type == "pca") {
      return(temp_data$analysis_results[[analysis_id]]$result)
    }
  }
  
  pca_result <- perform_pca_analysis(data)
  analysis_id <- store_analysis_result(data_id, "pca", pca_result)
  return(pca_result)
}

# 因子負荷量詳細情報抽出
extract_loading_details <- function(pca_result, component) {
  details <- list()
  
  if (!is.null(pca_result$loadings) && !is.null(pca_result$loadings$R)) {
    loadings_vals <- pca_result$loadings$R[, component]
    details$correlation_coefficients <- loadings_vals
    details$sorted_loadings <- sort(loadings_vals, decreasing = TRUE)
    details$top_positive <- head(names(sort(loadings_vals, decreasing = TRUE)), 5)
    details$top_negative <- head(names(sort(loadings_vals, decreasing = FALSE)), 5)
  } else {
    loadings_vals <- pca_result$pca$rotation[, component]
    details$loadings <- loadings_vals
    details$sorted_loadings <- sort(loadings_vals, decreasing = TRUE)
    details$top_positive <- head(names(sort(loadings_vals, decreasing = TRUE)), 5)
    details$top_negative <- head(names(sort(loadings_vals, decreasing = FALSE)), 5)
  }
  
  return(details)
}

# p値詳細情報抽出
extract_pvalue_details <- function(pca_result, component) {
  details <- list()
  
  if (!is.null(pca_result$loadings) && !is.null(pca_result$loadings$p.value)) {
    pvals <- pca_result$loadings$p.value[, component]
    details$p_values <- pvals
    details$significant_variables <- names(pvals[pvals < 0.05])
    details$highly_significant <- names(pvals[pvals < 0.01])
    details$sorted_pvalues <- sort(pvals)
  } else {
    details$message <- "p値はloadingsパッケージの解析結果でのみ利用可能です"
    details$p_values <- NULL
  }
  
  return(details)
}

# PCA統計情報抽出
extract_pca_statistics <- function(pca_result) {
  stats <- list(
    total_variance = sum(pca_result$summary$eigenvalues),
    explained_variance_ratio = pca_result$summary$variance_explained[2, ],
    cumulative_variance_ratio = pca_result$summary$variance_explained[3, ],
    eigenvalues = pca_result$summary$eigenvalues,
    num_components = pca_result$summary$num_components
  )
  
  stats$kaiser_components <- sum(stats$eigenvalues > 1)
  stats$components_80_percent <- which(stats$cumulative_variance_ratio >= 0.8)[1]
  
  return(stats)
}

# =============================================================================
# API設定とCORS
# =============================================================================

# Title
#* @apiTitle Loadings Web API
# Description  
#* @apiDescription PCA解析とCSVアップロード機能を提供するWebAPI
# TOS link
#* @apiTOS
# Contact object
#* @apiContact list(name = "Myxogastria0808", url = "https://github.com/Myxogastria0808/loadings-web-api-sample", email = "r.rstudio.c@gmail.com")
# License object
#* @apiLicense list(name = "Apache 2.0", url = "https://www.apache.org/licenses/LICENSE-2.0.html")
# Version
#* @apiVersion 1.0.0
# Tag Description
#* @apiTag loadings "Loadings Web API"

#* @filter cors
cors <- function(req, res) {
    res$setHeader("Access-Control-Allow-Origin", "*")
    if (req$REQUEST_METHOD == "OPTIONS") {
        res$setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
        res$setHeader(
        "Access-Control-Allow-Headers",
        req$HTTP_ACCESS_CONTROL_REQUEST_HEADERS
        )
        res$status <- 200
        return(list())
    } else {
        plumber::forward()
    }
}

# =============================================================================
# アップロードエンドポイント
# =============================================================================

#* CSVファイルアップロード
#* @param file:file CSVファイル
#* @serializer json
#* @post /upload/csv
function(req, file) {
  tryCatch({
    # デバッグ情報を追加
    cat("=== ファイルアップロードデバッグ情報 ===\n")
    cat("File parameter type:", typeof(file), "\n")
    cat("File parameter class:", class(file), "\n")
    cat("File parameter length:", length(file), "\n")
    
    if (is.list(file)) {
      cat("File list names:", names(file), "\n")
      for (name in names(file)) {
        cat("  ", name, ":", class(file[[name]]), "\n")
      }
    }
    
    cat("Request headers:\n")
    print(req$HEADERS)
    
    # ファイルの存在確認を強化
    if (is.null(file) || length(file) == 0) {
      return(list(
        status = "error",
        message = "ファイルがアップロードされていません",
        debug_info = list(
          file_type = typeof(file),
          file_class = class(file),
          file_length = length(file)
        )
      ))
    }
    
    # filenameの存在確認を追加
    filename <- NULL
    if (is.list(file) && !is.null(file$filename)) {
      filename <- file$filename
    } else if (is.list(file) && !is.null(file$name)) {
      filename <- file$name
    } else if (is.list(file) && length(file) > 0) {
      # ファイル名が取得できない場合のフォールバック
      filename <- "uploaded_file.csv"
    }
    
    if (is.null(filename) || filename == "") {
      filename <- "uploaded_file.csv"
    }
    
    cat("Detected filename:", filename, "\n")
    
    # CSV拡張子チェック（filename が存在する場合のみ）
    if (!grepl("\\.(csv|CSV)$", filename)) {
      return(list(
        status = "error", 
        message = "CSVファイルのみアップロード可能です"
      ))
    }
    
    # データパスの確認
    datapath <- NULL
    if (is.list(file) && !is.null(file$datapath)) {
      datapath <- file$datapath
      cat("Found datapath:", datapath, "\n")
    } else if (is.list(file) && !is.null(file$tmp_name)) {
      datapath <- file$tmp_name
      cat("Found tmp_name:", datapath, "\n")
    }
    
    if (is.null(datapath)) {
      cat("データパスが見つかりません。利用可能なフィールド:\n")
      if (is.list(file)) {
        for (name in names(file)) {
          cat("  ", name, ":", file[[name]], "\n")
        }
      }
      return(list(
        status = "error",
        message = "アップロードされたファイルが見つかりません",
        debug_info = list(
          available_fields = if(is.list(file)) names(file) else NULL,
          file_structure = if(is.list(file)) file else NULL
        )
      ))
    }
    
    if (!file.exists(datapath)) {
      return(list(
        status = "error",
        message = paste("ファイルパスが存在しません:", datapath),
        debug_info = list(
          datapath = datapath,
          file_exists = file.exists(datapath)
        )
      ))
    }
    
    temp_file <- tempfile(fileext = ".csv")
    file.copy(datapath, temp_file)
    
    validation_result <- read_and_validate_csv(temp_file)
    
    if (validation_result$validation_status == "error") {
      file.remove(temp_file)
      return(list(
        status = "error",
        message = validation_result$error_message
      ))
    }
    
    summary_stats <- generate_data_summary(validation_result$data)
    data_id <- store_temp_data(validation_result$data, summary_stats)
    
    file.remove(temp_file)
    
    return(list(
      status = "success",
      data_id = data_id,
      message = "CSVファイルが正常にアップロードされました",
      file_info = list(
        filename = filename,
        upload_time = format(Sys.time(), "%Y-%m-%d %H:%M:%S")
      ),
      data_summary = list(
        dimensions = summary_stats$dimensions,
        column_names = summary_stats$column_names,
        removed_rows = validation_result$removed_rows,
        data_quality = summary_stats$data_quality
      )
    ))
    
  }, error = function(e) {
    return(list(
      status = "error",
      message = paste("アップロード処理中にエラーが発生しました:", as.character(e))
    ))
  })
}

#* データ要約統計取得
#* @param data_id データID
#* @serializer json  
#* @post /data/summary
function(req, data_id) {
  tryCatch({
    # リクエストボディからdata_idを取得する処理を追加
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      # POSTボディからdata_idを取得を試行
      if (!is.null(req$body) && length(req$body) > 0) {
        if (is.character(req$body)) {
          # JSON文字列の場合
          body_data <- tryCatch(fromJSON(req$body), error = function(e) NULL)
          if (!is.null(body_data) && !is.null(body_data$data_id)) {
            data_id <- body_data$data_id
          }
        } else if (is.list(req$body) && !is.null(req$body$data_id)) {
          data_id <- req$body$data_id
        }
      }
      
      # それでもdata_idが取得できない場合
      if (is.null(data_id) || data_id == "") {
        return(list(
          status = "error",
          message = "data_idが指定されていません。POSTボディまたはパラメータとしてdata_idを送信してください。"
        ))
      }
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(list(
        status = "error",
        message = paste("指定されたdata_id「", data_id, "」のデータが見つかりません")
      ))
    }
    
    return(list(
      status = "success",
      data_id = data_id,
      summary = temp_data$summary,
      upload_time = format(temp_data$timestamp, "%Y-%m-%d %H:%M:%S")
    ))
    
  }, error = function(e) {
    return(list(
      status = "error", 
      message = paste("要約統計取得中にエラーが発生しました:", as.character(e))
    ))
  })
}

#* データ要約統計取得（GET版）
#* @param data_id:string データID
#* @serializer json  
#* @get /data/summary/:data_id
function(data_id) {
  tryCatch({
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      return(list(
        status = "error",
        message = "data_idが指定されていません",
        available_data_ids = ls(TEMP_DATA)
      ))
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(list(
        status = "error",
        message = paste("指定されたdata_id「", data_id, "」のデータが見つかりません"),
        available_data_ids = ls(TEMP_DATA)
      ))
    }
    
    return(list(
      status = "success",
      data_id = data_id,
      summary = temp_data$summary,
      upload_time = format(temp_data$timestamp, "%Y-%m-%d %H:%M:%S")
    ))
    
  }, error = function(e) {
    return(list(
      status = "error", 
      message = paste("要約統計取得中にエラーが発生しました:", as.character(e))
    ))
  })
}

# =============================================================================
# 解析エンドポイント
# =============================================================================

#* カスタムデータでPCA解析実行
#* @param data_id データID 
#* @param scale:logical データの標準化 (デフォルト: TRUE)
#* @param center:logical データの中心化 (デフォルト: TRUE)
#* @serializer json
#* @post /analyze/pca-custom
function(data_id, scale = TRUE, center = TRUE) {
  tryCatch({
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      return(list(
        status = "error",
        message = "data_idが指定されていません"
      ))
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(list(
        status = "error",
        message = "指定されたdata_idのデータが見つかりません"
      ))
    }
    
    data <- temp_data$data
    
    pca_result <- perform_pca_analysis(data, scale = scale, center = center)
    
    if (!is.null(pca_result$error)) {
      return(list(
        status = "error",
        message = pca_result$message
      ))
    }
    
    # biplot画像生成
    biplot_file <- generate_biplot_image(pca_result$pca)
    biplot_base64 <- encode_image_base64(biplot_file)
    
    # 成分別の画像生成
    max_components <- min(5, ncol(pca_result$pca$x))
    component_images <- list()
    
    for (i in 1:max_components) {
      loading_file <- generate_loading_plot(pca_result, component = i)
      loading_base64 <- encode_image_base64(loading_file)
      
      pvalue_file <- generate_pvalue_plot(pca_result, component = i)
      pvalue_base64 <- encode_image_base64(pvalue_file)
      
      component_images[[paste0("PC", i)]] <- list(
        loading_plot = loading_base64,
        pvalue_plot = pvalue_base64
      )
    }
    
    analysis_id <- store_analysis_result(data_id, "pca", pca_result)
    
    return(list(
      status = "success",
      analysis_id = analysis_id,
      data_id = data_id,
      parameters = list(
        scale = scale,
        center = center,
        components_analyzed = max_components
      ),
      results = list(
        biplot_image = biplot_base64,
        component_images = component_images,
        summary = pca_result$summary,
        eigenvalues = pca_result$summary$eigenvalues,
        variance_explained = pca_result$summary$variance_explained
      ),
      statistical_info = extract_pca_statistics(pca_result)
    ))
    
  }, error = function(e) {
    return(list(
      status = "error",
      message = paste("PCA解析中にエラーが発生しました:", as.character(e))
    ))
  })
}

#* カスタムデータで因子負荷量分析
#* @param data_id データID
#* @param component:int 成分番号
#* @serializer json
#* @post /analyze/correlation-custom/:component
function(data_id, component) {
  tryCatch({
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      return(list(
        status = "error",
        message = "data_idが指定されていません"
      ))
    }
    
    component <- as.integer(component)
    if (is.na(component) || component < 1) {
      return(list(
        status = "error",
        message = "有効な成分番号を指定してください"
      ))
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(list(
        status = "error",
        message = "指定されたdata_idのデータが見つかりません"
      ))
    }
    
    pca_result <- get_or_compute_pca(data_id, temp_data$data)
    
    if (component > ncol(pca_result$pca$x)) {
      return(list(
        status = "error",
        message = paste("成分番号が範囲外です。最大成分数:", ncol(pca_result$pca$x))
      ))
    }
    
    loading_file <- generate_loading_plot(pca_result, component = component)
    loading_base64 <- encode_image_base64(loading_file)
    
    loading_details <- extract_loading_details(pca_result, component)
    
    return(list(
      status = "success",
      data_id = data_id,
      component = component,
      loading_plot = loading_base64,
      loading_details = loading_details
    ))
    
  }, error = function(e) {
    return(list(
      status = "error",
      message = paste("因子負荷量解析中にエラーが発生しました:", as.character(e))
    ))
  })
}

#* カスタムデータでp値分布分析
#* @param data_id データID
#* @param component:int 成分番号
#* @serializer json
#* @post /analyze/pvalue-custom/:component
function(data_id, component) {
  tryCatch({
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      return(list(
        status = "error",
        message = "data_idが指定されていません"
      ))
    }
    
    component <- as.integer(component)
    if (is.na(component) || component < 1) {
      return(list(
        status = "error",
        message = "有効な成分番号を指定してください"
      ))
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(list(
        status = "error",
        message = "指定されたdata_idのデータが見つかりません"
      ))
    }
    
    pca_result <- get_or_compute_pca(data_id, temp_data$data)
    
    if (component > ncol(pca_result$pca$x)) {
      return(list(
        status = "error",
        message = paste("成分番号が範囲外です。最大成分数:", ncol(pca_result$pca$x))
      ))
    }
    
    pvalue_file <- generate_pvalue_plot(pca_result, component = component)
    pvalue_base64 <- encode_image_base64(pvalue_file)
    
    pvalue_details <- extract_pvalue_details(pca_result, component)
    
    return(list(
      status = "success",
      data_id = data_id,
      component = component,
      pvalue_plot = pvalue_base64,
      pvalue_details = pvalue_details
    ))
    
  }, error = function(e) {
    return(list(
      status = "error",
      message = paste("p値解析中にエラーが発生しました:", as.character(e))
    ))
  })
}

#* 解析結果取得
#* @param analysis_id:string 解析ID
#* @serializer json
#* @get /results/:analysis_id
function(analysis_id) {
  tryCatch({
    # analysis_idの検証
    if (missing(analysis_id) || is.null(analysis_id) || analysis_id == "") {
      return(list(
        status = "error",
        message = "analysis_idが指定されていません"
      ))
    }
    
    # データ検索
    found_result <- NULL
    found_data_id <- NULL
    
    for (data_id in ls(TEMP_DATA)) {
      temp_data <- TEMP_DATA[[data_id]]
      if (!is.null(temp_data$analysis_results) && 
          analysis_id %in% names(temp_data$analysis_results)) {
        found_result <- temp_data$analysis_results[[analysis_id]]
        found_data_id <- data_id
        break
      }
    }
    
    if (is.null(found_result)) {
      return(list(
        status = "error",
        message = paste("指定された解析ID「", analysis_id, "」の結果が見つかりません。"),
        available_data_ids = ls(TEMP_DATA),
        help = "利用可能なdata_idからPCA解析を実行してから解析結果を取得してください。"
      ))
    }
    
    return(list(
      status = "success",
      analysis_id = analysis_id,
      data_id = found_data_id,
      analysis_type = found_result$type,
      timestamp = format(found_result$timestamp, "%Y-%m-%d %H:%M:%S"),
      result = found_result$result
    ))
    
  }, error = function(e) {
    return(list(
      status = "error",
      message = paste("解析結果取得中にエラーが発生しました:", as.character(e))
    ))
  })
}

# =============================================================================
# エクスポートエンドポイント
# =============================================================================

#* データエクスポート（CSV形式）
#* @param data_id:string データID
#* @param include_analysis:logical 解析結果を含むか
#* @serializer csv
#* @get /export/data/:data_id
function(data_id, include_analysis = FALSE) {
  tryCatch({
    # data_idの検証
    if (missing(data_id) || is.null(data_id) || data_id == "") {
      return(data.frame(
        error = "data_idが指定されていません",
        available_data_ids = paste(ls(TEMP_DATA), collapse = ", ")
      ))
    }
    
    temp_data <- get_temp_data(data_id)
    if (is.null(temp_data)) {
      return(data.frame(
        error = paste("指定されたdata_id「", data_id, "」のデータが見つかりません"),
        available_data_ids = paste(ls(TEMP_DATA), collapse = ", "),
        help = "有効なdata_idを指定するか、CSVファイルを新規アップロードしてください"
      ))
    }
    
    data_df <- as.data.frame(temp_data$data)
    
    # 解析結果の統合
    if (include_analysis && !is.null(temp_data$analysis_results) && 
        length(temp_data$analysis_results) > 0) {
      for (analysis_id in names(temp_data$analysis_results)) {
        analysis <- temp_data$analysis_results[[analysis_id]]
        if (analysis$type == "pca" && !is.null(analysis$result$pca)) {
          pca_scores <- analysis$result$pca$x
          colnames(pca_scores) <- paste0("PCA_", colnames(pca_scores))
          # データフレームのサイズ調整
          min_rows <- min(nrow(data_df), nrow(pca_scores))
          data_df <- data_df[1:min_rows, ]
          pca_scores <- pca_scores[1:min_rows, ]
          data_df <- cbind(data_df, pca_scores)
        }
      }
    }
    
    return(data_df)
    
  }, error = function(e) {
    return(data.frame(
      error = paste("データエクスポート中にエラーが発生しました:", as.character(e)),
      data_id = ifelse(exists("data_id"), data_id, "不明"),
      timestamp = format(Sys.time(), "%Y-%m-%d %H:%M:%S")
    ))
  })
}

# =============================================================================
# ユーティリティエンドポイント
# =============================================================================

#* APIヘルスチェック
#* @serializer json
#* @get /health
function() {
  cleaned_count <- cleanup_temp_data()
  
  return(list(
    status = "healthy",
    timestamp = format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
    version = "1.0.1",
    features = list(
      csv_upload = TRUE,
      custom_analysis = TRUE,
      export_functions = TRUE
    ),
    temp_data_cleaned = cleaned_count,
    endpoints = list(
      upload = c("/upload/csv", "/data/summary", "/data/summary/{data_id}"),
      analysis = c("/analyze/pca-custom", "/analyze/correlation-custom/{component}", 
                  "/analyze/pvalue-custom/{component}"),
      export = c("/export/data/{data_id}"),
      utility = c("/health", "/results/{analysis_id}")
    ),
    bug_fixes = list(
      "v1.0.1" = c(
        "ファイルアップロード時のnull pointer対策",
        "POSTパラメータ処理の改善", 
        "エラーメッセージの詳細化",
        "GET版data/summaryエンドポイント追加",
        "利用可能data_id表示機能追加"
      )
    )
  ))
} 