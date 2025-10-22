# Fabric.js Viewport Transform Guide

Quick reference for working with Fabric.js canvas transformations in this project.

## ✅ DO: Use Fabric.js APIs

```javascript
// Zoom to a specific point
const point = new fabric.Point(x, y);
canvas.zoomToPoint(point, zoomLevel);

// Set zoom (centered on current viewport center)
canvas.setZoom(zoomLevel);

// Center an object in viewport
canvas.viewportCenterObject(object);

// Center a specific point
const point = new fabric.Point(canvas.width / 2, canvas.height / 2);
canvas.viewportCenterObject({
    left: point.x,
    top: point.y,
    getCenterPoint: function() { return point; }
});

// Get current zoom
const zoom = canvas.getZoom();
```

## ❌ DON'T: Manually manipulate viewportTransform (except for pan)

```javascript
// ❌ WRONG - Breaks coordinate mapping
const vpt = canvas.viewportTransform;
vpt[4] = someValue;  // translateX
vpt[5] = someValue;  // translateY

// ❌ WRONG - Using scaled coordinates
const centerX = (canvas.width * zoom) / 2;

// ✅ CORRECT - Use logical coordinates
const centerX = canvas.width / 2;
```

## Exception: Panning is OK

```javascript
// ✅ CORRECT - Pure translation for pan
canvas.on('mouse:move', function(opt) {
    if (isPanning) {
        const vpt = canvas.viewportTransform;
        vpt[4] += deltaX;  // OK: Pure translation
        vpt[5] += deltaY;
        canvas.requestRenderAll();
    }
});
```

## Coordinate Systems

### Logical Coordinates
- Canvas internal coordinate system
- Not affected by zoom
- Use for: Object positions, canvas size calculations
```javascript
canvas.width / 2  // ✅ Logical center X
```

### Scaled Coordinates
- Visible size after zoom applied
- Use for: Display, container sizing
```javascript
(canvas.width * zoom) / 2  // Scaled center X (for display only)
```

### Screen Coordinates
- Browser viewport coordinates
- Fabric.js handles conversion automatically
- Don't manually convert unless necessary

## Transform Matrix

```
viewportTransform = [a, b, c, d, e, f]

[a  c  e]   [scaleX  skewX   translateX]
[b  d  f] = [skewY   scaleY  translateY]
[0  0  1]   [0       0       1         ]
```

- `a` (index 0): Scale X
- `b` (index 1): Skew Y
- `c` (index 2): Skew X
- `d` (index 3): Scale Y
- `e` (index 4): Translate X
- `f` (index 5): Translate Y

### Coordinate Transformation
```javascript
// Screen → Canvas (Fabric.js does this internally)
canvasX = (screenX - e) / a
canvasY = (screenY - f) / d
```

**Warning**: Manually setting `e` or `f` after zoom breaks this math!

## Common Patterns

### Fit Canvas to Container
```javascript
function fitCanvasToContainer() {
    const widthScale = containerWidth / canvas.width;
    const heightScale = containerHeight / canvas.height;
    const fitZoom = Math.min(widthScale, heightScale);
    
    const centerPoint = new fabric.Point(canvas.width / 2, canvas.height / 2);
    canvas.zoomToPoint(centerPoint, fitZoom);
}
```

### Reset Zoom
```javascript
function resetZoom() {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);
    // Then center if needed using viewportCenterObject
}
```

### Wheel Zoom (with mouse pointer as center)
```javascript
container.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 0.999 ** e.deltaY;
        const newZoom = clamp(canvas.getZoom() * zoomFactor);
        
        const rect = container.getBoundingClientRect();
        const point = new fabric.Point(
            e.clientX - rect.left + container.scrollLeft,
            e.clientY - rect.top + container.scrollTop
        );
        
        canvas.zoomToPoint(point, newZoom);
    }
});
```

### Pan with Space Key
```javascript
canvas.on('mouse:move', function(opt) {
    if (isPanning) {
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += evt.clientX - lastX;  // ✅ OK for pan
        vpt[5] += evt.clientY - lastY;
        canvas.requestRenderAll();
        lastX = evt.clientX;
        lastY = evt.clientY;
    }
});
```

## Testing Checklist

After any viewport changes, test:
- [ ] Click selection works
- [ ] Drag selection works
- [ ] Pan works (Space + drag)
- [ ] Zoom in/out works
- [ ] No visual jumps or shifts
- [ ] Works on mobile (touch)

## Debugging Tips

```javascript
// Log current transform
console.log('vpt:', canvas.viewportTransform);
console.log('zoom:', canvas.getZoom());

// Check coordinate conversion
const canvasPoint = canvas.viewportTransform;
console.log('Transform:', {
    scaleX: canvasPoint[0],
    scaleY: canvasPoint[3],
    translateX: canvasPoint[4],
    translateY: canvasPoint[5]
});

// Test coordinate mapping
const testPoint = canvas.getPointer({ clientX: 100, clientY: 100 });
console.log('Canvas coordinates:', testPoint);
```

## Common Issues

### Issue: Clicks miss objects
**Cause**: Incorrect viewport transform (usually from manual manipulation)  
**Solution**: Use Fabric.js APIs instead of manual transform

### Issue: Canvas shifts unexpectedly
**Cause**: Using scaled instead of logical coordinates for centering  
**Solution**: Use `canvas.width / 2` not `(canvas.width * zoom) / 2`

### Issue: Zoom breaks after certain operations
**Cause**: Transform not properly maintained through operation  
**Solution**: Call `canvas.calcOffset()` after DOM changes

## Related Files

- `js/canvas.js`: Main canvas management
- `docs/FIX-canvas-zoom-selection.md`: Detailed fix documentation
- `docs/SUMMARY-canvas-fix-2024.md`: High-level fix summary

## References

- [Fabric.js Official Docs](http://fabricjs.com/docs/)
- [Fabric.js GitHub](https://github.com/fabricjs/fabric.js)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
