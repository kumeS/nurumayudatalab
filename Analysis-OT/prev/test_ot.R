# Minimal Viable Product: Optimal Transport Visualization
# Streamlined version using R packages for efficiency

# Install and load required packages
if (!require("cluster")) install.packages("cluster")
if (!require("transport")) install.packages("transport")
if (!require("MASS")) install.packages("MASS")

library(cluster)
library(transport)
library(MASS)

set.seed(42)

# Core parameters
n_points <- 50
n_clusters <- 3
n_dimensions <- 5  # Multi-dimensional data
pca_dims <- 2      # Dimensions for visualization after PCA

# Function to generate multi-dimensional clustered data
generate_multidim_clusters <- function(n, k, dims, cluster_centers = NULL) {
  if (is.null(cluster_centers)) {
    # Generate random cluster centers
    cluster_centers <- matrix(rnorm(k * dims, sd = 2), nrow = k, ncol = dims)
  }
  
  data <- NULL
  cluster_labels <- NULL
  
  for (i in 1:k) {
    n_cluster <- round(n / k)
    # Generate cluster data with some variation
    cluster_data <- mvrnorm(n_cluster, 
                           mu = cluster_centers[i, ], 
                           Sigma = diag(runif(dims, 0.3, 0.8)))
    
    data <- rbind(data, cluster_data)
    cluster_labels <- c(cluster_labels, rep(i, n_cluster))
  }
  
  return(list(data = data, labels = cluster_labels, centers = cluster_centers))
}

# Generate two datasets for optimal transport
cat("Generating multi-dimensional datasets...\n")

# Dataset 1: Source
source_centers <- matrix(rnorm(n_clusters * n_dimensions, sd = 1.5), 
                        nrow = n_clusters, ncol = n_dimensions)
source_result <- generate_multidim_clusters(n_points, n_clusters, n_dimensions, source_centers)

# Dataset 2: Target (shifted version)
target_centers <- source_centers + matrix(rnorm(n_clusters * n_dimensions, mean = 1, sd = 0.5), 
                                         nrow = n_clusters, ncol = n_dimensions)
target_result <- generate_multidim_clusters(n_points, n_clusters, n_dimensions, target_centers)

# Apply PCA for dimensionality reduction and visualization
apply_pca <- function(data, n_components = 2) {
  pca_result <- prcomp(data, center = TRUE, scale. = TRUE)
  pca_data <- pca_result$x[, 1:n_components]
  explained_var <- summary(pca_result)$importance[2, 1:n_components]
  
  return(list(data = pca_data, 
              explained_var = explained_var,
              rotation = pca_result$rotation))
}

# Apply PCA to both datasets
cat("Applying PCA for visualization...\n")
source_pca <- apply_pca(source_result$data, pca_dims)
target_pca <- apply_pca(target_result$data, pca_dims)

# Calculate optimal transport using transport package
cat("Computing optimal transport...\n")

# Method 1: Point-to-point transport (Wasserstein)
# Create weight vectors
source_weights <- rep(1/nrow(source_pca$data), nrow(source_pca$data))
target_weights <- rep(1/nrow(target_pca$data), nrow(target_pca$data))

# Create wpp objects (weighted point patterns)
source_wpp <- wpp(source_pca$data, source_weights)
target_wpp <- wpp(target_pca$data, target_weights)

# Compute optimal transport plan
ot_plan <- transport(source_wpp, target_wpp)
transport_cost <- wasserstein(source_wpp, target_wpp)

cat("Transport cost (Wasserstein-2):", round(transport_cost, 4), "\n")

# Method 2: Cluster-to-cluster transport
compute_cluster_transport <- function(source_data, source_labels, target_data, target_labels) {
  # Calculate cluster centroids
  source_centroids <- aggregate(source_data, by = list(source_labels), FUN = mean)[, -1]
  target_centroids <- aggregate(target_data, by = list(target_labels), FUN = mean)[, -1]
  
  # Calculate cluster masses (proportions)
  source_masses <- table(source_labels) / length(source_labels)
  target_masses <- table(target_labels) / length(target_labels)
  
  # Create wpp objects for clusters
  source_cluster_wpp <- wpp(as.matrix(source_centroids), as.numeric(source_masses))
  target_cluster_wpp <- wpp(as.matrix(target_centroids), as.numeric(target_masses))
  
  # Compute cluster transport
  cluster_transport <- transport(source_cluster_wpp, target_cluster_wpp)
  cluster_cost <- wasserstein(source_cluster_wpp, target_cluster_wpp)
  
  return(list(plan = cluster_transport, 
              cost = cluster_cost,
              source_centroids = source_centroids,
              target_centroids = target_centroids,
              source_masses = source_masses,
              target_masses = target_masses))
}

cluster_ot <- compute_cluster_transport(source_pca$data, source_result$labels,
                                       target_pca$data, target_result$labels)

cat("Cluster transport cost:", round(cluster_ot$cost, 4), "\n")

# Visualization
pdf("ot_mvp_results.pdf", width = 12, height = 8)

# Layout for multiple plots
par(mfrow = c(2, 3))

# Plot 1: Source data with clusters
plot(source_pca$data, 
     col = rainbow(n_clusters, alpha = 0.7)[source_result$labels], 
     pch = 19, cex = 1.2,
     main = "Source Data (PCA)",
     xlab = paste0("PC1 (", round(source_pca$explained_var[1] * 100, 1), "%)"),
     ylab = paste0("PC2 (", round(source_pca$explained_var[2] * 100, 1), "%)"))

# Add cluster centers
points(cluster_ot$source_centroids, 
       col = rainbow(n_clusters), 
       pch = 15, cex = 2)

legend("topright", 
       legend = paste("Cluster", 1:n_clusters),
       col = rainbow(n_clusters),
       pch = 19,
       cex = 0.8)

# Plot 2: Target data with clusters
plot(target_pca$data, 
     col = rainbow(n_clusters, alpha = 0.7)[target_result$labels], 
     pch = 17, cex = 1.2,
     main = "Target Data (PCA)",
     xlab = paste0("PC1 (", round(target_pca$explained_var[1] * 100, 1), "%)"),
     ylab = paste0("PC2 (", round(target_pca$explained_var[2] * 100, 1), "%)"))

# Add cluster centers
points(cluster_ot$target_centroids, 
       col = rainbow(n_clusters), 
       pch = 15, cex = 2)

legend("topright", 
       legend = paste("Cluster", 1:n_clusters),
       col = rainbow(n_clusters),
       pch = 17,
       cex = 0.8)

# Plot 3: Point-to-point optimal transport
plot(source_pca$data, 
     col = "blue", 
     pch = 19, cex = 0.8,
     main = "Point-to-Point Optimal Transport",
     xlab = "PC1", ylab = "PC2",
     xlim = range(c(source_pca$data[,1], target_pca$data[,1])),
     ylim = range(c(source_pca$data[,2], target_pca$data[,2])))

points(target_pca$data, col = "red", pch = 17, cex = 0.8)

# Draw transport arrows (sample to avoid overcrowding)
if(nrow(ot_plan) > 0) {
  sample_indices <- sample(nrow(ot_plan), min(20, nrow(ot_plan)))
  
  for (i in sample_indices) {
    if (ot_plan[i, 3] > 1e-6) {  # Only draw significant transports
      arrows(source_pca$data[ot_plan[i, 1], 1],
             source_pca$data[ot_plan[i, 1], 2],
             target_pca$data[ot_plan[i, 2], 1],
             target_pca$data[ot_plan[i, 2], 2],
             length = 0.05, col = "gray", lwd = 0.5)
    }
  }
}

legend("topright", 
       legend = c("Source", "Target", "Transport"),
       col = c("blue", "red", "gray"),
       pch = c(19, 17, NA),
       lty = c(NA, NA, 1),
       cex = 0.8)

text(min(source_pca$data[,1]), max(target_pca$data[,2]), 
     paste("Cost:", round(transport_cost, 3)), 
     cex = 0.9, adj = 0)

# Plot 4: Cluster-to-cluster transport
plot(cluster_ot$source_centroids, 
     col = rainbow(n_clusters), 
     pch = 15, cex = 3,
     main = "Cluster-to-Cluster Transport",
     xlab = "PC1", ylab = "PC2",
     xlim = range(c(cluster_ot$source_centroids[,1], cluster_ot$target_centroids[,1])),
     ylim = range(c(cluster_ot$source_centroids[,2], cluster_ot$target_centroids[,2])))

points(cluster_ot$target_centroids, 
       col = rainbow(n_clusters), 
       pch = 17, cex = 3)

# Draw cluster transport arrows
if(nrow(cluster_ot$plan) > 0) {
  for (i in 1:nrow(cluster_ot$plan)) {
    if (cluster_ot$plan[i, 3] > 1e-6) {
      arrows(cluster_ot$source_centroids[cluster_ot$plan[i, 1], 1],
             cluster_ot$source_centroids[cluster_ot$plan[i, 1], 2],
             cluster_ot$target_centroids[cluster_ot$plan[i, 2], 1],
             cluster_ot$target_centroids[cluster_ot$plan[i, 2], 2],
             length = 0.1, 
             col = "black", 
             lwd = cluster_ot$plan[i, 3] * 10)  # Width proportional to mass
    }
  }
}

# Add mass labels
for (i in 1:nrow(cluster_ot$source_centroids)) {
  text(cluster_ot$source_centroids[i, 1], cluster_ot$source_centroids[i, 2], 
       round(cluster_ot$source_masses[i], 2), 
       pos = 1, cex = 0.7, col = "white", font = 2)
}

legend("topright", 
       legend = c("Source Centers", "Target Centers"),
       col = "black",
       pch = c(15, 17),
       cex = 0.8)

text(min(cluster_ot$source_centroids[,1]), max(cluster_ot$target_centroids[,2]), 
     paste("Cost:", round(cluster_ot$cost, 3)), 
     cex = 0.9, adj = 0)

# Plot 5: Cost comparison
costs <- c(transport_cost, cluster_ot$cost)
names(costs) <- c("Point-to-Point", "Cluster-to-Cluster")

barplot(costs, 
        main = "Transport Cost Comparison",
        ylab = "Wasserstein-2 Distance",
        col = c("lightblue", "lightcoral"),
        border = "black")

text(1:2, costs + max(costs) * 0.02, round(costs, 3), 
     pos = 3, cex = 0.9, font = 2)

# Plot 6: Explained variance by PCA
explained_var_data <- data.frame(
  PC = factor(1:pca_dims),
  Variance = c(source_pca$explained_var, target_pca$explained_var),
  Dataset = rep(c("Source", "Target"), each = pca_dims)
)

# Simple grouped barplot
barplot(matrix(explained_var_data$Variance, nrow = pca_dims), 
        beside = TRUE,
        names.arg = c("Source", "Target"),
        main = "PCA Explained Variance",
        ylab = "Proportion of Variance",
        col = c("darkblue", "darkred"),
        legend.text = paste("PC", 1:pca_dims))

dev.off()

# Print summary
cat("\n=== MVP Optimal Transport Results ===\n")
cat("Data dimensions:", n_dimensions, "→", pca_dims, "(PCA)\n")
cat("Points per dataset:", n_points, "\n")
cat("Number of clusters:", n_clusters, "\n")
cat("\nTransport Costs:\n")
cat("  Point-to-point:", round(transport_cost, 4), "\n")
cat("  Cluster-to-cluster:", round(cluster_ot$cost, 4), "\n")
cat("\nPCA Explained Variance (Source):\n")
for (i in 1:pca_dims) {
  cat("  PC", i, ":", round(source_pca$explained_var[i] * 100, 1), "%\n")
}
cat("\nCluster Masses:\n")
for (i in 1:n_clusters) {
  cat("  Cluster", i, ":", round(cluster_ot$source_masses[i], 3), "\n")
}
cat("\nResults saved to: ot_mvp_results.pdf\n") 