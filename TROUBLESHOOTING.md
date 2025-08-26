# PayCio Wallet Troubleshooting Guide

## Issue: dApps Cannot See Your Wallet

If dApps are not detecting your PayCio Wallet, follow these steps to diagnose and fix the issue.

## Step 1: Verify Extension Installation

1. **Check if the extension is installed:**
   - Open Chrome and go to `chrome://extensions/`
   - Look for "PayCio Wallet" in the list
   - Make sure it's enabled (toggle switch is ON)

2. **Check extension permissions:**
   - Click on "Details" for PayCio Wallet
   - Ensure it has permission to access "All sites"
   - If not, click "Site access" and select "On all sites"

## Step 2: Test the Extension

1. **Open the test page:**
   - Open `wallet-test.html` in your browser
   - Or go to any website and open the browser console

2. **Run the debug script:**
   - Copy the contents of `debug-wallet.js`
   - Paste it into the browser console and press Enter
   - Check the output for any errors

## Step 3: Common Issues and Solutions

### Issue 1: Content Script Not Running
**Symptoms:** `Content script running: false` in debug output

**Solutions:**
- Reload the extension: Go to `chrome://extensions/`, find PayCio Wallet, and click the refresh icon
- Restart the browser
- Check if there are any console errors in the extension's background page

### Issue 2: Ethereum Provider Not Found
**Symptoms:** `Ethereum provider exists: false` in debug output

**Solutions:**
- Make sure the extension is enabled
- Check if another wallet extension is conflicting
- Try disabling other wallet extensions temporarily

### Issue 3: Provider Not Recognized as PayCio Wallet
**Symptoms:** `isPayCio Wallet: false` in debug output

**Solutions:**
- The extension may not be properly injected
- Try refreshing the page
- Check if the site has Content Security Policy restrictions

### Issue 4: No Accounts Found
**Symptoms:** `No accounts found - wallet may not be set up`

**Solutions:**
- Open the PayCio Wallet extension popup
- Create or import a wallet if you haven't already
- Make sure the wallet is unlocked

## Step 4: Manual Testing

### Test 1: Basic Detection
```javascript
// Run this in browser console
console.log('Content script:', window.paycioWalletContentScript?.isRunning);
console.log('Ethereum provider:', !!window.ethereum);
console.log('Is PayCio Wallet:', window.ethereum?.isPayCioWallet);
```

### Test 2: Wallet Connection
```javascript
// Run this in browser console
if (window.ethereum) {
  window.ethereum.request({ method: 'eth_accounts' })
    .then(accounts => console.log('Accounts:', accounts))
    .catch(error => console.error('Error:', error));
}
```

### Test 3: Provider Methods
```javascript
// Run this in browser console
if (window.ethereum) {
  const methods = ['request', 'send', 'enable', 'on'];
  methods.forEach(method => {
    console.log(`${method}:`, typeof window.ethereum[method] === 'function');
  });
}
```

## Step 5: Advanced Troubleshooting

### Check Extension Logs
1. Go to `chrome://extensions/`
2. Find PayCio Wallet and click "Details"
3. Click "Service Worker" to open the background page
4. Check the console for any errors

### Check Content Script Logs
1. Open any webpage
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for messages starting with "PayCio Wallet"

### Test on Different Sites
- Try the extension on different websites
- Some sites may have restrictions that prevent wallet injection
- Test on simple sites like `example.com` first

## Step 6: Reinstall Extension

If nothing else works:

1. **Remove the extension:**
   - Go to `chrome://extensions/`
   - Find PayCio Wallet and click "Remove"

2. **Clear browser data:**
   - Go to `chrome://settings/clearBrowserData`
   - Clear "Cached images and files"

3. **Reinstall the extension:**
   - Load the unpacked extension from the `dist/chrome` folder
   - Or install from the zip file

## Step 7: Check for Conflicts

### Other Wallet Extensions
- MetaMask, Trust Wallet, or other wallet extensions may conflict
- Try disabling other wallet extensions temporarily
- Check if the site is specifically looking for MetaMask

### Browser Security Settings
- Check if you have strict security settings enabled
- Some corporate networks may block extensions
- Try in an incognito/private window

## Step 8: Verify Build

Make sure the extension is properly built:

```bash
# Rebuild the extension
yarn build

# Check if files exist
ls -la dist/chrome/
```

## Common Error Messages

### "Extension context invalidated"
- The extension was reloaded while the page was open
- **Solution:** Refresh the page

### "Content script not found"
- The extension files are missing or corrupted
- **Solution:** Reinstall the extension

### "Permission denied"
- The extension doesn't have permission to access the site
- **Solution:** Check site permissions in extension settings

### "Request timeout"
- The background script is not responding
- **Solution:** Check background script logs and restart extension

## Still Having Issues?

If you're still experiencing problems:

1. **Check the console output** from the debug script
2. **Look for specific error messages** in the browser console
3. **Try on a different browser** (Firefox, Edge)
4. **Test with a simple dApp** like Uniswap or OpenSea
5. **Check if the issue is site-specific** or affects all dApps

## Support

If none of these steps resolve the issue, please provide:
- The exact error messages you're seeing
- The output from the debug script
- The browser and version you're using
- The specific dApp that's not working
