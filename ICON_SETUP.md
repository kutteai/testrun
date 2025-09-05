# 🎨 Icon Setup Guide

This guide explains how to use your custom logo.png as the application icon for the PayCio Wallet browser extension.

## 📁 Files Generated

The following icon files are automatically generated from your `src/assets/logo.png`:

- `src/assets/icon16.png` (16x16) - Browser toolbar icon
- `src/assets/icon32.png` (32x32) - Browser toolbar icon (high DPI)
- `src/assets/icon48.png` (48x48) - Extension management page
- `src/assets/icon128.png` (128x128) - Chrome Web Store listing

## 🚀 Quick Setup

### Option 1: Complete Setup (Recommended)
```bash
npm run icons
```
This command will:
- Check and install dependencies (sharp library)
- Generate all required icon sizes from logo.png
- Update manifest files automatically

### Option 2: Step by Step
```bash
# Generate icons only
npm run icons:generate

# Update manifest files only
npm run icons:update
```

## 🔧 Manual Setup

If you prefer to run the scripts manually:

```bash
# Install sharp library (if not already installed)
npm install sharp

# Generate icons from logo.png
node scripts/generate-icons.js

# Update manifest files
node scripts/update-manifest-icons.js
```

## 📋 Requirements

- **Source Image**: `src/assets/logo.png` must exist
- **Dependencies**: Sharp library for image processing
- **Format**: PNG format recommended for best quality

## 🎯 Icon Specifications

| Size | Usage | File |
|------|-------|------|
| 16x16 | Browser toolbar (standard) | icon16.png |
| 32x32 | Browser toolbar (high DPI) | icon32.png |
| 48x48 | Extension management page | icon48.png |
| 128x128 | Chrome Web Store listing | icon128.png |

## 🔄 Regenerating Icons

To update your icons after changing logo.png:

```bash
npm run icons
```

## 📝 Manifest Configuration

The following manifest sections are automatically updated:

```json
{
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "assets/icon16.png",
      "32": "assets/icon32.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  }
}
```

## 🎨 Icon Generation Features

- **Transparent Background**: Icons maintain transparency
- **Aspect Ratio Preserved**: Original logo proportions maintained
- **High Quality**: Sharp library ensures crisp scaling
- **Automatic Sizing**: All required sizes generated automatically

## 🐛 Troubleshooting

### Sharp Library Issues
```bash
# Reinstall sharp
npm uninstall sharp
npm install sharp
```

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/*.js
```

### Missing logo.png
Ensure your logo file exists at: `src/assets/logo.png`

## 📦 Dependencies

- **sharp**: High-performance image processing library
- **Node.js**: Required for running the generation scripts

## 🔄 Workflow Integration

Add to your build process:

```json
{
  "scripts": {
    "prebuild": "npm run icons",
    "build": "webpack --mode production"
  }
}
```

This ensures icons are always up-to-date before building the extension.

## 💡 Tips

1. **Logo Design**: Use a square or near-square logo for best results
2. **File Size**: Keep logo.png under 1MB for faster processing
3. **Quality**: Use high-resolution source image (at least 128x128)
4. **Testing**: Always test icons in the browser after generation
5. **Version Control**: Commit generated icons to your repository

## 🎉 Success!

After running the setup, your PayCio Wallet extension will use your custom logo as the application icon across all browser interfaces!
