# PayCio Extension Loading Issue - Comprehensive Fix

## Problem
The extension keeps loading and stopping, likely due to multiple issues:

1. ✅ **FIXED**: Tabs API error in content script
2. 🔍 **INVESTIGATING**: Other runtime errors
3. 🔍 **INVESTIGATING**: Manifest permission issues
4. 🔍 **INVESTIGATING**: Build/compilation issues

## Solutions Applied

### 1. Fixed Runtime API Initialization
- Made all browser API getters lazy in `src/utils/runtime-utils.ts`
- Updated all files to use lazy API calls
- This prevents "Tabs API not available" errors

### 2. Files Updated
- ✅ `src/utils/runtime-utils.ts` - Made API getters lazy
- ✅ `src/content/index.ts` - Updated to use lazy APIs
- ✅ `src/background/index.ts` - Updated to use lazy APIs
- ✅ `src/components/screens/OptionsMenuScreen.tsx` - Updated to use lazy APIs

## Next Steps to Complete the Fix

### Step 1: Rebuild the Extension
```bash
# Clean previous build
npm run clean

# Rebuild for Chrome
npm run build:chrome

# Or rebuild for all browsers
npm run build:all
```

### Step 2: Reload Extension in Chrome
1. Go to `chrome://extensions/`
2. Find PayCio Wallet extension
3. Click the reload button (🔄)
4. Or remove and re-add the extension

### Step 3: Test the Fix
1. Open any webpage
2. Check browser console for errors
3. The "Tabs API not available" error should be gone
4. Extension should load and stay loaded

## Additional Debugging

If the issue persists after rebuilding:

### Check Browser Console
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for any remaining errors
4. Check both the webpage console and extension console

### Check Extension Console
1. Go to `chrome://extensions/`
2. Click "Inspect views: background page" for PayCio Wallet
3. Check for errors in the background script console

### Check Content Script
1. On any webpage, open DevTools
2. Look for PayCio-related errors in console
3. Check if content script is loading properly

## Expected Behavior After Fix
- ✅ No "Tabs API not available" errors
- ✅ Extension loads and stays loaded
- ✅ Content script runs without errors
- ✅ Background script runs without errors
- ✅ Popup opens without issues

## If Issues Persist
The problem might be:
1. **Build cache**: Try `npm run clean` before rebuilding
2. **Chrome cache**: Try incognito mode or clear browser data
3. **Other runtime errors**: Check console for additional errors
4. **Manifest issues**: Verify manifest.json is correct

## Test File
Use `test-content-script-fix.html` to verify the fix is working.
