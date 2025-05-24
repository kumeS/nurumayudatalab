# Advanced MVP: Flexible Optimal Transport Visualization
# Enhanced version with parameter customization and data loading capabilities

# Install and load required packages
required_packages <- c("cluster", "transport", "MASS", "readr", "dplyr")
for (pkg in required_packages) {
  if (!require(pkg, character.only = TRUE)) {
    install.packages(pkg)
    library(pkg, character.only = TRUE)
  }
}

# Configuration parameters (easily adjustable)
CONFIG <- list(
  # Data generation parameters
  n_points = 100,           # Number of points per dataset
  n_clusters = 4,           # Number of clusters
  n_dimensions = 8,         # Original data dimensions
  pca_dims = 2,             # PCA visualization dimensions
  
  # Cluster parameters
  cluster_separation = 2.0,  # Distance between cluster centers
  cluster_variance = 0.5,    # Within-cluster variance
  
  # Transport parameters
  transport_sample = 30,     # Number of transport arrows to display
  
  # Visualization parameters
  output_file = "ot_advanced_results.pdf",
  plot_width = 14,
  plot_height = 10,
  
  # Colors
  source_color = "blue",
  target_color = "red",
  transport_color = "gray"
)

cat("=== Advanced MVP Optimal Transport ===\n")
cat("Configuration:\n")
for (param in names(CONFIG)) {
  cat("  ", param, ":", CONFIG[[param]], "\n")
}

# Utility functions
generate_synthetic_data <- function(config) {
  cat("\nGenerating synthetic multi-dimensional data...\n")
  
  # Generate cluster centers
  source_centers <- matrix(rnorm(config$n_clusters * config$n_dimensions, sd = config$cluster_separation), 
                          nrow = config$n_clusters, ncol = config$n_dimensions)
  
  # Generate source dataset
  source_data <- NULL
  source_labels <- NULL
  
  for (i in 1:config$n_clusters) {
    n_cluster <- round(config$n_points / config$n_clusters)
    cluster_data <- mvrnorm(n_cluster, 
                           mu = source_centers[i, ], 
                           Sigma = diag(runif(config$n_dimensions, 
                                             config$cluster_variance * 0.5, 
                                             config$cluster_variance * 1.5)))
    
    source_data <- rbind(source_data, cluster_data)
    source_labels <- c(source_labels, rep(i, n_cluster))
  }
  
  # Generate target dataset (evolved version)
  target_centers <- source_centers + matrix(rnorm(config$n_clusters * config$n_dimensions, 
                                                 mean = 0.5, sd = 0.3), 
                                           nrow = config$n_clusters, ncol = config$n_dimensions)
  
  target_data <- NULL
  target_labels <- NULL
  
  for (i in 1:config$n_clusters) {
    n_cluster <- round(config$n_points / config$n_clusters)
    cluster_data <- mvrnorm(n_cluster, 
                           mu = target_centers[i, ], 
                           Sigma = diag(runif(config$n_dimensions, 
                                             config$cluster_variance * 0.7, 
                                             config$cluster_variance * 1.3)))
    
    target_data <- rbind(target_data, cluster_data)
    target_labels <- c(target_labels, rep(i, n_cluster))
  }
  
  return(list(
    source = list(data = source_data, labels = source_labels, centers = source_centers),
    target = list(data = target_data, labels = target_labels, centers = target_centers)
  ))
}

# Load data from file (if available)
load_data_from_file <- function(source_file = NULL, target_file = NULL) {
  if (!is.null(source_file) && file.exists(source_file)) {
    cat("Loading source data from:", source_file, "\n")
    source_data <- as.matrix(read_csv(source_file, show_col_types = FALSE))
    
    if (!is.null(target_file) && file.exists(target_file)) {
      cat("Loading target data from:", target_file, "\n")
      target_data <- as.matrix(read_csv(target_file, show_col_types = FALSE))
    } else {
      cat("No target file specified, generating synthetic target data\n")
      target_data <- source_data + matrix(rnorm(nrow(source_data) * ncol(source_data), 
                                               mean = 0.5, sd = 0.3))
    }
    
    # Simple clustering for loaded data
    source_kmeans <- kmeans(source_data, centers = CONFIG$n_clusters, nstart = 10)
    target_kmeans <- kmeans(target_data, centers = CONFIG$n_clusters, nstart = 10)
    
    return(list(
      source = list(data = source_data, labels = source_kmeans$cluster, centers = source_kmeans$centers),
      target = list(data = target_data, labels = target_kmeans$cluster, centers = target_kmeans$centers)
    ))
  }
  return(NULL)
}

# Enhanced PCA with analysis
enhanced_pca <- function(data, n_components = 2) {
  pca_result <- prcomp(data, center = TRUE, scale. = TRUE)
  pca_data <- pca_result$x[, 1:n_components]
  
  # Calculate explained variance
  explained_var <- summary(pca_result)$importance[2, 1:n_components]
  cumulative_var <- cumsum(explained_var)
  
  return(list(
    data = pca_data,
    explained_var = explained_var,
    cumulative_var = cumulative_var,
    rotation = pca_result$rotation,
    center = pca_result$center,
    scale = pca_result$scale
  ))
}

# Optimal transport computation with multiple methods
compute_optimal_transport <- function(source_pca, target_pca, source_labels, target_labels) {
  cat("Computing optimal transport plans...\n")
  
  # Method 1: Point-to-point transport
  source_weights <- rep(1/nrow(source_pca$data), nrow(source_pca$data))
  target_weights <- rep(1/nrow(target_pca$data), nrow(target_pca$data))
  
  source_wpp <- wpp(source_pca$data, source_weights)
  target_wpp <- wpp(target_pca$data, target_weights)
  
  point_transport <- transport(source_wpp, target_wpp)
  point_cost <- wasserstein(source_wpp, target_wpp)
  
  # Method 2: Cluster-to-cluster transport
  source_centroids <- aggregate(source_pca$data, by = list(source_labels), FUN = mean)[, -1]
  target_centroids <- aggregate(target_pca$data, by = list(target_labels), FUN = mean)[, -1]
  
  source_masses <- table(source_labels) / length(source_labels)
  target_masses <- table(target_labels) / length(target_labels)
  
  source_cluster_wpp <- wpp(as.matrix(source_centroids), as.numeric(source_masses))
  target_cluster_wpp <- wpp(as.matrix(target_centroids), as.numeric(target_masses))
  
  cluster_transport <- transport(source_cluster_wpp, target_cluster_wpp)
  cluster_cost <- wasserstein(source_cluster_wpp, target_cluster_wpp)
  
  return(list(
    point = list(plan = point_transport, cost = point_cost),
    cluster = list(plan = cluster_transport, cost = cluster_cost,
                  source_centroids = source_centroids, target_centroids = target_centroids,
                  source_masses = source_masses, target_masses = target_masses)
  ))
}

# Enhanced visualization
create_enhanced_visualization <- function(datasets, pca_results, transport_results, config) {
  cat("Creating enhanced visualization...\n")
  
  pdf(config$output_file, width = config$plot_width, height = config$plot_height)
  
  # Set up layout: 3x3 grid
  par(mfrow = c(3, 3), mar = c(4, 4, 3, 2))
  
  # Plot 1: Source data overview
  plot(pca_results$source$data, 
       col = rainbow(config$n_clusters, alpha = 0.7)[datasets$source$labels], 
       pch = 19, cex = 1.0,
       main = "Source Dataset (PCA)",
       xlab = paste0("PC1 (", round(pca_results$source$explained_var[1] * 100, 1), "%)"),
       ylab = paste0("PC2 (", round(pca_results$source$explained_var[2] * 100, 1), "%)"))
  
  points(transport_results$cluster$source_centroids, 
         col = rainbow(config$n_clusters), pch = 15, cex = 2)
  
  # Plot 2: Target data overview
  plot(pca_results$target$data, 
       col = rainbow(config$n_clusters, alpha = 0.7)[datasets$target$labels], 
       pch = 17, cex = 1.0,
       main = "Target Dataset (PCA)",
       xlab = paste0("PC1 (", round(pca_results$target$explained_var[1] * 100, 1), "%)"),
       ylab = paste0("PC2 (", round(pca_results$target$explained_var[2] * 100, 1), "%)"))
  
  points(transport_results$cluster$target_centroids, 
         col = rainbow(config$n_clusters), pch = 15, cex = 2)
  
  # Plot 3: Combined view with point transport
  xlim_combined <- range(c(pca_results$source$data[,1], pca_results$target$data[,1]))
  ylim_combined <- range(c(pca_results$source$data[,2], pca_results$target$data[,2]))
  
  plot(pca_results$source$data, 
       col = config$source_color, pch = 19, cex = 0.8,
       main = "Point-to-Point Transport",
       xlab = "PC1", ylab = "PC2",
       xlim = xlim_combined, ylim = ylim_combined)
  
  points(pca_results$target$data, col = config$target_color, pch = 17, cex = 0.8)
  
  # Sample transport arrows
  if (nrow(transport_results$point$plan) > 0) {
    n_sample <- min(config$transport_sample, nrow(transport_results$point$plan))
    sample_indices <- sample(nrow(transport_results$point$plan), n_sample)
    
    for (i in sample_indices) {
      if (transport_results$point$plan[i, 3] > 1e-6) {
        arrows(pca_results$source$data[transport_results$point$plan[i, 1], 1],
               pca_results$source$data[transport_results$point$plan[i, 1], 2],
               pca_results$target$data[transport_results$point$plan[i, 2], 1],
               pca_results$target$data[transport_results$point$plan[i, 2], 2],
               length = 0.05, col = config$transport_color, lwd = 0.5)
      }
    }
  }
  
  text(xlim_combined[1], ylim_combined[2], 
       paste("Cost:", round(transport_results$point$cost, 3)), 
       cex = 0.9, adj = 0)
  
  # Plot 4: Cluster transport
  plot(transport_results$cluster$source_centroids, 
       col = rainbow(config$n_clusters), pch = 15, cex = 3,
       main = "Cluster-to-Cluster Transport",
       xlab = "PC1", ylab = "PC2",
       xlim = range(c(transport_results$cluster$source_centroids[,1], 
                     transport_results$cluster$target_centroids[,1])),
       ylim = range(c(transport_results$cluster$source_centroids[,2], 
                     transport_results$cluster$target_centroids[,2])))
  
  points(transport_results$cluster$target_centroids, 
         col = rainbow(config$n_clusters), pch = 17, cex = 3)
  
  # Cluster transport arrows
  if (nrow(transport_results$cluster$plan) > 0) {
    for (i in 1:nrow(transport_results$cluster$plan)) {
      if (transport_results$cluster$plan[i, 3] > 1e-6) {
        arrows(transport_results$cluster$source_centroids[transport_results$cluster$plan[i, 1], 1],
               transport_results$cluster$source_centroids[transport_results$cluster$plan[i, 1], 2],
               transport_results$cluster$target_centroids[transport_results$cluster$plan[i, 2], 1],
               transport_results$cluster$target_centroids[transport_results$cluster$plan[i, 2], 2],
               length = 0.1, col = "black", 
               lwd = transport_results$cluster$plan[i, 3] * 8)
      }
    }
  }
  
  # Plot 5: Cost comparison
  costs <- c(transport_results$point$cost, transport_results$cluster$cost)
  names(costs) <- c("Point-to-Point", "Cluster-to-Cluster")
  
  barplot(costs, 
          main = "Transport Cost Comparison",
          ylab = "Wasserstein Distance",
          col = c("lightblue", "lightcoral"),
          border = "black")
  text(1:2, costs + max(costs) * 0.02, round(costs, 3), 
       pos = 3, cex = 0.9, font = 2)
  
  # Plot 6: PCA explained variance
  var_data <- rbind(pca_results$source$explained_var, pca_results$target$explained_var)
  barplot(var_data, beside = TRUE,
          names.arg = paste("PC", 1:config$pca_dims),
          main = "PCA Explained Variance",
          ylab = "Proportion of Variance",
          col = c("darkblue", "darkred"),
          legend.text = c("Source", "Target"))
  
  # Plot 7: Cumulative variance
  plot(1:config$pca_dims, pca_results$source$cumulative_var, 
       type = "b", col = "blue", pch = 19,
       main = "Cumulative Explained Variance",
       xlab = "Principal Component", ylab = "Cumulative Variance",
       ylim = c(0, 1))
  lines(1:config$pca_dims, pca_results$target$cumulative_var, 
        type = "b", col = "red", pch = 17)
  legend("bottomright", legend = c("Source", "Target"), 
         col = c("blue", "red"), pch = c(19, 17))
  
  # Plot 8: Transport plan matrix (if small enough)
  if (nrow(transport_results$cluster$plan) <= 10) {
    transport_matrix <- matrix(0, nrow = config$n_clusters, ncol = config$n_clusters)
    for (i in 1:nrow(transport_results$cluster$plan)) {
      transport_matrix[transport_results$cluster$plan[i, 1], 
                      transport_results$cluster$plan[i, 2]] <- transport_results$cluster$plan[i, 3]
    }
    
    image(1:config$n_clusters, 1:config$n_clusters, transport_matrix,
          main = "Cluster Transport Matrix",
          xlab = "Source Cluster", ylab = "Target Cluster",
          col = heat.colors(20))
  } else {
    plot.new()
    text(0.5, 0.5, "Transport matrix\ntoo large to display", cex = 1.5, adj = 0.5)
  }
  
  # Plot 9: Summary statistics
  plot.new()
  text(0.1, 0.9, "Summary Statistics", cex = 1.5, font = 2, adj = 0)
  text(0.1, 0.8, paste("Dimensions:", config$n_dimensions, "→", config$pca_dims), adj = 0)
  text(0.1, 0.7, paste("Points:", config$n_points), adj = 0)
  text(0.1, 0.6, paste("Clusters:", config$n_clusters), adj = 0)
  text(0.1, 0.5, paste("Point Transport Cost:", round(transport_results$point$cost, 4)), adj = 0)
  text(0.1, 0.4, paste("Cluster Transport Cost:", round(transport_results$cluster$cost, 4)), adj = 0)
  text(0.1, 0.3, paste("Total Variance Explained:", 
                       round(pca_results$source$cumulative_var[config$pca_dims] * 100, 1), "%"), adj = 0)
  
  dev.off()
}

# Main execution
set.seed(42)

# Try to load data from files first, otherwise generate synthetic data
datasets <- load_data_from_file()  # Can specify file paths here
if (is.null(datasets)) {
  datasets <- generate_synthetic_data(CONFIG)
}

# Apply PCA
pca_results <- list(
  source = enhanced_pca(datasets$source$data, CONFIG$pca_dims),
  target = enhanced_pca(datasets$target$data, CONFIG$pca_dims)
)

# Compute optimal transport
transport_results <- compute_optimal_transport(pca_results$source, pca_results$target,
                                             datasets$source$labels, datasets$target$labels)

# Create visualization
create_enhanced_visualization(datasets, pca_results, transport_results, CONFIG)

# Print detailed results
cat("\n=== Advanced MVP Results ===\n")
cat("Data Configuration:\n")
cat("  Original dimensions:", CONFIG$n_dimensions, "\n")
cat("  PCA dimensions:", CONFIG$pca_dims, "\n")
cat("  Points per dataset:", CONFIG$n_points, "\n")
cat("  Number of clusters:", CONFIG$n_clusters, "\n")

cat("\nPCA Analysis:\n")
cat("  Source data variance explained:\n")
for (i in 1:CONFIG$pca_dims) {
  cat("    PC", i, ":", round(pca_results$source$explained_var[i] * 100, 1), "%\n")
}
cat("  Cumulative variance:", round(pca_results$source$cumulative_var[CONFIG$pca_dims] * 100, 1), "%\n")

cat("\nOptimal Transport Results:\n")
cat("  Point-to-point cost:", round(transport_results$point$cost, 4), "\n")
cat("  Cluster-to-cluster cost:", round(transport_results$cluster$cost, 4), "\n")
cat("  Transport connections:", nrow(transport_results$point$plan), "\n")

cat("\nCluster Analysis:\n")
for (i in 1:CONFIG$n_clusters) {
  cat("  Cluster", i, "mass:", round(transport_results$cluster$source_masses[i], 3), "\n")
}

cat("\nResults saved to:", CONFIG$output_file, "\n")
cat("Advanced MVP Optimal Transport analysis completed!\n") 