#!/bin/bash

echo "🔧 Quick fix for injected script..."

# Build just the injected script
echo "📦 Building injected script..."
npx webpack --config webpack.config.js --entry ./src/injected/index.ts --output-path ./dist/chrome --output-filename injected.js --mode production

if [ $? -eq 0 ]; then
    echo "✅ Injected script rebuilt successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Reload the extension in Chrome (chrome://extensions/)"
    echo "2. Test with check-extension-status.html"
    echo "3. The PayCio provider should now be detected!"
else
    echo "❌ Build failed!"
    exit 1
fi
