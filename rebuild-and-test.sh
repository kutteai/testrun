#!/bin/bash

echo "🔧 PayCio Extension Rebuild and Test Script"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Step 1: Cleaning previous build..."
npm run clean

echo "🔨 Step 2: Rebuilding extension..."
npm run build:chrome

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo "🧪 Step 3: Testing extension..."
echo "Please follow these steps to test:"
echo ""
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select the 'dist/chrome' folder"
echo "4. Or if already loaded, click the reload button (🔄) on PayCio Wallet"
echo "5. Open any webpage and check the console for errors"
echo "6. The 'Tabs API not available' error should be gone"
echo ""
echo "📋 Test Checklist:"
echo "□ Extension loads without errors"
echo "□ No 'Tabs API not available' errors in console"
echo "□ Content script indicator appears on webpages"
echo "□ Popup opens when clicking extension icon"
echo "□ Background script runs without errors"
echo ""
echo "🔍 If issues persist:"
echo "- Check chrome://extensions/ for error details"
echo "- Open DevTools on any webpage and check console"
echo "- Try the test file: test-content-script-fix.html"
echo ""
echo "✅ Rebuild complete! Please test the extension now."
