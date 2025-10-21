#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not provide instructions
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp library not found. Please install it first:');
  console.error('npm install sharp');
  console.error('or');
  console.error('yarn add sharp');
  process.exit(1);
}

const logoPath = path.join(__dirname, '../src/assets/logo.png');
const outputDir = path.join(__dirname, '../src/assets');

// Required icon sizes for browser extensions
const iconSizes = [
  { size: 16, name: 'icon16.png' },
  { size: 32, name: 'icon32.png' },
  { size: 48, name: 'icon48.png' },
  { size: 128, name: 'icon128.png' },
];

async function generateIcons() {
  try {
    // Check if logo.png exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ logo.png not found at:', logoPath);
      process.exit(1);
    }

    console.log('🎨 Generating icons from logo.png...');
    console.log('📁 Input:', logoPath);
    console.log('📁 Output directory:', outputDir);

    // Read the original logo
    const logoBuffer = fs.readFileSync(logoPath);

    // Generate each icon size
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(outputDir, name);

      try {
        await sharp(logoBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: {
              r: 0, g: 0, b: 0, alpha: 0,
            }, // Transparent background
          })
          .png()
          .toFile(outputPath);

        console.log(`✅ Generated ${name} (${size}x${size})`);
      } catch (error) {
        console.error(`❌ Failed to generate ${name}:`, error.message);
      }
    }

    console.log('\n🎉 Icon generation complete!');
    console.log('\n📋 Generated files:');
    iconSizes.forEach(({ size, name }) => {
      const filePath = path.join(outputDir, name);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ${name} (${size}x${size}) - ${(stats.size / 1024).toFixed(1)}KB`);
      }
    });

    console.log('\n🔧 Next steps:');
    console.log('1. The manifest files will be updated automatically');
    console.log('2. Rebuild your extension');
    console.log('3. Test the icons in your browser');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons();
