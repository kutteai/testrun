#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const manifestFiles = [
  'manifest.json',
  'src/manifest-v3.json',
];

const iconConfig = {
  16: 'assets/icon16.png',
  32: 'assets/icon32.png',
  48: 'assets/icon48.png',
  128: 'assets/icon128.png',
};

function updateManifestIcons() {
  console.log('🔧 Updating manifest files with new icon configuration...');

  manifestFiles.forEach((manifestPath) => {
    const fullPath = path.join(__dirname, '..', manifestPath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Manifest file not found: ${manifestPath}`);
      return;
    }

    try {
      const manifestContent = fs.readFileSync(fullPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Update icons section
      manifest.icons = iconConfig;

      // Update action.default_icon section if it exists
      if (manifest.action && manifest.action.default_icon) {
        manifest.action.default_icon = iconConfig;
      }

      // Write back to file
      fs.writeFileSync(fullPath, JSON.stringify(manifest, null, 2));
      console.log(`✅ Updated ${manifestPath}`);
    } catch (error) {
      console.error(`❌ Failed to update ${manifestPath}:`, error.message);
    }
  });

  console.log('\n🎉 Manifest files updated successfully!');
  console.log('\n📋 Icon configuration applied:');
  Object.entries(iconConfig).forEach(([size, path]) => {
    console.log(`   ${size}x${size}: ${path}`);
  });
}

updateManifestIcons();
