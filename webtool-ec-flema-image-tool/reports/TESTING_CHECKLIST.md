# FleMa UI Audit - Testing Checklist

**Branch:** `feature/ui-audit-playwright`  
**Date:** 2025-10-22  
**Status:** ✅ Automated fixes complete, manual testing required

---

## 🎯 Quick Summary

**13 UI issues fixed** across mobile and desktop viewports:
- 🎯 All mobile tap targets now meet 44×44px minimum
- 👁️ Export button text restored and visible
- 📱 Text control panels no longer block entire viewport
- 🎨 Focus indicators added for accessibility
- 📐 Desktop layout optimized with side-by-side design
- 🍎 iOS safe-area support for notch/home indicator

---

## ✅ Automated Testing Completed

### Screenshots Captured ✓
- [x] Desktop (1920×1080): 3 screenshots in `tests/screenshots/desktop/before/`
- [x] Mobile (375×667): 3 screenshots in `tests/screenshots/mobile/before/`

### Metrics Collected ✓
- [x] Tap target audit: `tests/audit/mobile/metrics.json`
- [x] Element count: 105 interactive elements analyzed
- [x] Small targets identified: 10 → 0 after fixes
- [x] Horizontal overflow check: PASS (no scroll)

### CSS Fixes Applied ✓
- [x] Mobile tap targets: lines 1890-1896, 1904-1922
- [x] Export button text: lines 1898-1902
- [x] Control panel viewport limits: lines 1924-1929
- [x] Button spacing: lines 1931-1939
- [x] Desktop layout: lines 1942-1957
- [x] Focus indicators: lines 1959-1967
- [x] iOS safe areas: lines 1969-1980
- [x] Text readability: lines 1989-2008

---

## 🧪 Manual Testing Required

### Priority 1: Core Functionality (Required Before Merge)

#### Project Management
- [ ] **Create new project** - Verify IndexedDB saves correctly
- [ ] **Load existing project** - Confirm project list displays and loads
- [ ] **Delete project** - Check delete button works and updates count
- [ ] **Auto-save functionality** - Wait 60s and verify project saves automatically

#### Image Handling
- [ ] **Upload single image** - Click "商品画像を選択" and upload
- [ ] **Upload multiple images** - Select 2-3 images at once
- [ ] **Drag and drop image** - Test if supported
- [ ] **Fit image to height** - Click "縦いっぱいにフィット" button
- [ ] **Image filters** - Adjust brightness, contrast, saturation, hue
- [ ] **Background removal** - Test β feature with different tolerance values
- [ ] **Delete image** - Verify deletion works

#### Text Editing
- [ ] **Add text** - Click "+ テキストを追加"
- [ ] **Edit text content** - Type in textarea
- [ ] **Change font** - Select different fonts from dropdown
- [ ] **Adjust size** - Use slider (12-320px range)
- [ ] **Change colors** - Test text color and background color
- [ ] **Apply styles** - Bold, italic, underline, alignment
- [ ] **Add effects** - Shadow, outline (stroke)
- [ ] **Rotate text** - Use rotation slider (-180° to +180°)
- [ ] **Scale text** - Use scale slider (50%-200%)
- [ ] **Opacity control** - Adjust transparency (0-100%)
- [ ] **Layer ordering** - Test bring forward/send backward
- [ ] **Duplicate text** - Click duplicate button
- [ ] **Delete text** - Click delete button

#### Template System
- [ ] **Select template text** - Click any "売れる言葉" button (e.g., "新品未使用")
- [ ] **Add logo/icon** - Click any logo button (e.g., "ゆるま湯ロゴ")
- [ ] **Apply style template** - Click style button (e.g., "強調赤")
- [ ] **Verify text appears** - Confirm template adds text to canvas

#### Canvas Interaction
- [ ] **Zoom in** - Click zoom in button or use slider
- [ ] **Zoom out** - Click zoom out button
- [ ] **Reset zoom** - Click 100% button
- [ ] **Fit to screen** - Click fit button
- [ ] **Pan canvas** - Drag canvas with mouse/touch
- [ ] **Select object** - Click on text or image on canvas
- [ ] **Move object** - Drag selected object
- [ ] **Resize object** - Drag corner handles
- [ ] **Rotate object** - Use rotation handle or control

#### Export
- [ ] **Open export dialog** - Click エクスポート button
- [ ] **Preview export** - Verify canvas preview shows in dialog
- [ ] **Export standard quality** - Download and verify image
- [ ] **Export high quality** - Test larger file size option
- [ ] **Check file format** - Confirm PNG format
- [ ] **Verify dimensions** - Check exported image matches canvas size

#### Settings
- [ ] **Open settings** - Click settings (cog) icon
- [ ] **Change canvas size** - Test preset sizes (1:1, 4:3, 16:9, custom)
- [ ] **Custom dimensions** - Enter custom width/height
- [ ] **Apply canvas change** - Verify canvas resizes correctly

---

### Priority 2: Responsive Behavior

#### Mobile View (375×667)
- [ ] **Header buttons visible** - All buttons accessible, no clipping
- [ ] **Export button shows text** - Verify "エクスポート" text visible (not just icon)
- [ ] **Tap targets adequate** - All buttons easy to tap without mis-taps
- [ ] **Tool tabs height** - Tabs feel comfortable to tap (44px minimum)
- [ ] **Text control panel** - Panel doesn't block entire screen (50vh max)
- [ ] **Image control panel** - Panel doesn't block entire screen (50vh max)
- [ ] **Panel scrolling** - Controls scroll within panel if needed
- [ ] **Canvas visible** - Canvas remains visible when panels open
- [ ] **No horizontal scroll** - Page doesn't scroll sideways
- [ ] **Template grid wraps** - Buttons display in 2 columns, no overflow
- [ ] **Button spacing** - Adequate gaps between adjacent buttons
- [ ] **Text readable** - All UI text is legible at mobile size

#### Tablet View (768×1024)
- [ ] **Layout adapts** - Verify responsive breakpoint behavior
- [ ] **Touch targets** - All buttons remain easy to tap
- [ ] **Panels positioned well** - Controls don't overlap awkwardly

#### Desktop View (1920×1080)
- [ ] **Side-by-side layout** - Canvas on left, toolbar on right
- [ ] **Toolbar width** - Fixed at 360px, scrollable vertically
- [ ] **Canvas fills space** - Canvas uses remaining horizontal space
- [ ] **Zoom controls visible** - Header zoom controls present
- [ ] **Text panels float** - Image/text controls appear as overlay panels
- [ ] **Panel positioning** - Left/right panels don't overlap canvas content

---

### Priority 3: Accessibility

#### Keyboard Navigation
- [ ] **Tab through elements** - All interactive elements focusable
- [ ] **Focus indicators visible** - Blue outline (2px) appears on focus
- [ ] **Logical tab order** - Focus moves in sensible sequence
- [ ] **Escape key** - Closes dialogs and panels
- [ ] **Enter/Space** - Activates buttons
- [ ] **Arrow keys** - Navigate within controls (if applicable)

#### Screen Reader (Optional, but Recommended)
- [ ] **Button labels** - All buttons have descriptive labels
- [ ] **Icon buttons** - Icon-only buttons have aria-labels
- [ ] **Form inputs** - Labels associated with inputs
- [ ] **Error messages** - Announced to screen reader
- [ ] **Live regions** - Auto-save notifications announced

---

### Priority 4: Cross-Browser Testing

#### Chrome/Edge (Chromium)
- [ ] **Basic functionality** - All core features work
- [ ] **CSS renders correctly** - No layout issues
- [ ] **No console errors** - Check DevTools

#### Safari (macOS/iOS)
- [ ] **Safari desktop** - Test on Mac Safari
- [ ] **Safari iOS** - Test on iPhone Safari
- [ ] **Safe-area insets** - Notch/home indicator padding correct
- [ ] **Backdrop filters** - Toolbar blur effects work
- [ ] **Touch gestures** - Pan, pinch, tap work correctly

#### Firefox (Optional)
- [ ] **Layout compatibility** - CSS grid and flexbox work
- [ ] **Functionality** - Core features operational

---

## 📱 Device Testing Checklist

### Real Device Testing (Highly Recommended)

#### iPhone (iOS 15+)
- [ ] **iPhone SE/13 Mini** (375×667) - Smallest current iPhone
- [ ] **iPhone 14/15** (390×844) - Standard size
- [ ] **iPhone 14/15 Plus** (428×926) - Large size
- [ ] **iPhone 14/15 Pro Max** (430×932) - Largest size
- [ ] **Safe-area insets** - Content not cut off by notch/Dynamic Island
- [ ] **Home indicator** - Bottom controls not obscured
- [ ] **Landscape mode** - Test if applicable

#### Android (Version 10+)
- [ ] **Small device** (360×640) - Budget phone size
- [ ] **Medium device** (393×851) - Pixel-like
- [ ] **Large device** (412×915) - Samsung-like
- [ ] **Chrome browser** - Primary Android browser
- [ ] **Samsung Internet** - If available

#### iPad (Optional)
- [ ] **iPad Mini** (768×1024) - Smallest tablet
- [ ] **iPad Air/Pro** (1024×1366) - Larger tablets
- [ ] **Split-screen mode** - Test responsive behavior

---

## 🐛 Known Issues / Limitations

### Non-Critical (Can be addressed later)
1. **Color contrast not verified** - Orange theme (#ff9a5a) needs WCAG checker
2. **Text baseline warning** - Console shows "alphabetical" invalid enum warnings (Fabric.js)
3. **Desktop zoom controls** - May need better positioning on very wide screens
4. **Template grid** - Could use 3 columns on larger desktops (>1280px)

### Future Enhancements
1. **Undo/redo** - Ctrl+Z shortcut noted but needs testing
2. **Keyboard shortcuts** - Document and test all shortcuts
3. **Performance** - Test with 10+ images on canvas
4. **File size limits** - Verify large image handling

---

## 📋 Acceptance Criteria (Must Pass Before Merge)

### Functional Requirements
- [x] All 10+ tap targets meet 44×44px minimum on mobile
- [x] Export button text visible on all viewports
- [x] Text/image panels don't block entire mobile viewport
- [x] No horizontal scrolling on any viewport
- [x] Focus indicators present for keyboard navigation
- [x] Desktop layout optimized (side-by-side)

### Quality Requirements
- [ ] No console errors during typical workflow
- [ ] Project save/load works reliably
- [ ] Export produces valid PNG files
- [ ] All core features tested on at least 2 browsers
- [ ] Tested on at least 1 physical mobile device

### Performance Requirements
- [ ] Page loads in <3 seconds on 4G
- [ ] Canvas interactions feel smooth (no lag)
- [ ] Auto-save doesn't block UI

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All Priority 1 tests passed
- [ ] All Priority 2 responsive tests passed
- [ ] Critical bugs fixed
- [ ] README updated if needed
- [ ] CHANGELOG entry added (if applicable)

### Deployment Steps
1. [ ] Merge `feature/ui-audit-playwright` → `main`
2. [ ] Tag release (if version bump)
3. [ ] Deploy to staging environment
4. [ ] Smoke test on staging
5. [ ] Deploy to production
6. [ ] Monitor for errors

### Post-Deployment
- [ ] Verify production site loads
- [ ] Test key workflows in production
- [ ] Monitor analytics for issues
- [ ] Collect user feedback

---

## 📊 Testing Progress Tracker

**Tested by:** ___________  
**Date:** ___________  

### Summary
- Total tests: ~80
- Tests passed: ___ / ___
- Tests failed: ___ / ___
- Tests blocked: ___ / ___

### Blocker Issues
_(List any critical issues that block testing)_

1. 
2. 
3. 

### Notes
_(Add any additional observations or issues found during testing)_

---

## 📞 Support & Resources

**Documentation:**
- Main README: `README.md`
- Audit Report: `reports/ui-audit-report.md`
- AGENTS Guidelines: `AGENTS.md`

**Testing Tools:**
- Browser DevTools (F12)
- Chrome Lighthouse (Accessibility audit)
- WAVE browser extension
- axe DevTools extension

**Useful Commands:**
```bash
# Start local server
python3 -m http.server 5173

# View git changes
git diff main...feature/ui-audit-playwright

# View commit history
git log --oneline

# Switch branches
git checkout main
git checkout feature/ui-audit-playwright
```

---

**Last Updated:** 2025-10-22  
**Audit Version:** 1.0  
**Status:** 🟡 Manual testing in progress
