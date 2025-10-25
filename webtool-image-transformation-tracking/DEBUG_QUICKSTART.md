# Debug System Quick Start Guide

## 🚀 Getting Started (30 seconds)

### 1. Open Your Application
Open `index.html` in your browser.

### 2. Open Browser Console
- **Chrome/Edge**: Press `F12` or `Cmd+Option+J` (Mac) / `Ctrl+Shift+J` (Windows)
- **Firefox**: Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
- **Safari**: Enable Developer menu first, then `Cmd+Option+C`

### 3. Enable Debug Mode
```javascript
debug.enable()
```

You'll see:
```
[INFO] 🐛 Debug mode enabled
```

### 4. See All Available Commands
```javascript
debug.help()
```

---

## 📖 Common Commands

### View Application State
```javascript
debug.state
```

**Output**:
```javascript
{
  workflowEngine: { nodes: 3, edges: 2, mode: "select", ... },
  canvasController: { initialized: true, imageCache: 5 },
  config: { hasIOKey: true, hasReplicateKey: false, ... },
  localStorage: { used: "2.43 KB", workflows: 1 }
}
```

### Log Messages
```javascript
// Different log levels
debug.info('User added a node')
debug.warn('API key not configured')
debug.error('Failed to save workflow', error)
debug.debug('Detailed debugging info')
```

### Monitor Performance
```javascript
debug.startPerformance('ImageUpload')
// ... your image upload code ...
debug.endPerformance('ImageUpload')

// Output: ⏱️ ImageUpload: 234.56ms
```

### Track Events
```javascript
debug.trackEvent('button_clicked', { buttonId: 'addNode', timestamp: Date.now() })
```

### View All Logs
```javascript
debug.logs  // Array of all log entries
debug.events // Array of all tracked events  
debug.errors // Array of all captured errors
```

### Export Debug Data
```javascript
debug.exportLogs()
```
Downloads a JSON file with all logs, events, errors, and current state.

### Show Debug Console Overlay
```javascript
debug.showConsole()
```
Shows a visual console overlay at the bottom of the page with recent logs.

### Run Automated Tests
```javascript
await debug.runTests()
```

**Expected Output**:
```
============================================================
🧪 Test Results: 8 passed, 0 failed
============================================================
✅ Config initialization
✅ WorkflowEngine initialization
✅ Node creation and deletion
✅ Edge creation
✅ localStorage operations
✅ Image cache initialization
✅ Config has required methods
✅ Event system
============================================================
```

### Clear Cache & Logs
```javascript
debug.clearCache()
```

---

## ⚙️ Configuration

### Set Log Level
```javascript
debug.setLevel('DEBUG')  // Show everything
debug.setLevel('INFO')   // Default - general info
debug.setLevel('WARN')   // Warnings only
debug.setLevel('ERROR')  // Errors only
```

### Disable Debug Mode
```javascript
debug.disable()
```

---

## 🎯 Real-World Usage Examples

### Example 1: Debugging Image Upload Issues
```javascript
// Enable debug mode
debug.enable()
debug.setLevel('DEBUG')

// Monitor image upload
debug.startPerformance('ImageUpload')
debug.trackEvent('upload_started', { filename: 'photo.jpg' })

// ... your upload code runs ...

debug.endPerformance('ImageUpload')
debug.trackEvent('upload_completed')

// Check if there were any errors
console.log(debug.errors)

// Export logs for review
debug.exportLogs()
```

### Example 2: Investigating Performance Issues
```javascript
debug.enable()

// Time critical operations
await debug.timeAsync('Workflow Save', async () => {
  await workflowEngine.saveWorkflow()
})

await debug.timeAsync('Canvas Redraw', async () => {
  await canvasController.network.redraw()
})

// Check performance logs
debug.logs.filter(log => log.message.includes('⏱️'))
```

### Example 3: Validating Application State
```javascript
debug.enable()

// Check current state
const state = debug.getState()

console.log('Nodes:', state.workflowEngine.nodes)
console.log('Edges:', state.workflowEngine.edges)
console.log('Image Cache Size:', state.canvasController.imageCache)
console.log('Config Valid:', state.config.hasIOKey)

// Run full validation
await debug.runTests()
```

### Example 4: Tracking User Actions
```javascript
debug.enable()

// Track all user interactions
document.getElementById('addNodeBtn').addEventListener('click', () => {
  debug.trackEvent('add_node_clicked')
})

document.getElementById('connectNodesBtn').addEventListener('click', () => {
  debug.trackEvent('connect_mode_toggled')
})

// Later, review all user actions
console.log(debug.events)
```

---

## 🐛 Troubleshooting

### Debug Mode Won't Enable
```javascript
// Clear localStorage and try again
localStorage.clear()
location.reload()

// Then:
debug.enable()
```

### Tests Are Failing
```javascript
// Run tests to see which one fails
await debug.runTests()

// Check if dependencies are loaded
console.log('Config:', window.config)
console.log('Engine:', window.workflowEngine)
console.log('Canvas:', window.canvasController)
```

### Logs Not Appearing
```javascript
// Check current log level
const config = JSON.parse(localStorage.getItem('debugConfig'))
console.log('Current level:', config.level)

// Set to DEBUG to see everything
debug.setLevel('DEBUG')
```

### LocalStorage Quota Exceeded
```javascript
// Check usage
debug.state.localStorage

// Clear old workflows
const workflows = JSON.parse(localStorage.getItem('workflows') || '[]')
console.log('Workflow count:', workflows.length)

// Keep only recent ones
localStorage.setItem('workflows', JSON.stringify(workflows.slice(-5)))
```

---

## 💡 Pro Tips

1. **Keep debug mode OFF by default** - Only enable when investigating issues
2. **Use appropriate log levels** - Don't flood console with DEBUG messages
3. **Export logs before reporting bugs** - Use `debug.exportLogs()`
4. **Run tests after major changes** - Use `debug.runTests()`
5. **Monitor performance regularly** - Use `debug.timeAsync()` for critical operations
6. **Track important events** - Use `debug.trackEvent()` for user actions

---

## 📊 Performance Impact

- **Disabled**: ~0ms overhead (no-op)
- **Enabled**: 
  - Logging: <1ms per call
  - Performance tracking: <0.1ms
  - State inspection: ~5-10ms
  - Full test suite: ~200-500ms

**Memory**: Max ~800KB (1000 logs + 500 events + 100 errors)

---

## 🆘 Getting Help

If you're stuck:

1. Run `debug.help()` - See all available commands
2. Check `debug.state` - View current application state
3. Run `debug.runTests()` - Validate setup
4. Export logs with `debug.exportLogs()` - Get full diagnostic data
5. Check browser console for error messages

---

## 📚 Full Documentation

For complete API reference and advanced usage, see:
- `COMPREHENSIVE_BUG_FIX_REPORT.md` - Full implementation details
- `js/debug.js` - Source code with comments

---

**Debug System Version**: 1.0  
**Last Updated**: 2025-10-22  
**Status**: ✅ Production Ready
