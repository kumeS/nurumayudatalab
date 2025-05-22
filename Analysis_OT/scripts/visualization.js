// Visualization control module for Optimal Transport visualization

// Import the clustering script generation functions
import { generateClusteringScript, generateSetupCode } from './clustering.js';

class OTVisualizer {
  constructor() {
    // WebR instance
    this.R = null;
    
    // Visualization state
    this.isRunning = false;
    this.currentMode = 'points'; // Default visualization mode: 'points' or 'density'
    this.timeDisplayMode = 'consecutive'; // 'consecutive' or 'cumulative'
    
    // DOM elements cache
    this.elements = {
      runButton: document.getElementById('run-visualization'),
      stopButton: document.getElementById('stop-visualization'),
      animateButton: document.getElementById('animate-visualization'),
      plotCanvas: document.getElementById('plot-canvas'),
      console: document.getElementById('r-console'),
      codeDisplay: document.getElementById('code-display'),
      loading: document.getElementById('loading-indicator'),
      tabs: {
        points: document.getElementById('tab-points'),
        density: document.getElementById('tab-density'),
        code: document.getElementById('tab-code'),
        vector: document.getElementById('tab-vector')
      },
      contents: {
        points: document.getElementById('content-points'),
        density: document.getElementById('content-density'),
        code: document.getElementById('content-code'),
        vector: document.getElementById('content-vector')
      },
      codeButtons: {
        points: document.getElementById('code-points-btn'),
        density: document.getElementById('code-density-btn')
      },
      parameters: {
        nPoints: document.getElementById('n-points'),
        nTimes: document.getElementById('n-times'),
        maxK: document.getElementById('max-k'),
        timeDisplayMode: document.getElementById('time-display-mode')
      },
      parameterValues: {
        nPoints: document.getElementById('n-points-value'),
        nTimes: document.getElementById('n-times-value'),
        maxK: document.getElementById('max-k-value')
      }
    };
    
    // Initialize the visualizer
    this.init();
  }
  
  // Initialize the visualization system
  async init() {
    // Initialize WebR
    this.showLoading('WebRを初期化しています...');
    try {
      this.R = await this.initializeWebR();
      this.log('WebR初期化完了');
      this.hideLoading();
      
      // Enable UI controls
      this.elements.runButton.disabled = false;
      
      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      this.log(`エラー: ${error.message}`);
      this.hideLoading();
    }
  }
  
  // Initialize WebR instance
  async initializeWebR() {
    const webR = new window.WebR.WebR();
    await webR.init();
    
    // Set up stdout and stderr handlers
    webR.stdout.subscribe(msg => this.log(`> ${msg}`));
    webR.stderr.subscribe(msg => this.log(`! ${msg}`));
    
    return webR;
  }
  
  // Set up event listeners for UI controls
  setupEventListeners() {
    // Run button
    this.elements.runButton.addEventListener('click', () => this.runVisualization());
    
    // Stop button
    this.elements.stopButton.addEventListener('click', () => this.stopVisualization());
    
    // Animate button
    this.elements.animateButton.addEventListener('click', () => this.animateVisualization());
    
    // Tab navigation
    Object.keys(this.elements.tabs).forEach(tabKey => {
      this.elements.tabs[tabKey].addEventListener('click', () => this.switchTab(tabKey));
    });
    
    // Parameter sliders
    Object.keys(this.elements.parameters).forEach(paramKey => {
      if (paramKey !== 'timeDisplayMode') {
        const slider = this.elements.parameters[paramKey];
        const valueDisplay = this.elements.parameterValues[paramKey];
        
        slider.addEventListener('input', () => {
          valueDisplay.textContent = slider.value;
        });
      }
    });
    
    // Code toggle buttons
    this.elements.codeButtons.points.addEventListener('click', () => this.showCode('points'));
    this.elements.codeButtons.density.addEventListener('click', () => this.showCode('density'));
    
    // Time display mode selector
    this.elements.parameters.timeDisplayMode.addEventListener('change', (e) => {
      this.timeDisplayMode = e.target.value;
    });
  }
  
  // Switch between tabs
  switchTab(tabKey) {
    // Update tab buttons
    Object.keys(this.elements.tabs).forEach(key => {
      this.elements.tabs[key].classList.remove('active');
      this.elements.contents[key].classList.remove('active');
    });
    
    this.elements.tabs[tabKey].classList.add('active');
    this.elements.contents[tabKey].classList.add('active');
    
    // Update visualization mode if switching between points/density tabs
    if (tabKey === 'points' || tabKey === 'density') {
      this.currentMode = tabKey;
    }
  }
  
  // Show code in the code display area
  showCode(codeType) {
    const params = this.getVisualizationParams();
    params.mode = codeType;
    
    const scriptCode = generateClusteringScript(params);
    this.elements.codeDisplay.textContent = scriptCode;
  }
  
  // Get current visualization parameters
  getVisualizationParams() {
    return {
      n_points: parseInt(this.elements.parameters.nPoints.value),
      n_times: parseInt(this.elements.parameters.nTimes.value),
      max_k: parseInt(this.elements.parameters.maxK.value),
      mode: this.currentMode,
      timeDisplayMode: this.timeDisplayMode
    };
  }
  
  // Run the visualization
  async runVisualization() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.elements.runButton.disabled = true;
    this.elements.stopButton.disabled = false;
    
    try {
      this.showLoading('可視化を実行中...');
      
      // Get parameters
      const params = this.getVisualizationParams();
      
      // Generate R code
      const setupCode = generateSetupCode();
      const visualizationCode = generateClusteringScript(params);
      
      // Execute R code
      await this.executeRCode(setupCode, visualizationCode);
      
      // Display the resulting plot
      await this.displayRPlot();
      
      this.log('可視化完了');
      this.elements.animateButton.disabled = false;
    } catch (error) {
      this.log(`エラー: ${error.message}`);
    } finally {
      this.hideLoading();
      this.isRunning = false;
      this.elements.runButton.disabled = false;
    }
  }
  
  // Stop the visualization
  stopVisualization() {
    if (!this.isRunning) return;
    
    // Currently there's no good way to interrupt WebR execution
    // Just disable the stop button to indicate it's not stoppable
    this.elements.stopButton.disabled = true;
    this.log('現在の処理が完了するまでお待ちください...');
  }
  
  // Animate the visualization (run through time points)
  async animateVisualization() {
    if (this.isRunning) return;
    
    // This would be implemented to step through time points
    // Not fully implemented in this version
    this.log('アニメーション機能は準備中です。');
  }
  
  // Execute R code through WebR
  async executeRCode(setupCode, visualizationCode) {
    // Evaluate the setup code first
    await this.R.evalR(setupCode);
    
    // Then evaluate the visualization code
    await this.R.evalR(visualizationCode);
  }
  
  // Display R plot on canvas
  async displayRPlot() {
    const canvas = this.elements.plotCanvas;
    const ctx = canvas.getContext('2d');
    
    // Get the plot as an image data URL
    const plotShelter = await this.R.evalR('webr::canvas()');
    const plotImage = await plotShelter.toImageURL();
    
    // Display the image on canvas
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = plotImage;
  }
  
  // Show loading indicator
  showLoading(message) {
    this.elements.loading.style.display = 'flex';
    this.log(message);
  }
  
  // Hide loading indicator
  hideLoading() {
    this.elements.loading.style.display = 'none';
  }
  
  // Log a message to the console
  log(message) {
    const console = this.elements.console;
    console.innerHTML += `${message}\n`;
    console.scrollTop = console.scrollHeight;
  }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  // Load WebR
  window.loadWebR = async () => {
    const visualizer = new OTVisualizer();
  };
  
  // Load WebR script
  const script = document.createElement('script');
  script.src = 'https://webr.r-wasm.org/latest/webr.js';
  script.onload = () => {
    window.loadWebR();
  };
  document.head.appendChild(script);
});

export default OTVisualizer; 