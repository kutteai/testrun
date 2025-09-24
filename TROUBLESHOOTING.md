# Paycio Wallet Extension Troubleshooting Guide

## Issue: Content Script Not Loading

### Symptoms
- ✅ `window.ethereum` found (MetaMask is working)
- ❌ `window.paycio` not found
- Manual injection works fine

### Root Cause
The content script is not being injected by the extension, likely due to:
1. Extension not properly loaded
2. Content script conflicts
3. Extension permissions issues
4. Browser security policies

## Solutions

### Solution 1: Verify Extension Loading

1. **Check Extension Status**
   - Go to `chrome://extensions/`
   - Find "PayCio Wallet"
   - Ensure it's **enabled** (toggle should be blue)
   - Check for any error messages

2. **Reload Extension**
   - Click the reload button (🔄) on the PayCio extension
   - Or remove and re-add the extension

3. **Check Extension Files**
   - Verify `content-script-enhanced.js` exists in `dist/chrome/`
   - Check manifest.json has correct content script configuration

### Solution 2: Manual Content Script Injection

If the extension content script isn't working, you can manually inject the provider:

1. **Open Browser Console** (F12)
2. **Run this script**:
   ```javascript
   // Copy and paste the contents of manual-paycio-injection.js
   // Or run the file directly
   ```

3. **Test Detection**:
   ```javascript
   console.log('window.paycio:', window.paycio);
   console.log('window.paycio.isPaycio:', window.paycio?.isPaycio);
   ```

### Solution 3: Alternative Content Script Approach

If the current content script isn't working, try this approach:

1. **Create a new content script** that uses a different injection method
2. **Use web accessible resources** instead of direct injection
3. **Implement a fallback mechanism** that detects if the content script failed

### Solution 4: Extension Permissions

1. **Check Host Permissions**
   - Go to `chrome://extensions/`
   - Click "Details" on PayCio extension
   - Ensure "Access your data on all websites" is enabled

2. **Check Content Script Permissions**
   - Verify manifest.json has correct `host_permissions`
   - Ensure `content_scripts` configuration is correct

### Solution 5: Browser Security

1. **Disable Other Extensions**
   - Temporarily disable MetaMask and other wallet extensions
   - Test if PayCio works without conflicts

2. **Check CSP (Content Security Policy)**
   - Some sites may block extension content scripts
   - Test on different websites (localhost, simple HTML pages)

## Testing Steps

### Step 1: Basic Extension Test
```javascript
// In browser console
console.log('Chrome extension API:', typeof chrome);
console.log('Extension ID:', chrome?.runtime?.id);
```

### Step 2: Content Script Test
```javascript
// Check if content script is loaded
console.log('Content script loaded:', window.paycioProviderReady);
console.log('Paycio provider:', window.paycio);
```

### Step 3: Manual Injection Test
```javascript
// Run manual injection script
// (Use manual-paycio-injection.js)
```

### Step 4: Provider Detection Test
```javascript
// Test provider detection
console.log('Ethereum provider:', window.ethereum);
console.log('Paycio provider:', window.paycio);
console.log('Providers array:', window.ethereum?.providers);
```

## Expected Results

After successful injection:
- ✅ `window.paycio` should be defined
- ✅ `window.paycio.isPaycio` should be `true`
- ✅ `window.ethereum` should include Paycio in providers array
- ✅ EIP-6963 announcements should work
- ✅ Provider should be detectable by dApps

## Common Issues

### Issue 1: Extension Not Loading
**Solution**: Reload extension, check permissions, verify manifest

### Issue 2: Content Script Conflicts
**Solution**: Disable other extensions, check for conflicts

### Issue 3: CSP Violations
**Solution**: Test on different sites, use alternative injection methods

### Issue 4: Timing Issues
**Solution**: Use `document_start` timing, add delays, implement retry logic

## Debug Commands

```javascript
// Check extension status
chrome.runtime.getManifest();

// Check content scripts
chrome.scripting.getRegisteredContentScripts();

// Check permissions
chrome.permissions.getAll();

// Manual provider injection
// (Use manual-paycio-injection.js)
```

## Next Steps

1. **Try Solution 1** (verify extension loading)
2. **If that fails, try Solution 2** (manual injection)
3. **If manual injection works, the issue is with the content script**
4. **If manual injection fails, the issue is with the provider logic**

Report back with:
- Extension status (enabled/disabled)
- Console errors
- Results of manual injection test
- Which solution worked (if any)
