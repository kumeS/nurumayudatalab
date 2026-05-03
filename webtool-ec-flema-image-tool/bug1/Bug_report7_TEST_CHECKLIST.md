# Bug Report 7 - Test Checklist

## Test Environment Setup

### Before Testing
- [ ] Open browser developer console (F12)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Navigate to `index.html`
- [ ] Verify application loads without errors
- [ ] Check console for any JavaScript errors

---

## 🎯 PRIORITY 1: Core Functionality Tests (CRITICAL)

### Test 1.1: Image Object on Template Tab
**Objective**: Verify clicking image shows image controls regardless of active tab

**Steps**:
1. [ ] Click "Upload Image" button
2. [ ] Add an image to canvas
3. [ ] Click "Add Text" button
4. [ ] Add text to canvas
5. [ ] Click "売れる装飾" (template/decoration) tab
6. [ ] Click the IMAGE object on canvas

**Expected Results**:
- [ ] ✅ Image controls appear in right sidebar (brightness, contrast, rotation, filters)
- [ ] ✅ Text controls are hidden
- [ ] ✅ Console shows: `[Bug7 Fix] Image object selected, showing image controls`
- [ ] ✅ Image has selection border (active selection)
- [ ] ✅ Can interact with image controls immediately

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 1.2: Text Object on Image Tab
**Objective**: Verify clicking text shows text controls regardless of active tab

**Steps**:
1. [ ] Click "Add Text" button
2. [ ] Add text to canvas
3. [ ] Click "Upload Image" button
4. [ ] Add an image to canvas
5. [ ] Click "商品画像" (product image) tab
6. [ ] Click the TEXT object on canvas

**Expected Results**:
- [ ] ✅ Text controls appear in right sidebar (font, color, size, alignment, content)
- [ ] ✅ Image controls are hidden
- [ ] ✅ Console shows: `[Bug7 Fix] Text object selected, showing text controls`
- [ ] ✅ Text has selection border (active selection)
- [ ] ✅ Can interact with text controls immediately

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 1.3: Rapid Object Type Switching
**Objective**: Verify instant control switching with rapid clicks

**Steps**:
1. [ ] Create canvas with 3 images and 3 text objects
2. [ ] Stay on any tab (don't switch tabs during test)
3. [ ] Rapidly click in this sequence:
   - [ ] Click Image 1 → Verify image controls shown
   - [ ] Click Text 1 → Verify text controls shown
   - [ ] Click Image 2 → Verify image controls shown
   - [ ] Click Text 2 → Verify text controls shown
   - [ ] Click Image 3 → Verify image controls shown
   - [ ] Click Text 3 → Verify text controls shown

**Expected Results**:
- [ ] ✅ Each click instantly shows correct controls
- [ ] ✅ No lag or delay in control switching
- [ ] ✅ No incorrect controls displayed
- [ ] ✅ Console shows correct log for each click
- [ ] ✅ Previous controls properly hidden before new ones shown

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

## 🔍 PRIORITY 2: Edge Case Tests (IMPORTANT)

### Test 2.1: Empty Canvas Click (Deselection)
**Objective**: Verify clicking empty canvas hides all controls

**Steps**:
1. [ ] Create canvas with image and text
2. [ ] Click image object (image controls shown)
3. [ ] Click on empty canvas area (not on any object)
4. [ ] Verify controls hidden
5. [ ] Click text object (text controls shown)
6. [ ] Press Escape key
7. [ ] Verify controls hidden

**Expected Results**:
- [ ] ✅ All controls hidden when clicking empty canvas
- [ ] ✅ All controls hidden when pressing Escape
- [ ] ✅ No console errors
- [ ] ✅ No controls remain visible
- [ ] ✅ Canvas is in neutral state

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 2.2: Multi-Selection Behavior
**Objective**: Verify multi-selection hides all controls

**Steps**:
1. [ ] Create canvas with 3 images
2. [ ] Click first image (image controls shown)
3. [ ] Hold Ctrl/Cmd and click second image (multi-select)
4. [ ] Verify all controls hidden
5. [ ] Click single image again
6. [ ] Verify image controls shown
7. [ ] Drag-select multiple text objects
8. [ ] Verify all controls hidden

**Expected Results**:
- [ ] ✅ Multi-selection hides all controls (activeSelection type)
- [ ] ✅ Console shows: `[Bug7 Fix] Other object type selected: activeSelection` (or controls hidden)
- [ ] ✅ Single selection after multi-select shows correct controls
- [ ] ✅ No console errors
- [ ] ✅ Selection UI shows multiple objects selected

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 2.3: Tab Switch During Object Selection
**Objective**: Document behavior when switching tabs with object selected

**Steps**:
1. [ ] Click image object (image controls shown)
2. [ ] Switch to "売れる装飾" tab
3. [ ] Document: Do controls stay visible or hide?
4. [ ] Click same image again
5. [ ] Verify image controls shown regardless of tab
6. [ ] Switch to "商品画像" tab
7. [ ] Click text object
8. [ ] Verify text controls shown regardless of tab

**Expected Results**:
- [ ] ✅ Controls may hide on tab switch (document actual behavior)
- [ ] ✅ Re-clicking object shows correct controls regardless of current tab
- [ ] ✅ Object type determines controls, not tab
- [ ] ✅ No console errors

**Actual Results**: _________________

**Behavior on Tab Switch**: [ ] Controls Stay [ ] Controls Hide

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 2.4: Unknown Object Type Handling
**Objective**: Verify graceful handling of future object types

**Steps**:
1. [ ] If there are any other object types (logos, shapes, etc.), click them
2. [ ] Verify console message
3. [ ] Verify all controls hidden
4. [ ] Verify no errors

**Expected Results**:
- [ ] ✅ Console shows: `[Bug7 Fix] Other object type selected: [type]`
- [ ] ✅ All controls hidden
- [ ] ✅ No JavaScript errors
- [ ] ✅ Application remains stable

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL [ ] N/A (no other object types)

**Notes**: _________________

---

## ⚙️ PRIORITY 3: Regression Tests (CRITICAL)

### Test 3.1: Image Editing Functionality
**Objective**: Verify all image editing features still work

**Steps**:
1. [ ] Click image object
2. [ ] Verify image controls appear
3. [ ] Test brightness slider → Verify image brightness changes
4. [ ] Test contrast slider → Verify image contrast changes
5. [ ] Click rotation buttons → Verify image rotates
6. [ ] Apply blur filter → Verify filter applied
7. [ ] Apply grayscale filter → Verify filter applied
8. [ ] Reset all adjustments → Verify image returns to original

**Expected Results**:
- [ ] ✅ All image controls work correctly
- [ ] ✅ Real-time preview of changes
- [ ] ✅ Changes persist after deselection
- [ ] ✅ No console errors
- [ ] ✅ Undo/redo works for image adjustments

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 3.2: Text Editing Functionality
**Objective**: Verify all text editing features still work

**Steps**:
1. [ ] Click text object
2. [ ] Verify text controls appear
3. [ ] Change font family → Verify font changes
4. [ ] Change font size → Verify size changes
5. [ ] Change text color → Verify color changes
6. [ ] Change text alignment → Verify alignment changes
7. [ ] Edit text content → Verify content updates
8. [ ] Apply bold/italic → Verify styling applied

**Expected Results**:
- [ ] ✅ All text controls work correctly
- [ ] ✅ Real-time preview of changes
- [ ] ✅ Changes persist after deselection
- [ ] ✅ No console errors
- [ ] ✅ Undo/redo works for text changes

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 3.3: Core Application Features
**Objective**: Verify no regression in other features

**Steps**:
1. [ ] Test Undo (Ctrl+Z) → Verify works correctly
2. [ ] Test Redo (Ctrl+Y) → Verify works correctly
3. [ ] Test object deletion (Delete key) → Verify object deleted, controls hidden
4. [ ] Test object duplication (Ctrl+D) → Verify duplicated correctly
5. [ ] Test layer ordering (bring front, send back) → Verify works
6. [ ] Test save project → Verify saves correctly
7. [ ] Test load project → Verify loads correctly
8. [ ] Test canvas zoom (zoom slider) → Verify works
9. [ ] Test canvas pan (drag canvas) → Verify works

**Expected Results**:
- [ ] ✅ All features work as before
- [ ] ✅ No console errors
- [ ] ✅ No broken functionality
- [ ] ✅ Object controls update correctly after operations

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

### Test 3.4: Tab Switching Functionality
**Objective**: Verify tab switching still works correctly

**Steps**:
1. [ ] Click "商品画像" tab → Verify tab switches, panel updates
2. [ ] Click "売れる装飾" tab → Verify tab switches, panel updates
3. [ ] Verify tab content updates correctly
4. [ ] Verify no console errors during tab switches

**Expected Results**:
- [ ] ✅ Tabs switch correctly
- [ ] ✅ Tab panels update correctly
- [ ] ✅ No console errors
- [ ] ✅ No broken UI elements

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

## 🌐 PRIORITY 4: Cross-Browser Testing (IMPORTANT)

### Browser Test Matrix

Test Priority 1, 2, and 3 scenarios on each browser:

#### Desktop Browsers

**Chrome/Edge (Windows)**
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Test 1.3: [ ] PASS [ ] FAIL
- [ ] Regression: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

**Chrome/Edge (macOS)**
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Test 1.3: [ ] PASS [ ] FAIL
- [ ] Regression: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

**Firefox (Windows/macOS)**
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Test 1.3: [ ] PASS [ ] FAIL
- [ ] Regression: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

**Safari (macOS)**
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Test 1.3: [ ] PASS [ ] FAIL
- [ ] Regression: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

#### Mobile Browsers

**Safari (iOS)**
- [ ] Device: _______
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Touch interaction: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

**Chrome (Android)**
- [ ] Device: _______
- [ ] Version: _______
- [ ] Test 1.1: [ ] PASS [ ] FAIL
- [ ] Test 1.2: [ ] PASS [ ] FAIL
- [ ] Touch interaction: [ ] PASS [ ] FAIL
- [ ] Notes: _________________

---

## 🔬 PRIORITY 5: Performance Testing (OPTIONAL)

### Test 5.1: Performance Impact
**Objective**: Verify no performance degradation

**Steps**:
1. [ ] Create canvas with 20+ objects (mix of images and text)
2. [ ] Rapidly click between objects
3. [ ] Monitor browser performance (CPU, memory)
4. [ ] Check for any lag or delay

**Expected Results**:
- [ ] ✅ Instant control switching (<50ms)
- [ ] ✅ No visible lag
- [ ] ✅ No memory leaks
- [ ] ✅ Smooth user experience

**Actual Results**: _________________

**Status**: [ ] PASS [ ] FAIL

**Notes**: _________________

---

## 📊 Test Summary

### Overall Results

**Total Tests Run**: _____ / 17

**Tests Passed**: _____

**Tests Failed**: _____

**Critical Issues Found**: _____

**Minor Issues Found**: _____

### Critical Test Results
- [ ] Test 1.1 (Image on Template Tab): [ ] PASS [ ] FAIL
- [ ] Test 1.2 (Text on Image Tab): [ ] PASS [ ] FAIL
- [ ] Test 3.1 (Image Editing): [ ] PASS [ ] FAIL
- [ ] Test 3.2 (Text Editing): [ ] PASS [ ] FAIL
- [ ] Test 3.3 (Core Features): [ ] PASS [ ] FAIL

### Issues Found

#### Critical Issues (Block Deployment)
1. _________________
2. _________________

#### Minor Issues (Can Deploy)
1. _________________
2. _________________

### Browser Compatibility
- [ ] Chrome/Edge: Compatible
- [ ] Firefox: Compatible
- [ ] Safari (Desktop): Compatible
- [ ] Safari (iOS): Compatible
- [ ] Chrome (Android): Compatible

### Final Recommendation

**Status**: [ ] ✅ READY FOR DEPLOYMENT [ ] ⚠️ NEEDS FIXES [ ] ❌ MAJOR ISSUES

**Notes**: _________________

**Tested By**: _________________

**Test Date**: _________________

**Deployment Approval**: [ ] Approved [ ] Rejected

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. [ ] Review test results with team
2. [ ] Proceed to deployment preparation
3. [ ] Follow Bug_report7_DEPLOYMENT_GUIDE.md
4. [ ] Monitor production after deployment

### If Tests Fail ❌
1. [ ] Document all failures in detail
2. [ ] Create bug report for each issue
3. [ ] Review Bug_report7_IMPLEMENTATION_LOG.md
4. [ ] Fix issues and re-test
5. [ ] Consider rollback if critical issues found

---

## 📝 Notes and Observations

### General Observations
_________________

### Unexpected Behavior
_________________

### Recommendations
_________________

### User Experience Notes
_________________
