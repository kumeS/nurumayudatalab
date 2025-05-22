// Generate clustering script based on parameters
const generateClusteringScript = (params) => {
  // クラスタ点群と密度マップを強化するため、両方のコードを改善
  let densityCode = '';
  
  if (params.mode === 'density') {
    // 密度マップ用のコードを強化
    densityCode = `
      # 密度マップの追加（コンター）- 両方の時点の密度を表示
      # 時点 t の密度を詳細に計算
      kde_x <- seq(min(points_t$x), max(points_t$x), length.out=75)
      kde_y <- seq(min(points_t$y), max(points_t$y), length.out=75)
      kde_z <- matrix(0, 75, 75)
      
      # より詳細なカーネル密度推定 - 時点 t（適応的バンド幅）
      h <- 0.3 * sqrt(var(points_t$x) + var(points_t$y))  # 適応的バンド幅
      for(i in 1:75) {
        for(j in 1:75) {
          # 2次元ガウスカーネル
          dst <- sqrt((points_t$x - kde_x[i])^2 + (points_t$y - kde_y[j])^2)
          kde_z[i,j] <- sum(exp(-dst^2/(2*h^2))) / (n_points * 2 * pi * h^2)
        }
      }
      
      # 等高線プロット - 時点 t（より多くのレベル）
      contour(kde_x, kde_y, kde_z, add=TRUE, col="darkred", lwd=1.2, nlevels=12)
      
      # 時点 t+1 の密度も同様に詳細に計算
      kde_x1 <- seq(min(points_t1$x), max(points_t1$x), length.out=75)
      kde_y1 <- seq(min(points_t1$y), max(points_t1$y), length.out=75)
      kde_z1 <- matrix(0, 75, 75)
      
      # 適応的バンド幅による密度推定 - 時点 t+1
      h1 <- 0.3 * sqrt(var(points_t1$x) + var(points_t1$y))
      for(i in 1:75) {
        for(j in 1:75) {
          dst <- sqrt((points_t1$x - kde_x1[i])^2 + (points_t1$y - kde_y1[j])^2)
          kde_z1[i,j] <- sum(exp(-dst^2/(2*h1^2))) / (n_points * 2 * pi * h1^2)
        }
      }
      
      # 等高線プロット - 時点 t+1（より多くのレベル）
      contour(kde_x1, kde_y1, kde_z1, add=TRUE, col="darkblue", lwd=1.2, nlevels=12)
      
      # 密度の高い領域を半透明の塗りつぶしで表示
      filled.contour(kde_x, kde_y, kde_z, levels=quantile(kde_z, seq(0.5, 0.95, 0.15)), 
                    col=adjustcolor(c("pink", "red"), alpha.f=0.3), add=TRUE)
      filled.contour(kde_x1, kde_y1, kde_z1, levels=quantile(kde_z1, seq(0.5, 0.95, 0.15)), 
                    col=adjustcolor(c("lightblue", "blue"), alpha.f=0.2), add=TRUE)
    `;
  } else {
    // クラスタ点群の場合はシンプルな密度表示
    densityCode = '';
  }
  
  // 時系列表示モードに応じた可視化コード
  let timeDisplayCode = '';
  if (params.timeDisplayMode === 'cumulative') {
    timeDisplayCode = `
    #-- 累積表示モード：全時点を同時に表示 --
    # 全てのデータを一度にプロット
    plot(NULL, xlim=range(df_points$x), ylim=range(df_points$y),
         main="Cumulative Time Series: All Time Points",
         xlab="", ylab="", axes=FALSE)
         
    # カラーパレット
    time_colors <- rainbow(n_times, alpha=0.7)
    
    # 全時点のデータをプロット
    for (plot_t in 1:n_times) {
      points_plot <- df_points[df_points$time==plot_t, ]
      # 透明度を時間によって調整（最新のデータほど不透明に）
      alpha_val <- 0.3 + 0.7 * (plot_t / n_times)
      points(points_plot$x, points_plot$y, pch=19, 
             col=adjustcolor(time_colors[plot_t], alpha.f=alpha_val), 
             cex=0.5)
      
      # 各時点のクラスタ重心をプロット
      centroids_plot <- df_centroids[df_centroids$time==plot_t, ]
      points(centroids_plot$x, centroids_plot$y, pch=8, 
             col=time_colors[plot_t], cex=1.2)
    }
    
    # 全時間の輸送プランを同時表示
    for (plot_t in 1:(n_times-1)) {
      arrows_plot <- df_arrows[df_arrows$time==plot_t, ]
      if (nrow(arrows_plot) > 0) {
        # 矢印の透明度も時間によって調整
        alpha_val <- 0.3 + 0.7 * (plot_t / n_times)
        arrows(
          arrows_plot$x, arrows_plot$y, 
          arrows_plot$xend, arrows_plot$yend,
          length=0.1, 
          col=adjustcolor("black", alpha.f=alpha_val),
          lwd=1 + 5 * arrows_plot$mass / max(arrows_plot$mass)
        )
      }
    }
    
    # 凡例を追加（時間とともに色が変化）
    legend_text <- paste("Time", 1:n_times)
    legend("topright", 
        legend=legend_text,
        col=time_colors, 
        pch=19,
        bg="white", cex=0.7)
    `;
  } else {
    // 連続する時点表示モード（デフォルト）
    timeDisplayCode = '';
  }

  return `
    # 最適輸送可視化スクリプト
    set.seed(123)
    
    #-- パラメータ設定 --
    n_points <- ${params.n_points}  # 各時点の点数
    n_times  <- ${params.n_times}   # 時点数
    max_k    <- ${params.max_k}     # クラスタ数候補の上限
    time_display_mode <- "${params.timeDisplayMode}"  # 時系列表示モード
    
    #-- シルエット幅で最適クラスタ数を決める関数 --
    choose_k <- function(mat, max_k=${params.max_k}){
      # 2..max_k で k-means → silhouette 平均幅を算出 → 最大となる k を返す
      sil <- sapply(2:max_k, function(k){
        km <- kmeans(mat, centers=k, nstart=10)
        # WebR対応: カスタム関数を使用
        simple_silhouette(mat, km$cluster)
      })
      which.max(sil) + 1
    }
    
    #-- データ構造の準備 --
    all_clusters <- list()
    all_centroids <- list()
    all_weights   <- list()
    
    #-- 1) 各時点で乱数データ生成＋クラスタリング --
    for(t in seq_len(n_times)){
      # 例として、時間とともに中心が少し変化する乱数を作成
      mu <- c(sin(t/2), cos(t/3)) * 2
      pts <- matrix(rnorm(n_points*2, sd=1), ncol=2) + matrix(mu, nrow=n_points, ncol=2, byrow=TRUE)
      
      # 最適 k の決定
      best_k <- choose_k(pts, max_k)
      
      # k-means
      km <- kmeans(pts, centers=best_k, nstart=20)
      
      # 結果を格納
      df_pts <- data.frame(time=t, x=pts[,1], y=pts[,2], cluster=km$cluster)
      all_clusters[[t]] <- df_pts
      
      # クラスタ重心と質量
      ctrs <- as.data.frame(km$centers)
      names(ctrs) <- c("x","y")
      ctrs$cluster <- 1:nrow(ctrs)
      ctrs$time <- t
      
      wts <- data.frame(
        cluster = 1:best_k,
        size = as.numeric(table(km$cluster)),
        time = t
      )
      wts$weight <- wts$size / sum(wts$size)
      
      all_centroids[[t]] <- ctrs
      all_weights[[t]]   <- wts
    }
    
    # データを一つのデータフレームにまとめる
    df_points    <- do.call(rbind, all_clusters)
    df_centroids <- do.call(rbind, all_centroids)
    df_weights   <- do.call(rbind, all_weights)
    
    #-- 2) 時点間で輸送プランを計算 --
    arrow_list <- list()
    for(t in seq_len(n_times-1)){
      # この時点と次の時点の重心・質量行列
      C1 <- df_centroids[df_centroids$time==t, ]
      C2 <- df_centroids[df_centroids$time==t+1, ]
      w1 <- df_weights[df_weights$time==t, "weight"]
      w2 <- df_weights[df_weights$time==t+1, "weight"]
      
      # コスト行列（Euclid 距離）
      costm <- as.matrix(dist(rbind(C1[,c("x","y")], C2[,c("x","y")])))
      n1 <- nrow(C1)
      costm <- costm[1:n1, (n1+1):(n1+nrow(C2))]
      
      # 輸送プラン (WebR対応: カスタム関数を使用)
      plan <- simple_transport(a=w1, b=w2, costm=costm)
      
      # 矢印用に座標を結合
      df_arrows <- data.frame(
        time   = t,
        x      = C1$x[plan$from],
        y      = C1$y[plan$from],
        xend   = C2$x[plan$to],
        yend   = C2$y[plan$to],
        mass   = plan$mass
      )
      arrow_list[[t]] <- df_arrows
    }
    df_arrows <- do.call(rbind, arrow_list)
    
    #-- 3) 可視化 --
    # 累積表示モードの場合
    ${timeDisplayCode}
    
    # 個別時点表示を行うかどうか判定
    if (time_display_mode == "cumulative") {
      # 累積表示の場合は追加のプロットは行わない
      dev.off()
    } else {
      # 時点ごとの表示（連続する2時点モード）
      for(t in seq_len(n_times-1)) {
        # プロット領域設定（軸や目盛りは非表示）
        xlim <- range(df_points$x)
        ylim <- range(df_points$y)
        
        plot(NULL, xlim=xlim, ylim=ylim,
             main=paste("Optimal Transport: Time", t, "→", t+1),
             xlab="", ylab="", axes=FALSE)
        
        # 時点 t のデータ
        points_t <- df_points[df_points$time==t, ]
        # 時点 t+1 のデータ
        points_t1 <- df_points[df_points$time==t+1, ]
        
        # 二つの時点のクラスタ色を設定（時点ごとに色相を変える）
        n_clusters_t <- length(unique(points_t$cluster))
        n_clusters_t1 <- length(unique(points_t1$cluster))
        cluster_colors_t <- rainbow(n_clusters_t, alpha=0.7)
        cluster_colors_t1 <- rainbow(n_clusters_t1, alpha=0.4)
        
        # クラスタ点群モードではより詳細な表示
        if ("${params.mode}" == "points") {
          # クラスタごとにコンベックスハルを描画（塗りつぶし）
          for(cl_idx in 1:n_clusters_t) {
            cl_id <- unique(points_t$cluster)[cl_idx]
            cl_points <- points_t[points_t$cluster==cl_id, ]
            if(nrow(cl_points) >= 3) {  # 3点以上必要
              hull_idx <- chull(cl_points$x, cl_points$y)
              hull_points <- cl_points[hull_idx, ]
              polygon(hull_points$x, hull_points$y, 
                     col=adjustcolor(cluster_colors_t[cl_idx], alpha.f=0.2),
                     border=NA)
            }
          }
          
          for(cl_idx in 1:n_clusters_t1) {
            cl_id <- unique(points_t1$cluster)[cl_idx]
            cl_points <- points_t1[points_t1$cluster==cl_id, ]
            if(nrow(cl_points) >= 3) {
              hull_idx <- chull(cl_points$x, cl_points$y)
              hull_points <- cl_points[hull_idx, ]
              polygon(hull_points$x, hull_points$y, 
                     col=adjustcolor(cluster_colors_t1[cl_idx], alpha.f=0.1),
                     border=NA)
            }
          }
        }
        
        # 時点 t のクラスタをプロット
        for(cl_idx in 1:n_clusters_t) {
          cl_id <- unique(points_t$cluster)[cl_idx]
          cl_points <- points_t[points_t$cluster==cl_id, ]
          points(cl_points$x, cl_points$y, pch=19, col=cluster_colors_t[cl_idx], cex=0.7)
        }
        
        # 時点 t+1 のクラスタをプロット
        for(cl_idx in 1:n_clusters_t1) {
          cl_id <- unique(points_t1$cluster)[cl_idx]
          cl_points <- points_t1[points_t1$cluster==cl_id, ]
          points(cl_points$x, cl_points$y, pch=17, col=cluster_colors_t1[cl_idx], cex=0.7)
        }
        
        # クラスタ重心
        centroids_t <- df_centroids[df_centroids$time==t, ]
        centroids_t1 <- df_centroids[df_centroids$time==t+1, ]
        points(centroids_t$x, centroids_t$y, pch=8, cex=1.5, lwd=2, col="darkred")
        points(centroids_t1$x, centroids_t1$y, pch=8, cex=1.5, lwd=2, col="darkblue")
        
        # 輸送矢印を強調表示
        arrows_t <- df_arrows[df_arrows$time==t, ]
        arrows(
          arrows_t$x, arrows_t$y, 
          arrows_t$xend, arrows_t$yend,
          length=0.1, col="black",
          lwd=1 + 5 * arrows_t$mass / max(arrows_t$mass)
        )
        
        # 輸送量テキスト表示（太さだけでなく数値も）
        if (nrow(arrows_t) <= 10) {  # 矢印が少ない場合のみ表示
          for(i in 1:nrow(arrows_t)) {
            text((arrows_t$x[i] + arrows_t$xend[i])/2, 
                 (arrows_t$y[i] + arrows_t$yend[i])/2,
                 round(arrows_t$mass[i], 2),
                 cex=0.7, col="darkgreen")
          }
        }
        
        # 凡例を追加
        legend("topright", 
            legend=c(paste("Time", t, "clusters"), paste("Time", t+1, "clusters"), "Transport plan"),
            col=c("darkred", "darkblue", "black"), 
            pch=c(19, 17, NA), 
            lty=c(NA, NA, 1),
            lwd=c(NA, NA, 2),
            bg="white", cex=0.8)
        
        # 密度マップ関連コード
        ${densityCode}
        
        # 一時停止して次のプロットのために画面をクリア
        Sys.sleep(0.5)
        if(t < n_times-1) {
          dev.hold()
          dev.flush()
        }
      }
    }
  `;
};

// 必要なヘルパー関数
const generateSetupCode = () => {
  return `
    # WebRでは一部のパッケージが利用できない可能性があるため、
    # 必要な機能を実装する最小限のコードを使用します
    
    # シルエット分析のための関数（clusterパッケージがない場合用）
    simple_silhouette <- function(data, cluster) {
      # 距離行列を計算
      dist_matrix <- as.matrix(dist(data))
      n <- nrow(data)
      
      # 各点のシルエット係数を計算
      sil_values <- numeric(n)
      
      for (i in 1:n) {
        # 同じクラスタ内の平均距離 (a)
        a_i <- mean(dist_matrix[i, cluster == cluster[i]])
        if (is.na(a_i)) a_i <- 0
        
        # 他のクラスタとの最小平均距離 (b)
        b_i <- Inf
        for (cl in unique(cluster)) {
          if (cl != cluster[i]) {
            b_cl <- mean(dist_matrix[i, cluster == cl])
            b_i <- min(b_i, b_cl)
          }
        }
        
        # シルエット係数
        if (length(unique(cluster)) > 1) {
          sil_values[i] <- (b_i - a_i) / max(a_i, b_i)
        } else {
          sil_values[i] <- 0
        }
      }
      
      # 平均シルエット幅を返す
      mean(sil_values)
    }
    
    # シンプルな最適輸送計算関数（transportパッケージがない場合用）
    simple_transport <- function(a, b, costm) {
      # a, bは重み、costmはコスト行列
      # 単純な貪欲法で近似解を計算
      result <- list(from = integer(0), to = integer(0), mass = numeric(0))
      a_remaining <- a
      b_remaining <- b
      
      while (sum(a_remaining) > 1e-10 && sum(b_remaining) > 1e-10) {
        # 最小コストの位置を見つける
        min_idx <- which.min(costm)
        i <- (min_idx - 1) %% length(a) + 1
        j <- (min_idx - 1) %/% length(a) + 1
        
        # 移動可能な質量
        flow <- min(a_remaining[i], b_remaining[j])
        
        if (flow > 1e-10) {
          result$from <- c(result$from, i)
          result$to <- c(result$to, j)
          result$mass <- c(result$mass, flow)
          
          # 残りの質量を更新
          a_remaining[i] <- a_remaining[i] - flow
          b_remaining[j] <- b_remaining[j] - flow
        }
        
        # このセルを使用済みとしてコストを大きくする
        costm[min_idx] <- Inf
      }
      
      return(result)
    }
  `;
};

export { generateClusteringScript, generateSetupCode }; 