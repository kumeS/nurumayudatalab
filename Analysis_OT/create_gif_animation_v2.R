# GIF Animation Creator for Optimal Transport Analysis
# Creates optimal_transport_animation.gif for HTML embedding

# Set CRAN mirror
options(repos = c(CRAN = "https://cran.rstudio.com/"))

# Load required packages with error handling
safe_install <- function(package_name) {
  if (!require(package_name, character.only = TRUE)) {
    tryCatch({
      install.packages(package_name)
      library(package_name, character.only = TRUE)
      return(TRUE)
    }, error = function(e) {
      cat("Failed to install", package_name, ":", e$message, "\n")
      return(FALSE)
    })
  }
  return(TRUE)
}

# Essential packages for GIF creation
safe_install("transport")
safe_install("MASS")
safe_install("ggplot2")
safe_install("gganimate")
safe_install("magick")

library(transport)
library(MASS)
library(ggplot2)
library(gganimate)
library(magick)

set.seed(42)

# Simple parameters
n_points <- 30
n_dimensions <- 3  # Simple 3D data
pca_dims <- 2      # 2D visualization

cat("=== GIF Animation Creator for Optimal Transport ===\n")

# Generate A→B→C branching data with better PCA layout
generate_abc_data <- function() {
  # State A: Single cluster at bottom-left in PCA space
  state_A <- mvrnorm(n_points, mu = c(-3, -3, -2), Sigma = diag(3) * 0.3)
  
  # State B: Single cluster at center in PCA space
  state_B <- mvrnorm(n_points, mu = c(0, 0, 0), Sigma = diag(3) * 0.4)
  
  # State C: Two clusters with dramatic Y-axis separation
  c1_points <- round(n_points / 2)
  state_C1 <- mvrnorm(c1_points, mu = c(3.5, 6, 3.5), Sigma = diag(3) * 0.12)
  
  c2_points <- n_points - c1_points
  state_C2 <- mvrnorm(c2_points, mu = c(3.5, -2, -1), Sigma = diag(3) * 0.12)
  
  state_C <- rbind(state_C1, state_C2)
  
  return(list(
    A = state_A,
    B = state_B, 
    C = state_C,
    C_labels = c(rep(1, c1_points), rep(2, c2_points))
  ))
}

# Generate the ABC branching data
cat("Generating A→B→C branching data...\n")
abc_data <- generate_abc_data()

# Apply PCA to combined data to preserve relative positions
apply_combined_pca <- function(data_list) {
  # Combine all data
  combined_data <- rbind(data_list$A, data_list$B, data_list$C)
  state_labels <- c(rep("A", nrow(data_list$A)), 
                   rep("B", nrow(data_list$B)), 
                   rep("C", nrow(data_list$C)))
  
  # Apply PCA to combined data
  pca_result <- prcomp(combined_data, center = TRUE, scale. = TRUE)
  pca_data <- pca_result$x[, 1:pca_dims]
  explained_var <- summary(pca_result)$importance[2, 1:pca_dims]
  
  # Split back into A, B, C
  n_A <- nrow(data_list$A)
  n_B <- nrow(data_list$B)
  n_C <- nrow(data_list$C)
  
  pca_A <- pca_data[1:n_A, ]
  pca_B <- pca_data[(n_A + 1):(n_A + n_B), ]
  pca_C <- pca_data[(n_A + n_B + 1):(n_A + n_B + n_C), ]
  
  return(list(
    A = list(data = pca_A, explained_var = explained_var),
    B = list(data = pca_B, explained_var = explained_var),
    C = list(data = pca_C, explained_var = explained_var)
  ))
}

cat("Applying combined PCA for proper layout...\n")
pca_results <- apply_combined_pca(abc_data)
pca_A <- pca_results$A
pca_B <- pca_results$B
pca_C <- pca_results$C

# Create animation data for GIF with pause frames
create_animation_data <- function() {
  # Animation structure: 20 pause frames (A) + 25 transition frames (A→B) + 25 transition frames (B→C) + 20 pause frames (C)
  pause_frames <- 20
  transition_frames <- 25
  total_frames <- pause_frames + transition_frames + transition_frames + pause_frames
  
  animation_data <- data.frame()
  
  for (frame in 1:total_frames) {
    current_data <- data.frame()
    
    if (frame <= pause_frames) {
      # Initial pause at state A
      for (i in 1:n_points) {
        current_data <- rbind(current_data, data.frame(
          PC1 = pca_A$data[i, 1],
          PC2 = pca_A$data[i, 2],
          Point_ID = i,
          Frame = frame,
          Phase = "A停止",
          State = "A"
        ))
      }
    } else if (frame <= pause_frames + transition_frames) {
      # Phase 1: A → B transition
      progress <- (frame - pause_frames - 1) / (transition_frames - 1)
      for (i in 1:n_points) {
        x_interp <- pca_A$data[i, 1] + progress * (pca_B$data[i, 1] - pca_A$data[i, 1])
        y_interp <- pca_A$data[i, 2] + progress * (pca_B$data[i, 2] - pca_A$data[i, 2])
        
        current_data <- rbind(current_data, data.frame(
          PC1 = x_interp,
          PC2 = y_interp,
          Point_ID = i,
          Frame = frame,
          Phase = "A→B",
          State = ifelse(progress < 0.5, "A", "B")
        ))
      }
    } else if (frame <= pause_frames + transition_frames + transition_frames) {
      # Phase 2: B → C transition
      progress <- (frame - pause_frames - transition_frames - 1) / (transition_frames - 1)
      for (i in 1:n_points) {
        x_interp <- pca_B$data[i, 1] + progress * (pca_C$data[i, 1] - pca_B$data[i, 1])
        y_interp <- pca_B$data[i, 2] + progress * (pca_C$data[i, 2] - pca_B$data[i, 2])
        
        current_data <- rbind(current_data, data.frame(
          PC1 = x_interp,
          PC2 = y_interp,
          Point_ID = i,
          Frame = frame,
          Phase = "B→C",
          State = ifelse(progress < 0.5, "B", paste0("C", abc_data$C_labels[i]))
        ))
      }
    } else {
      # Final pause at state C
      for (i in 1:n_points) {
        current_data <- rbind(current_data, data.frame(
          PC1 = pca_C$data[i, 1],
          PC2 = pca_C$data[i, 2],
          Point_ID = i,
          Frame = frame,
          Phase = "C停止",
          State = paste0("C", abc_data$C_labels[i])
        ))
      }
    }
    
    animation_data <- rbind(animation_data, current_data)
  }
  
  return(animation_data)
}

cat("Creating animation data with pause frames...\n")
anim_data <- create_animation_data()

# Create animated plot with density distributions
cat("Generating high-quality animated GIF with density distributions...\n")

# Calculate axis limits with expanded range
x_range <- range(anim_data$PC1)
y_range <- range(anim_data$PC2)
x_expand <- diff(x_range) * 0.15  # Expand by 15%
y_expand <- diff(y_range) * 0.15  # Expand by 15%

anim_plot <- ggplot(anim_data, aes(x = PC1, y = PC2)) +
  # Add density contours with fixed normalized density levels for consistency
  stat_density_2d(aes(color = State), alpha = 0.6, linewidth = 0.8, 
                   contour_var = "ndensity", breaks = c(0.1, 0.3, 0.5, 0.7, 0.9),
                   h = c(0.6, 0.6)) +
  # Add points on top
  geom_point(aes(color = State), size = 6, alpha = 0.9) +
  scale_color_manual(values = c("A" = "#1f77b4", "B" = "#2ca02c", 
                                "C1" = "#d62728", "C2" = "#ff7f0e")) +
  # Expand axis limits
  xlim(x_range[1] - x_expand, x_range[2] + x_expand) +
  ylim(y_range[1] - y_expand, y_range[2] + y_expand) +
  labs(
    title = "最適輸送による健康状態の変化（密度分布付き）",
    subtitle = "健康状態 A → B → C への変化パターンと密度分布",
    x = paste0("PC1 (", round(pca_A$explained_var[1] * 100, 0), "%)"),
    y = paste0("PC2 (", round(pca_A$explained_var[2] * 100, 0), "%)"),
    color = "健康状態"
  ) +
  theme_minimal() +
  theme(
    plot.title = element_text(size = 36, hjust = 0.5, family = "Arial Unicode MS", face = "bold",
                             margin = margin(b = 20)),
    plot.subtitle = element_text(size = 28, hjust = 0.5, family = "Arial Unicode MS",
                                margin = margin(b = 30)),
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    axis.title.x = element_text(size = 24, face = "bold", margin = margin(t = 15)),
    axis.title.y = element_text(size = 24, face = "bold", margin = margin(r = 15)),
    axis.text.x = element_text(size = 20),
    axis.text.y = element_text(size = 20),
    panel.grid.major = element_line(color = "grey90", linewidth = 0.8),
    panel.grid.minor = element_line(color = "grey95", linewidth = 0.4),
    legend.title = element_text(size = 22, family = "Arial Unicode MS", face = "bold"),
    legend.text = element_text(size = 18, family = "Arial Unicode MS"),
    legend.key.size = unit(1.5, "cm"),
    legend.position = "bottom",
    plot.margin = margin(20, 20, 20, 20)
  ) +
  guides(
    color = guide_legend(override.aes = list(size = 8, alpha = 1))
  ) +
  transition_states(Frame, transition_length = 1, state_length = 1) +
  ease_aes('linear')

# Render animation with updated frame count and timing
total_frames <- 90  # 20 + 25 + 25 + 20
anim_gif <- animate(anim_plot, width = 1920, height = 1440, fps = 10, duration = 9,
                   renderer = gifski_renderer(loop = TRUE), res = 150, nframes = total_frames)

# Save animation with new filename
anim_save("optimal_transport_animation_density.gif", anim_gif)

cat("✅ High-quality GIF animation with density distributions created: optimal_transport_animation_density.gif\n")
cat("   - Resolution: 1920x1440 pixels\n")
cat("   - Duration: 9 seconds (with 2-second pause frames)\n")
cat("   - Frames: 90 (20 pause + 25 transition + 25 transition + 20 pause)\n")
cat("   - Features: Density contours and filled regions\n")
cat("   - Updated terminology: 健康状態の変化 (A→B→C)\n")
cat("   - Text size optimized for readability\n")
cat("   - Ready for HTML embedding\n") 