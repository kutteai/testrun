const fs = require('fs');
const path = require('path');

// Helper to fix parseInt missing radix
function fixParseInt(content) {
  // Match parseInt calls without radix parameter
  return content.replace(/parseInt\(([^,)]+)\)(?!\s*,\s*10)/g, 'parseInt($1, 10)');
}

// Helper to remove console statements
function removeConsoleStatements(content) {
  // Remove standalone console.log/error/warn statements
  return content
    .replace(/^\s*console\.(log|error|warn|info|debug)\([^;]*\);?\s*$/gm, '')
    .replace(/\n\n\n+/g, '\n\n'); // Clean up excessive newlines
}

// Helper to add comment to empty catch blocks
function fixEmptyBlocks(content) {
  // Fix empty catch blocks
  content = content.replace(/catch\s*\([^)]*\)\s*\{\s*\}/g, 'catch (error) {\n      // Error handled silently\n    }');

  // Fix empty if/else blocks
  content = content.replace(/else\s*\{\s*\}/g, 'else {\n      // Empty else block\n    }');
  content = content.replace(/if\s*\([^)]+\)\s*\{\s*\}(?!\s*else)/g, (match) => {
    const condition = match.match(/if\s*\(([^)]+)\)/)[1];
    return `if (${condition}) {\n      // Empty block\n    }`;
  });

  return content;
}

// Fix files
const filesToFix = [
  // Files with parseInt errors
  'src/components/common/TokenManagementPanel.tsx',
  'src/components/modals/WalletLockModal.tsx',
  'src/components/screens/ExpandViewScreen.tsx',
  'src/components/screens/GasSettingsScreen.tsx',
  'src/components/screens/ManageCryptoScreen.tsx',
  'src/components/screens/NetworksScreen.tsx',
  'src/components/screens/ReviewSendScreen.tsx',
  'src/components/screens/TransactionHistoryScreen.tsx',
  'src/services/token-search-api.ts',
  'src/utils/address-validator.ts',
  'src/utils/crypto-utils.ts',
  'src/utils/hardware-wallet-sdk.ts',
  'src/utils/key-derivation.ts',
  'src/utils/multi-chain-balance-utils.ts',
  'src/utils/token-search-utils.ts',
  'src/utils/ton-utils.ts',
  'src/utils/walletconnect-utils.ts',
  'src/utils/xrp-utils.ts',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = fixParseInt(content);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed parseInt in: ${file}`);
  }
});

console.log('Done!');
