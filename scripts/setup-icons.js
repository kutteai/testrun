#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up application icons from logo.png...\n');

// Step 1: Check if sharp is installed
console.log('📦 Checking dependencies...');
try {
  require('sharp');
  console.log('✅ Sharp library is available');
} catch (error) {
  console.log('❌ Sharp library not found. Installing...');
  try {
    execSync('npm install sharp', { stdio: 'inherit' });
    console.log('✅ Sharp library installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install sharp. Please run: npm install sharp');
    process.exit(1);
  }
}

// Step 2: Generate icons
console.log('\n🎨 Generating icons...');
try {
  execSync('node scripts/generate-icons.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to generate icons');
  process.exit(1);
}

// Step 3: Update manifest files
console.log('\n🔧 Updating manifest files...');
try {
  execSync('node scripts/update-manifest-icons.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to update manifest files');
  process.exit(1);
}

console.log('\n🎉 Icon setup complete!');
console.log('\n📋 What was done:');
console.log('   ✅ Generated icon16.png (16x16)');
console.log('   ✅ Generated icon32.png (32x32)');
console.log('   ✅ Generated icon48.png (48x48)');
console.log('   ✅ Generated icon128.png (128x128)');
console.log('   ✅ Updated manifest.json');
console.log('   ✅ Updated src/manifest-v3.json');

console.log('\n🔧 Next steps:');
console.log('   1. Run: npm run build (or your build command)');
console.log('   2. Load the extension in your browser');
console.log('   3. Verify the icons appear correctly');

console.log('\n💡 Tips:');
console.log('   - Icons are generated with transparent backgrounds');
console.log('   - All icons maintain the aspect ratio of your logo');
console.log('   - The 128x128 icon is used in the Chrome Web Store');
console.log('   - The 16x16 and 32x32 icons appear in the browser toolbar');
