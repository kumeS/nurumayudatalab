# Test script for Continuous Optimal Transport visualization
# This script demonstrates continuous point-to-point optimal transport across multiple time points

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

# Function to generate multivariate normal elliptical clusters
generate_elliptical_cluster <- function(n, center_x, center_y, sigma_x, sigma_y, correlation = 0) {
  # Create covariance matrix for elliptical distribution
  cov_matrix <- matrix(c(sigma_x^2, correlation * sigma_x * sigma_y,
                        correlation * sigma_x * sigma_y, sigma_y^2), 
                      nrow = 2)
  
  # Generate points using Cholesky decomposition
  L <- chol(cov_matrix)
  z <- matrix(rnorm(n * 2), ncol = 2)
  points <- z %*% L
  
  # Translate to desired center
  points[, 1] <- points[, 1] + center_x
  points[, 2] <- points[, 2] + center_y
  
  return(points)
}

# Set seed for reproducibility
set.seed(42)

# Parameters
n_points <- 30  # Reduced for better trajectory visualization
n_time_points <- 4  # Increased to show continuous flow
max_clusters <- 4  # Maximum number of clusters

# Function to generate controlled elliptical clusters moving along x-axis
generate_controlled_elliptical_clusters <- function(n, time_step, total_time_steps) {
  # X-axis progression: t=1 -> x≈0, t=2 -> x≈1, t=3 -> x≈2, etc.
  base_x <- (time_step - 1)  # 0, 1, 2, 3...
  
  # Define cluster parameters for each time step
  clusters_config <- list(
    # Cluster 1: Main ellipse moving along x-axis
    list(
      center_x = base_x,
      center_y = 0,
      sigma_x = 0.6,  # Elliptical in x-direction
      sigma_y = 0.3,  # Narrower in y-direction
      correlation = 0.2,
      proportion = 0.5
    ),
    # Cluster 2: Secondary ellipse with slight y-offset
    list(
      center_x = base_x + 0.3,
      center_y = 1.5,
      sigma_x = 0.4,
      sigma_y = 0.5,
      correlation = -0.1,
      proportion = 0.3
    ),
    # Cluster 3: Third ellipse with negative y-offset
    list(
      center_x = base_x - 0.2,
      center_y = -1.2,
      sigma_x = 0.5,
      sigma_y = 0.4,
      correlation = 0.3,
      proportion = 0.2
    )
  )
  
  points <- NULL
  cluster_labels <- NULL
  
  for (i in 1:length(clusters_config)) {
    config <- clusters_config[[i]]
    n_cluster <- round(n * config$proportion)
    
    # Generate elliptical cluster
    cluster_points <- generate_elliptical_cluster(
      n = n_cluster,
      center_x = config$center_x,
      center_y = config$center_y,
      sigma_x = config$sigma_x,
      sigma_y = config$sigma_y,
      correlation = config$correlation
    )
    
    points <- rbind(points, cluster_points)
    cluster_labels <- c(cluster_labels, rep(i, n_cluster))
  }
  
  return(list(points = points, true_clusters = cluster_labels))
}

# Generate data for each time point with controlled x-axis progression
time_points <- list()
true_clusters <- list()
for (t in 1:n_time_points) {
  data <- generate_controlled_elliptical_clusters(n_points, t, n_time_points)
  time_points[[t]] <- data$points
  true_clusters[[t]] <- data$true_clusters
  
  cat("Time", t, "- X range:", round(range(data$points[, 1]), 2), 
      "Y range:", round(range(data$points[, 2]), 2), "\n")
}

# Determine optimal number of clusters for each time point
optimal_clusters <- list()
for (t in 1:n_time_points) {
  sil_width <- numeric(max_clusters - 1)
  
  for (k in 2:max_clusters) {
    km <- kmeans(time_points[[t]], centers = k, nstart = 10)
    sil_width[k-1] <- simple_silhouette(time_points[[t]], km$cluster)
  }
  
  # Determine optimal k
  optimal_k <- which.max(sil_width) + 1
  cat("Time point", t, "- Optimal number of clusters:", optimal_k, "\n")
  
  # Cluster the data with optimal k
  km <- kmeans(time_points[[t]], centers = optimal_k, nstart = 25)
  
  # Store clustering results
  optimal_clusters[[t]] <- list(
    points = time_points[[t]],
    centers = km$centers,
    cluster = km$cluster,
    size = km$size,
    true_cluster = true_clusters[[t]]
  )
}

# Improved point-to-point transport with trajectory tracking
point_to_point_transport_with_tracking <- function(source_points, target_points) {
  n_source <- nrow(source_points)
  n_target <- nrow(target_points)
  
  # Calculate cost matrix (Euclidean distances)
  cost_matrix <- matrix(0, nrow = n_source, ncol = n_target)
  for (i in 1:n_source) {
    for (j in 1:n_target) {
      cost_matrix[i, j] <- sqrt(sum((source_points[i, ] - target_points[j, ])^2))
    }
  }
  
  # Greedy assignment (approximation of Hungarian algorithm)
  result <- data.frame(from = integer(), to = integer(), cost = numeric())
  used_targets <- logical(n_target)
  
  for (i in 1:min(n_source, n_target)) {
    available_costs <- cost_matrix
    available_costs[, used_targets] <- Inf
    
    min_idx <- which.min(available_costs)
    source_idx <- (min_idx - 1) %% n_source + 1
    target_idx <- (min_idx - 1) %/% n_source + 1
    
    result <- rbind(result, data.frame(
      from = source_idx,
      to = target_idx,
      cost = cost_matrix[source_idx, target_idx]
    ))
    
    used_targets[target_idx] <- TRUE
    cost_matrix[source_idx, ] <- Inf
  }
  
  return(result)
}

# Calculate continuous transport plans
continuous_transport_plans <- list()
for (t in 1:(n_time_points - 1)) {
  source_points <- optimal_clusters[[t]]$points
  target_points <- optimal_clusters[[t+1]]$points
  
  plan <- point_to_point_transport_with_tracking(source_points, target_points)
  continuous_transport_plans[[t]] <- plan
  
  cat("Transport plan from time", t, "to time", t+1, ":\n")
  cat("  - Point correspondences:", nrow(plan), "\n")
  cat("  - Average transport cost:", round(mean(plan$cost), 3), "\n")
}

# Build continuous trajectories for each point
build_trajectories <- function(transport_plans, time_points) {
  n_initial_points <- nrow(time_points[[1]])
  trajectories <- list()
  
  # Initialize trajectories with first time point
  for (i in 1:n_initial_points) {
    trajectories[[i]] <- list(
      time_points = c(1),
      coordinates = list(time_points[[1]][i, ]),
      point_indices = c(i)
    )
  }
  
  # Follow each point through time
  for (t in 1:(length(transport_plans))) {
    plan <- transport_plans[[t]]
    new_trajectories <- list()
    
    for (i in 1:length(trajectories)) {
      traj <- trajectories[[i]]
      last_point_idx <- tail(traj$point_indices, 1)
      
      # Find where this point goes in the next time step
      next_point_row <- which(plan$from == last_point_idx)
      
      if (length(next_point_row) > 0) {
        next_point_idx <- plan$to[next_point_row[1]]
        
        # Extend trajectory
        traj$time_points <- c(traj$time_points, t + 1)
        traj$coordinates <- c(traj$coordinates, list(time_points[[t + 1]][next_point_idx, ]))
        traj$point_indices <- c(traj$point_indices, next_point_idx)
      }
      
      new_trajectories[[i]] <- traj
    }
    
    trajectories <- new_trajectories
  }
  
  return(trajectories)
}

# Build trajectories
trajectories <- build_trajectories(continuous_transport_plans, time_points)

# Create PDF output for visualization
pdf("ot_test_results.pdf", width = 14, height = 10)

# 1. Overview: All time points with continuous trajectories
# Adjust plot limits to accommodate x-axis progression
x_range <- range(sapply(time_points, function(tp) range(tp[, 1])))
y_range <- range(sapply(time_points, function(tp) range(tp[, 2])))
x_margin <- diff(x_range) * 0.1
y_margin <- diff(y_range) * 0.1

plot(NULL, xlim = c(x_range[1] - x_margin, x_range[2] + x_margin), 
     ylim = c(y_range[1] - y_margin, y_range[2] + y_margin),
     main = "Continuous Optimal Transport: X-axis Controlled Elliptical Progression",
     xlab = "X (Time Progression)", ylab = "Y", cex.main = 1.2)

# Color scheme for time points
time_colors <- rainbow(n_time_points, alpha = 0.8)

# Plot all points for each time step with elliptical shapes
for (t in 1:n_time_points) {
  points(optimal_clusters[[t]]$points, 
         col = time_colors[t], 
         pch = 19, cex = 0.8)
  
  # Add elliptical confidence regions for true clusters
  for (cluster_id in unique(true_clusters[[t]])) {
    cluster_points <- optimal_clusters[[t]]$points[true_clusters[[t]] == cluster_id, ]
    if (nrow(cluster_points) > 2) {
      # Calculate ellipse parameters
      center <- colMeans(cluster_points)
      cov_mat <- cov(cluster_points)
      
      # Draw ellipse (simplified version)
      eigenvals <- eigen(cov_mat)$values
      eigenvecs <- eigen(cov_mat)$vectors
      angle <- atan2(eigenvecs[2, 1], eigenvecs[1, 1])
      
      # Draw ellipse outline
      theta <- seq(0, 2*pi, length.out = 100)
      ellipse_x <- center[1] + sqrt(eigenvals[1]) * cos(theta) * cos(angle) - sqrt(eigenvals[2]) * sin(theta) * sin(angle)
      ellipse_y <- center[2] + sqrt(eigenvals[1]) * cos(theta) * sin(angle) + sqrt(eigenvals[2]) * sin(theta) * cos(angle)
      lines(ellipse_x, ellipse_y, col = time_colors[t], lwd = 2, lty = 2)
    }
  }
}

# Draw continuous trajectories
for (i in 1:length(trajectories)) {
  traj <- trajectories[[i]]
  if (length(traj$coordinates) >= 2) {
    # Extract coordinates
    x_coords <- sapply(traj$coordinates, function(coord) coord[1])
    y_coords <- sapply(traj$coordinates, function(coord) coord[2])
    
    # Draw trajectory line
    lines(x_coords, y_coords, col = "black", lwd = 1.5, lty = 1)
    
    # Add arrows to show direction
    for (j in 1:(length(x_coords) - 1)) {
      arrows(x_coords[j], y_coords[j], 
             x_coords[j + 1], y_coords[j + 1],
             length = 0.05, col = "darkgray", lwd = 0.8)
    }
  }
}

# Add vertical lines to show x-axis progression
for (t in 1:n_time_points) {
  abline(v = (t - 1), col = "lightgray", lty = 3, lwd = 1)
  text((t - 1), y_range[2] + y_margin * 0.5, paste("t =", t), cex = 0.8, adj = 0.5)
}

# Add legend
legend("topright", 
       legend = paste("Time", 1:n_time_points),
       col = time_colors, 
       pch = 19,
       title = "Time Points",
       cex = 0.8)

# Add text annotations
text(x_range[1], y_range[2], paste("Total trajectories:", length(trajectories)), cex = 0.9, adj = 0)
text(x_range[1], y_range[2] - y_margin * 0.3, paste("X-axis progression: 0 → 1 → 2 → 3"), cex = 0.9, adj = 0)

# 2. Step-by-step transport visualization with x-axis focus
for (t in 1:(n_time_points - 1)) {
  plot(NULL, xlim = c(x_range[1] - x_margin, x_range[2] + x_margin), 
       ylim = c(y_range[1] - y_margin, y_range[2] + y_margin),
       main = paste("X-axis Controlled Transport: Time", t, "→", t + 1),
       xlab = "X (Time Progression)", ylab = "Y")
  
  # Add vertical reference lines
  abline(v = (t - 1), col = "lightblue", lty = 2, lwd = 2)
  abline(v = t, col = "lightcoral", lty = 2, lwd = 2)
  
  # Plot source points
  points(optimal_clusters[[t]]$points, 
         col = time_colors[t], 
         pch = 19, cex = 1.2)
  
  # Plot target points
  points(optimal_clusters[[t+1]]$points, 
         col = time_colors[t + 1], 
         pch = 17, cex = 1.2)
  
  # Draw transport arrows
  plan <- continuous_transport_plans[[t]]
  for (i in 1:nrow(plan)) {
    from_idx <- plan$from[i]
    to_idx <- plan$to[i]
    cost <- plan$cost[i]
    
    # Color and width based on cost
    max_cost <- max(plan$cost)
    color_intensity <- 1 - (cost / max_cost) * 0.6
    line_width <- 1 + 2 * (1 - cost / max_cost)
    
    arrows(
      optimal_clusters[[t]]$points[from_idx, 1],
      optimal_clusters[[t]]$points[from_idx, 2],
      optimal_clusters[[t+1]]$points[to_idx, 1],
      optimal_clusters[[t+1]]$points[to_idx, 2],
      lwd = line_width,
      length = 0.08,
      col = rgb(0, 0, 0, alpha = color_intensity)
    )
  }
  
  # Add statistics
  avg_cost <- round(mean(plan$cost), 3)
  total_cost <- round(sum(plan$cost), 3)
  x_displacement <- round(mean(optimal_clusters[[t+1]]$points[, 1]) - mean(optimal_clusters[[t]]$points[, 1]), 3)
  
  text(x_range[1], y_range[2], paste("Avg cost:", avg_cost), cex = 0.9, adj = 0)
  text(x_range[1], y_range[2] - y_margin * 0.2, paste("X displacement:", x_displacement), cex = 0.9, adj = 0)
  text(x_range[1], y_range[2] - y_margin * 0.4, paste("Connections:", nrow(plan)), cex = 0.9, adj = 0)
  
  legend("topright", 
         legend = c(paste("Time", t, "(x≈", t-1, ")"), paste("Time", t + 1, "(x≈", t, ")"), "Transport"),
         col = c(time_colors[t], time_colors[t + 1], "black"),
         pch = c(19, 17, NA),
         lty = c(NA, NA, 1),
         cex = 0.8)
}

# 3. Individual trajectory analysis with x-axis focus
n_sample_trajectories <- min(8, length(trajectories))
sample_indices <- seq(1, length(trajectories), length.out = n_sample_trajectories)

plot(NULL, xlim = c(x_range[1] - x_margin, x_range[2] + x_margin), 
     ylim = c(y_range[1] - y_margin, y_range[2] + y_margin),
     main = "Sample Individual Trajectories: X-axis Progression",
     xlab = "X (Time Progression)", ylab = "Y")

# Add vertical reference lines
for (t in 1:n_time_points) {
  abline(v = (t - 1), col = "lightgray", lty = 3, lwd = 1)
  text((t - 1), y_range[2] + y_margin * 0.3, paste("t", t), cex = 0.7, adj = 0.5)
}

# Color scheme for individual trajectories
traj_colors <- rainbow(n_sample_trajectories, alpha = 0.8)

for (i in 1:n_sample_trajectories) {
  traj_idx <- round(sample_indices[i])
  traj <- trajectories[[traj_idx]]
  
  if (length(traj$coordinates) >= 2) {
    x_coords <- sapply(traj$coordinates, function(coord) coord[1])
    y_coords <- sapply(traj$coordinates, function(coord) coord[2])
    
    # Draw trajectory with unique color
    lines(x_coords, y_coords, col = traj_colors[i], lwd = 2)
    
    # Mark start and end points
    points(x_coords[1], y_coords[1], col = traj_colors[i], pch = 19, cex = 1.5)
    points(tail(x_coords, 1), tail(y_coords, 1), col = traj_colors[i], pch = 17, cex = 1.5)
    
    # Add trajectory number
    text(x_coords[1], y_coords[1], as.character(traj_idx), 
         pos = 3, cex = 0.7, col = "white", font = 2)
  }
}

legend("topright", 
       legend = c("Start", "End"),
       pch = c(19, 17),
       col = "black",
       title = "Trajectory Points",
       cex = 0.8)

# 4. X-displacement analysis over time
x_displacements <- sapply(1:(n_time_points - 1), function(t) {
  mean(optimal_clusters[[t+1]]$points[, 1]) - mean(optimal_clusters[[t]]$points[, 1])
})

plot(1:(n_time_points - 1), x_displacements,
     type = "b", pch = 19, col = "blue", lwd = 2,
     main = "X-axis Displacement Over Time",
     xlab = "Time Step", ylab = "Average X Displacement",
     ylim = c(0, max(x_displacements) * 1.2))

# Add reference line at y = 1 (expected displacement)
abline(h = 1, col = "red", lty = 2, lwd = 2)
text(1, 1.1, "Expected displacement = 1", cex = 0.9, adj = 0, col = "red")

grid(col = "lightgray", lty = 3)

# 5. Transport cost vs X-displacement correlation
transport_costs <- sapply(continuous_transport_plans, function(plan) mean(plan$cost))
plot(x_displacements, transport_costs,
     pch = 19, col = "darkgreen", cex = 1.5,
     main = "Transport Cost vs X-displacement",
     xlab = "X Displacement", ylab = "Average Transport Cost")

# Add correlation line
if (length(x_displacements) > 1) {
  correlation <- cor(x_displacements, transport_costs)
  lm_fit <- lm(transport_costs ~ x_displacements)
  abline(lm_fit, col = "red", lwd = 2)
  
  text(min(x_displacements), max(transport_costs) * 0.9, 
       paste("Correlation:", round(correlation, 3)), 
       cex = 0.9, adj = 0)
}

grid(col = "lightgray", lty = 3)

# Close PDF device
dev.off()

cat("\nX-axis Controlled Continuous Optimal Transport Visualization complete.\n")
cat("Results saved to ot_test_results.pdf\n")
cat("\nSummary:\n")
cat("Total trajectories tracked:", length(trajectories), "\n")
cat("Time steps:", n_time_points, "\n")
cat("X-axis progression: 0 → 1 → 2 → 3\n")
for (t in 1:(n_time_points - 1)) {
  plan <- continuous_transport_plans[[t]]
  x_disp <- round(mean(optimal_clusters[[t+1]]$points[, 1]) - mean(optimal_clusters[[t]]$points[, 1]), 3)
  cat("Step", t, "→", t + 1, ":\n")
  cat("  - Average transport cost:", round(mean(plan$cost), 3), "\n")
  cat("  - X displacement:", x_disp, "\n")
  cat("  - Total transport cost:", round(sum(plan$cost), 3), "\n")
}

# Calculate and display trajectory statistics
valid_trajectories <- trajectories[sapply(trajectories, function(traj) length(traj$coordinates) >= 2)]
if (length(valid_trajectories) > 0) {
  trajectory_lengths <- sapply(trajectories, function(traj) {
    if (length(traj$coordinates) >= 2) {
      coords <- do.call(rbind, traj$coordinates)
      total_length <- 0
      for (i in 1:(nrow(coords) - 1)) {
        total_length <- total_length + sqrt(sum((coords[i + 1, ] - coords[i, ])^2))
      }
      return(total_length)
    } else {
      return(0)
    }
  })
  
  avg_trajectory_length <- mean(trajectory_lengths[trajectory_lengths > 0])
  cat("\nTrajectory Analysis:\n")
  cat("  - Complete trajectories:", length(valid_trajectories), "\n")
  cat("  - Average trajectory length:", round(avg_trajectory_length, 3), "\n")
  
  # X-axis progression analysis
  x_progression <- sapply(valid_trajectories, function(traj) {
    coords <- do.call(rbind, traj$coordinates)
    return(coords[nrow(coords), 1] - coords[1, 1])  # Final X - Initial X
  })
  cat("  - Average X progression:", round(mean(x_progression), 3), "\n")
  cat("  - X progression std dev:", round(sd(x_progression), 3), "\n")
} 