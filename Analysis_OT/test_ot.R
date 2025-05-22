# Test script for Optimal Transport visualization
# This script demonstrates the basic functionality of the OT visualization system

# Set CRAN mirror
options(repos = c(CRAN = "https://cloud.r-project.org"))

# Note: In a WebR environment, we avoid using external packages that need compilation
# Instead, we implement simplified versions of required functions

# Simple implementation of silhouette coefficient for clustering evaluation
# This is a simplified version that doesn't require the cluster package
simple_silhouette <- function(data, clusters) {
  # Calculate distance matrix
  dist_matrix <- as.matrix(dist(data))
  
  # Initialize silhouette values
  n <- nrow(data)
  sil_values <- numeric(n)
  
  # Calculate silhouette for each point
  for (i in 1:n) {
    # Get cluster of current point
    current_cluster <- clusters[i]
    
    # Calculate average distance to points in same cluster (a)
    same_cluster_indices <- which(clusters == current_cluster)
    same_cluster_indices <- same_cluster_indices[same_cluster_indices != i]
    
    if (length(same_cluster_indices) > 0) {
      a_i <- mean(dist_matrix[i, same_cluster_indices])
    } else {
      a_i <- 0
    }
    
    # Calculate average distance to points in nearest different cluster (b)
    other_clusters <- unique(clusters[clusters != current_cluster])
    b_i <- Inf
    
    for (cluster in other_clusters) {
      cluster_indices <- which(clusters == cluster)
      avg_dist <- mean(dist_matrix[i, cluster_indices])
      if (avg_dist < b_i) {
        b_i <- avg_dist
      }
    }
    
    # Calculate silhouette
    if (a_i < b_i && a_i > 0) {
      sil_values[i] <- 1 - a_i / b_i
    } else if (a_i > b_i) {
      sil_values[i] <- b_i / a_i - 1
    } else {
      sil_values[i] <- 0
    }
  }
  
  # Return mean silhouette value
  return(mean(sil_values))
}

# Set seed for reproducibility
set.seed(42)

# Parameters
n_points <- 100  # Number of points per time point
n_time_points <- 3  # Number of time points
max_clusters <- 5  # Maximum number of clusters

# Function to generate random clusters
generate_clusters <- function(n, time_shift) {
  # Create clusters with different centers that move over time
  centers <- matrix(c(
    -2 + time_shift, -2 + time_shift * 0.5,
    2 + time_shift * 0.8, 2 + time_shift,
    0 + time_shift * 1.2, 0 + time_shift * 0.7
  ), ncol = 2, byrow = TRUE)
  
  # Assign points to clusters with randomness
  cluster_sizes <- c(n * 0.4, n * 0.3, n * 0.3)
  
  points <- NULL
  for (i in 1:3) {
    cluster_points <- matrix(rnorm(cluster_sizes[i] * 2, sd = 0.5), ncol = 2)
    cluster_points[, 1] <- cluster_points[, 1] + centers[i, 1]
    cluster_points[, 2] <- cluster_points[, 2] + centers[i, 2]
    points <- rbind(points, cluster_points)
  }
  
  return(points)
}

# Generate data for each time point
time_points <- list()
for (t in 1:n_time_points) {
  time_shift <- (t - 1) * 0.5
  time_points[[t]] <- generate_clusters(n_points, time_shift)
}

# Determine optimal number of clusters for each time point
optimal_clusters <- list()
for (t in 1:n_time_points) {
  sil_width <- numeric(max_clusters - 1)
  
  for (k in 2:max_clusters) {
    km <- kmeans(time_points[[t]], centers = k, nstart = 10)
    
    # Use our simple silhouette implementation instead of the cluster package
    sil_width[k-1] <- simple_silhouette(time_points[[t]], km$cluster)
  }
  
  # Determine optimal k (add 1 because we start from k=2)
  optimal_k <- which.max(sil_width) + 1
  cat("Time point", t, "- Optimal number of clusters:", optimal_k, "\n")
  
  # Cluster the data with optimal k
  km <- kmeans(time_points[[t]], centers = optimal_k, nstart = 25)
  
  # Store clustering results
  optimal_clusters[[t]] <- list(
    points = time_points[[t]],
    centers = km$centers,
    cluster = km$cluster,
    size = km$size
  )
}

# Simple implementation of optimal transport using greedy algorithm
# This is a simplified version that doesn't require the transport package
simple_transport <- function(source_weights, target_weights, cost_matrix) {
  # Initialize variables
  remaining_source <- source_weights
  remaining_target <- target_weights
  
  # Create result data frame
  result <- data.frame(from = integer(), to = integer(), mass = numeric())
  
  # Continue until we've allocated all mass
  while(sum(remaining_source) > 1e-10) {
    # Find lowest cost cell among remaining sources and targets
    min_cost <- Inf
    min_i <- 0
    min_j <- 0
    
    for(i in 1:length(source_weights)) {
      if(remaining_source[i] <= 1e-10) next
      
      for(j in 1:length(target_weights)) {
        if(remaining_target[j] <= 1e-10) next
        
        if(cost_matrix[i,j] < min_cost) {
          min_cost <- cost_matrix[i,j]
          min_i <- i
          min_j <- j
        }
      }
    }
    
    # Determine how much mass to move
    mass_to_move <- min(remaining_source[min_i], remaining_target[min_j])
    
    # Update remaining mass
    remaining_source[min_i] <- remaining_source[min_i] - mass_to_move
    remaining_target[min_j] <- remaining_target[min_j] - mass_to_move
    
    # Add to result
    result <- rbind(result, data.frame(from = min_i, to = min_j, mass = mass_to_move))
  }
  
  return(result)
}

# Calculate OT plan between consecutive time points
ot_plans <- list()
for (t in 1:(n_time_points - 1)) {
  # Source: current time point centers with weights proportional to cluster sizes
  source_centers <- optimal_clusters[[t]]$centers
  source_weights <- optimal_clusters[[t]]$size / sum(optimal_clusters[[t]]$size)
  
  # Target: next time point centers with weights proportional to cluster sizes
  target_centers <- optimal_clusters[[t+1]]$centers
  target_weights <- optimal_clusters[[t+1]]$size / sum(optimal_clusters[[t+1]]$size)
  
  # Calculate cost matrix (Euclidean distances between centers)
  cost_matrix <- as.matrix(dist(rbind(source_centers, target_centers)))
  cost_matrix <- cost_matrix[1:nrow(source_centers), 
                            (nrow(source_centers)+1):(nrow(source_centers)+nrow(target_centers))]
  
  # Compute optimal transport plan using our simple implementation
  plan <- simple_transport(
    source_weights = source_weights,
    target_weights = target_weights,
    cost_matrix = cost_matrix
  )
  
  ot_plans[[t]] <- plan
  
  cat("OT Plan from time", t, "to time", t+1, ":\n")
  print(plan)
}

# Create PDF output for visualization
pdf("ot_test_results.pdf", width = 12, height = 6)

# Plot each time point with clusters
for (t in 1:n_time_points) {
  plot(optimal_clusters[[t]]$points, 
       col = optimal_clusters[[t]]$cluster, 
       pch = 19,
       main = paste("Time Point", t),
       xlab = "X", ylab = "Y",
       xlim = c(-3, 4), ylim = c(-3, 3))
  
  # Add cluster centers
  points(optimal_clusters[[t]]$centers, pch = 4, cex = 2, lwd = 2)
}

# Plot consecutive time points with transport plan
for (t in 1:(n_time_points - 1)) {
  # Set up plot area
  plot(rbind(optimal_clusters[[t]]$points, optimal_clusters[[t+1]]$points),
       type = "n", main = paste("Transport from Time", t, "to Time", t+1),
       xlab = "X", ylab = "Y",
       xlim = c(-3, 4), ylim = c(-3, 3))
  
  # Plot points from time t
  points(optimal_clusters[[t]]$points, 
         col = optimal_clusters[[t]]$cluster,
         pch = 19, cex = 0.8)
  
  # Plot points from time t+1
  points(optimal_clusters[[t+1]]$points, 
         col = optimal_clusters[[t+1]]$cluster,
         pch = 1, cex = 0.8)
  
  # Plot centers
  points(optimal_clusters[[t]]$centers, pch = 4, cex = 2, lwd = 2, col = "red")
  points(optimal_clusters[[t+1]]$centers, pch = 4, cex = 2, lwd = 2, col = "blue")
  
  # Draw transport arrows between centers
  for (i in 1:nrow(ot_plans[[t]])) {
    from_idx <- ot_plans[[t]]$from[i]
    to_idx <- ot_plans[[t]]$to[i]
    mass <- ot_plans[[t]]$mass[i]
    
    # Draw arrow with width proportional to mass
    arrows(
      optimal_clusters[[t]]$centers[from_idx, 1],
      optimal_clusters[[t]]$centers[from_idx, 2],
      optimal_clusters[[t+1]]$centers[to_idx, 1],
      optimal_clusters[[t+1]]$centers[to_idx, 2],
      lwd = mass * 5,  # Scale the line width by mass
      length = 0.1,
      col = "gray50"
    )
  }
  
  # Add legend
  legend("topright", 
         legend = c(paste("Time", t, "clusters"), paste("Time", t+1, "clusters"), "Transport plan"),
         pch = c(19, 1, NA),
         lty = c(NA, NA, 1),
         col = c("black", "black", "gray50"),
         cex = 0.8)
}

# Create density maps for each time point - using base R functions instead of MASS::kde2d
for (t in 1:n_time_points) {
  # Set up plot area
  plot(optimal_clusters[[t]]$points, 
       col = optimal_clusters[[t]]$cluster,
       pch = 19, cex = 0.7,
       main = paste("Density Map - Time Point", t),
       xlab = "X", ylab = "Y",
       xlim = c(-3, 4), ylim = c(-3, 3))
  
  # Simple density calculation using a grid approach
  x_range <- seq(-3, 4, length.out = 50)
  y_range <- seq(-3, 3, length.out = 50)
  density_grid <- matrix(0, nrow = length(x_range), ncol = length(y_range))
  
  points_x <- optimal_clusters[[t]]$points[, 1]
  points_y <- optimal_clusters[[t]]$points[, 2]
  h <- 0.5  # Bandwidth parameter
  
  # Calculate density at each grid point
  for (i in 1:length(x_range)) {
    for (j in 1:length(y_range)) {
      # Calculate distance from each point to this grid point
      distances <- sqrt((points_x - x_range[i])^2 + (points_y - y_range[j])^2)
      # Apply Gaussian kernel
      density_grid[i, j] <- sum(exp(-distances^2 / (2 * h^2))) / (length(points_x) * 2 * pi * h^2)
    }
  }
  
  # Add contour lines
  contour(x_range, y_range, density_grid, 
          add = TRUE, 
          col = "blue",
          nlevels = 10)
}

# Close PDF device
dev.off()

cat("\nVisualization complete. Results saved to ot_test_results.pdf\n") 