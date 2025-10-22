# Canvas Zoom and Selection Fix

## Issue Summary

### Problem 1: "Fit to Screen" Button Causes Layout Issues
When clicking the "Fit to screen" button (`zoomFitBtn`), the canvas would not display correctly or would shift unexpectedly.

### Problem 2: Click Selection Not Working
After using zoom functions (especially "Fit to screen"), clicking on objects would not select them correctly. However, drag-selection using bounding boxes still worked.

## Root Cause Analysis

Both issues were caused by incorrect manipulation of Fabric.js's `viewportTransform` matrix in the `centerCanvasInView()` function.

### Technical Details

1. **Incorrect viewport transform manipulation** (lines 730-751 in original `canvas.js`):
   ```javascript
   // WRONG: Manual manipulation of viewport transform
   const vpt = canvas.viewportTransform;
   vpt[4] = containerCenterX - canvasCenterX;  // Manual translation X
   vpt[5] = containerCenterY - canvasCenterY;  // Manual translation Y
   ```

2. **How this broke click selection**:
   - Fabric.js uses the `viewportTransform` matrix `[a, b, c, d, e, f]` to transform coordinates
   - `e` (index 4) and `f` (index 5) represent translations
   - When zoom is applied, the transform contains both scale and translation components
   - Manually overwriting `e` and `f` after zoom breaks the coordinate transformation
   - Result: Screen coordinates don't map correctly to canvas coordinates
   - Clicking appears to work (cursor changes, events fire) but hits wrong canvas positions
   - Drag selection still works because it uses bounding box geometry, not point selection

3. **Calculation error in centering**:
   - Original code calculated: `canvasCenterX = (canvas.width * zoom) / 2`
   - This multiplied by zoom twice: once in the calculation, once in the transform
   - Should use logical coordinates: `canvasCenterX = canvas.width / 2`

## Solution Implemented

### Fix 1: Use Fabric.js Native Centering API

Replaced manual viewport transform manipulation with `canvas.viewportCenterObject()`:

```javascript
// CORRECT: Use Fabric.js API for proper centering
const canvasCenterX = canvas.width / 2;  // Logical coordinates
const canvasCenterY = canvas.height / 2;

const point = new fabric.Point(canvasCenterX, canvasCenterY);
canvas.viewportCenterObject({
    left: canvasCenterX,
    top: canvasCenterY,
    getCenterPoint: function() { return point; }
});
```

### Fix 2: Improve fitCanvasToContainer()

Updated the fit function to use `zoomToPoint()` correctly:

```javascript
// Zoom to canvas center point
const centerPoint = new fabric.Point(canvas.width / 2, canvas.height / 2);
canvas.zoomToPoint(centerPoint, fitZoom);

// Then center the viewport
centerCanvasInView();
```

## Files Modified

- `js/canvas.js`:
  - Line 257-298: `fitCanvasToContainer()` - Fixed zoom and centering logic
  - Line 740-765: `centerCanvasInView()` - Use Fabric.js native API

## Testing Checklist

### Manual Testing Steps

1. **Test Fit to Screen**:
   - [ ] Open the app
   - [ ] Add some text or images to canvas
   - [ ] Click "Fit to screen" button
   - [ ] Verify canvas is centered and visible
   - [ ] Verify no unexpected shifts or cropping

2. **Test Click Selection After Fit**:
   - [ ] After fitting canvas
   - [ ] Click on different objects
   - [ ] Verify each object is correctly selected
   - [ ] Verify selection handles appear in correct positions

3. **Test Zoom and Selection Interaction**:
   - [ ] Use "Zoom in" (+10%) several times
   - [ ] Click objects - should select correctly
   - [ ] Use "Zoom out" (-10%) several times  
   - [ ] Click objects - should still select correctly
   - [ ] Use "Reset zoom" (100%)
   - [ ] Click objects - should still work

4. **Test Pan After Zoom**:
   - [ ] Zoom in to 200%
   - [ ] Pan canvas by dragging with Space key
   - [ ] Click objects in different pan positions
   - [ ] Verify selection works regardless of pan position

5. **Test Touch/Mobile**:
   - [ ] Pinch zoom on touch device
   - [ ] Tap to select objects
   - [ ] Verify tap accuracy matches visual position

6. **Test Drag Selection (Regression)**:
   - [ ] Drag to create selection box
   - [ ] Verify multiple objects can be selected
   - [ ] Verify this still works after zoom/fit operations

## Expected Behavior After Fix

1. ✅ "Fit to screen" centers canvas correctly
2. ✅ Click selection works at all zoom levels
3. ✅ Coordinate mapping is consistent
4. ✅ Zoom, pan, and selection all work together
5. ✅ No visual jumps or unexpected behavior

## Technical Background: Fabric.js Coordinate Systems

### Transform Matrix
Fabric.js uses a 2D affine transformation matrix:
```
[a  c  e]   [scaleX  skewX   translateX]
[b  d  f] = [skewY    scaleY  translateY]
[0  0  1]   [0        0       1         ]
```

Represented as array: `[a, b, c, d, e, f]`

### Coordinate Transformation
Screen point → Canvas point:
```javascript
canvasX = (screenX - e) / a
canvasY = (screenY - f) / d
```

When you manually set `e` or `f` without accounting for scale (`a` and `d`), the transformation breaks.

### Proper Zoom Implementation
1. Use `canvas.setZoom(zoom)` or `canvas.zoomToPoint(point, zoom)`
2. Let Fabric.js update the transform matrix
3. Use `canvas.viewportCenterObject()` or similar APIs for positioning
4. Never manually modify `viewportTransform[4]` or `[5]` except for panning

## Related Functions

Functions that interact with viewport transform (and are working correctly):

- `setupCanvasPan()` (line 768+): Manually modifies `vpt[4]` and `vpt[5]` for panning - **This is correct** because pan is pure translation
- `resetCanvasZoom()` (line 575): Resets transform to identity before centering - **Now works correctly** with fixed `centerCanvasInView()`
- `applyCanvasZoom()` (line 230): Uses `canvas.zoomToPoint()` - **Already correct**

## Prevention

To prevent similar issues:
1. Always use Fabric.js APIs for zoom/pan operations
2. Only manually modify `viewportTransform` for pure translation (panning)
3. Test click selection after any viewport changes
4. Document coordinate system assumptions

## References

- [Fabric.js Transform Documentation](http://fabricjs.com/docs/)
- Fabric.js source: `fabric.Canvas.viewportTransform`
- Fabric.js source: `fabric.Canvas.viewportCenterObject()`
