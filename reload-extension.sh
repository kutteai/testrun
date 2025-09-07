#!/bin/bash

echo "🔄 Reloading PayCio Wallet Extension..."

# Build the extension
echo "📦 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Find 'PayCio Wallet' extension"
    echo "3. Click the reload button (🔄) on the extension card"
    echo "4. Or remove and re-add the extension from dist/chrome/"
    echo ""
    echo "🧪 Test the extension:"
    echo "- Open debug-extension-loading.html in Chrome"
    echo "- Check if PayCio provider is detected"
    echo "- Test connection with test-infura-connection.html"
else
    echo "❌ Build failed!"
    exit 1
fi