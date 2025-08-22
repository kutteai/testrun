#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bright}${colors.blue}${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Build configuration
const config = {
  browsers: ['chrome', 'firefox', 'edge'],
  distDir: 'dist',
  sourceDir: 'src',
  manifestFile: 'manifest.json'
};

// Clean dist directory
function cleanDist() {
  logStep('Cleaning dist directory...');
  
  if (fs.existsSync(config.distDir)) {
    fs.rmSync(config.distDir, { recursive: true, force: true });
    logSuccess('Dist directory cleaned');
  } else {
    logSuccess('Dist directory does not exist, skipping cleanup');
  }
}

// Copy and process manifest
function processManifest(browser) {
  logStep(`Processing manifest for ${browser}...`);
  
  const manifestPath = path.join(process.cwd(), config.manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Browser-specific modifications
  if (browser === 'firefox') {
    // Firefox doesn't support service workers in manifest v3
    if (manifest.background && manifest.background.service_worker) {
      manifest.background.scripts = [manifest.background.service_worker];
      delete manifest.background.service_worker;
    }
    
    // Add Firefox-specific permissions
    if (!manifest.permissions.includes('geckoProfiler')) {
      manifest.permissions.push('geckoProfiler');
    }
  }
  
  if (browser === 'edge') {
    // Edge-specific modifications if needed
    manifest.name = `${manifest.name} (Edge)`;
  }
  
  // Update version if provided
  if (process.env.VERSION) {
    manifest.version = process.env.VERSION;
  }
  
  const outputPath = path.join(config.distDir, browser, config.manifestFile);
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  
  logSuccess(`Manifest processed for ${browser}`);
}

// Build for specific browser
function buildForBrowser(browser) {
  logStep(`Building for ${browser}...`);
  
  try {
    const env = { ...process.env, BROWSER: browser };
    execSync(`npx webpack --mode production --env browser=${browser}`, {
      stdio: 'inherit',
      env
    });
    
    // Move files to browser-specific directory
    const browserDistDir = path.join(config.distDir, browser);
    if (!fs.existsSync(browserDistDir)) {
      fs.mkdirSync(browserDistDir, { recursive: true });
    }
    
    // Copy built files
    const files = fs.readdirSync(config.distDir);
    files.forEach(file => {
      if (file !== browser) {
        const sourcePath = path.join(config.distDir, file);
        const destPath = path.join(browserDistDir, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          fs.cpSync(sourcePath, destPath, { recursive: true });
          fs.rmSync(sourcePath, { recursive: true, force: true });
        } else {
          fs.copyFileSync(sourcePath, destPath);
          fs.unlinkSync(sourcePath);
        }
      }
    });
    
    processManifest(browser);
    logSuccess(`Build completed for ${browser}`);
    
  } catch (error) {
    logError(`Build failed for ${browser}: ${error.message}`);
    process.exit(1);
  }
}

// Create zip files
function createZipFiles() {
  logStep('Creating zip files...');
  
  config.browsers.forEach(browser => {
    try {
      const browserDistDir = path.join(config.distDir, browser);
      const zipName = `paycio-wallet-${browser}.zip`;
      
      execSync(`cd ${browserDistDir} && zip -r ../${zipName} .`, {
        stdio: 'inherit'
      });
      
      logSuccess(`Created ${zipName}`);
    } catch (error) {
      logError(`Failed to create zip for ${browser}: ${error.message}`);
    }
  });
}

// Validate build
function validateBuild() {
  logStep('Validating build...');
  
  const requiredFiles = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'background.js',
    'content.js',
    'injected.js'
  ];
  
  config.browsers.forEach(browser => {
    const browserDistDir = path.join(config.distDir, browser);
    
    if (!fs.existsSync(browserDistDir)) {
      logError(`Build directory for ${browser} does not exist`);
      return;
    }
    
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(browserDistDir, file))
    );
    
    if (missingFiles.length > 0) {
      logError(`Missing files for ${browser}: ${missingFiles.join(', ')}`);
    } else {
      logSuccess(`Build validation passed for ${browser}`);
    }
  });
}

// Main build function
function build() {
  log(`${colors.bright}${colors.cyan}🚀 PayCio Wallet Build System${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Clean dist directory
    cleanDist();
    
    // Build for each browser
    config.browsers.forEach(browser => {
      buildForBrowser(browser);
    });
    
    // Create zip files
    createZipFiles();
    
    // Validate build
    validateBuild();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n${colors.bright}${colors.green}🎉 Build completed successfully in ${duration}s${colors.reset}`);
    log(`${colors.cyan}📁 Output directory: ${path.resolve(config.distDir)}${colors.reset}`);
    
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'clean':
    cleanDist();
    break;
  case 'validate':
    validateBuild();
    break;
  case 'zip':
    createZipFiles();
    break;
  default:
    build();
}

module.exports = {
  build,
  cleanDist,
  validateBuild,
  createZipFiles
}; 