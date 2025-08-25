#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const inputSvg = path.join(__dirname, '../src/assets/icon.svg');
const outputDir = path.join(__dirname, '../src/assets');

async function generateIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(inputSvg);
    
    // Generate PNG files for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon${size}.png`);
    }
    
    console.log('🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
