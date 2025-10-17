# Testing Guide

## Installation Testing

### Step 1: Load Extension
1. Open Microsoft Edge
2. Navigate to `edge://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `Outlook-Copy` folder
6. Verify extension loads without errors

### Step 2: Check Manifest
1. Extension should appear with name "Outlook Copy Sender"
2. Version should show 1.7.0
3. No permission warnings should appear

## Functional Testing

### Test 1: Basic Copy Functionality
1. Go to https://outlook.office.com
2. Open any email
3. Look for "Copy sender" button near sender's name
4. Click the button
5. Expected: "✓ Sender email copied" toast appears
6. Paste in notepad (Ctrl+V)
7. Expected: Email address is pasted correctly

### Test 2: Keyboard Navigation
1. Open an email
2. Press Tab until "Copy sender" button is focused
3. Expected: Blue focus outline appears
4. Press Enter or Space
5. Expected: Email is copied, toast appears

### Test 3: Double-Click Prevention
1. Open an email
2. Click "Copy sender" button rapidly multiple times
3. Expected: Button becomes disabled during operation
4. Expected: Only one toast appears

### Test 4: Error Handling
1. Open an email without a visible sender
2. Click "Copy sender" button
3. Expected: "Could not find sender email" or "Looking up sender…" message

### Test 5: Dark Mode
1. Enable dark mode in Outlook
2. Open an email
3. Expected: Button has appropriate dark mode styling
4. Click button
5. Expected: Toast is visible with light background in dark mode

### Test 6: Multiple Outlook URLs
Test on:
- https://outlook.office.com
- https://outlook.live.com
- https://outlook.office365.com

Expected: Extension works on all URLs

## Accessibility Testing

### Test 7: Screen Reader
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate to "Copy sender" button
3. Expected: Button announces "Copy sender email"
4. Click button
5. Expected: Toast status is announced

### Test 8: High Contrast Mode
1. Enable high contrast mode in Windows/browser
2. Open an email
3. Expected: Button has 2px border
4. Expected: All elements are clearly visible

### Test 9: Reduced Motion
1. Enable reduced motion preference
2. Open email and click button
3. Expected: No animations, instant transitions

## Browser Console Testing

### Test 10: Debug Mode
1. Add `#ocsdebug` to Outlook URL
2. Open browser console (F12)
3. Open an email
4. Expected: Debug logs appear with [OCB] prefix
5. Click "Copy sender" button
6. Expected: "Copied email: [email]" appears in console

### Test 11: Error Console Check
1. Open browser console (F12)
2. Navigate Outlook normally
3. Open multiple emails
4. Click buttons
5. Expected: No JavaScript errors appear

## Performance Testing

### Test 12: Memory Leaks
1. Open browser console
2. Go to Memory tab
3. Take heap snapshot
4. Navigate through 20+ emails
5. Take another heap snapshot
6. Expected: No significant memory increase

### Test 13: Rapid Navigation
1. Quickly open and close 10 emails in succession
2. Expected: Extension keeps working smoothly
3. Expected: Buttons appear/disappear correctly

## Edge Cases

### Test 14: Email Formats
Test with emails containing:
- john@example.com (simple)
- john.doe+tag@example.com (with + sign)
- JOHN@EXAMPLE.COM (uppercase)
- john@subdomain.example.com (subdomain)

Expected: All formats are copied correctly in lowercase

### Test 15: Missing Email
1. Find email without visible sender address
2. Click "Copy sender" button
3. Expected: Persona hover extraction is attempted
4. Expected: Appropriate error message if not found

## Regression Testing

### Test 16: SPA Navigation
1. Open an email
2. Click back to inbox
3. Open another email
4. Expected: Button appears correctly
5. Expected: No duplicate buttons

### Test 17: Multiple Headers
1. Open an email with replies/forwards
2. Expected: Button appears only once on main header
3. Expected: Button works correctly

## Sign-Off Checklist

- [ ] All functional tests pass
- [ ] Accessibility tests pass
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Works on all Outlook URLs
- [ ] Dark mode works
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Debug mode works
- [ ] No memory leaks detected
