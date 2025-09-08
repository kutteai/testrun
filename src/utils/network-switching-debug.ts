// Network Switching Debug Utility
// This file helps debug network switching issues

export function debugNetworkSwitching() {
  console.log('🔍 Network Switching Debug Information');
  console.log('=====================================');
  
  // Check if contexts are available
  try {
    const { useNetwork } = require('../../store/NetworkContext');
    const { useWallet } = require('../../store/WalletContext');
    console.log('✅ Network and Wallet contexts are available');
  } catch (error) {
    console.error('❌ Context import error:', error);
  }
  
  // Check if NetworkSwitcherModal is available
  try {
    const NetworkSwitcherModal = require('../components/common/NetworkSwitcherModal');
    console.log('✅ NetworkSwitcherModal component is available');
  } catch (error) {
    console.error('❌ NetworkSwitcherModal import error:', error);
  }
  
  // Check if storage is working
  try {
    const { storage } = require('./storage-utils');
    console.log('✅ Storage utility is available');
  } catch (error) {
    console.error('❌ Storage utility error:', error);
  }
  
  // Check if toast is available
  try {
    const toast = require('react-hot-toast');
    console.log('✅ Toast notifications are available');
  } catch (error) {
    console.error('❌ Toast import error:', error);
  }
  
  console.log('🔍 Debug check complete');
}

// Test network switching function
export async function testNetworkSwitch(networkId: string = 'polygon') {
  console.log(`🧪 Testing network switch to: ${networkId}`);
  
  try {
    // Try to import and use the wallet context
    const { useWallet } = require('../../store/WalletContext');
    console.log('✅ Wallet context imported successfully');
    
    // This would need to be called from within a React component
    console.log('ℹ️ Note: This test needs to be run from within a React component');
    
  } catch (error) {
    console.error('❌ Network switch test failed:', error);
  }
}

// Check network switching UI elements
export function checkNetworkSwitchingUI() {
  console.log('🔍 Checking Network Switching UI Elements');
  console.log('==========================================');
  
  // Check if Globe button exists
  const globeButton = document.querySelector('button[class*="hover:bg-white/10"]');
  if (globeButton) {
    console.log('✅ Globe button found');
  } else {
    console.log('❌ Globe button not found');
  }
  
  // Check if ChevronDown button exists
  const chevronButton = document.querySelector('button svg[class*="w-5 h-5"]');
  if (chevronButton) {
    console.log('✅ ChevronDown button found');
  } else {
    console.log('❌ ChevronDown button not found');
  }
  
  // Check if NetworkSwitcherModal exists
  const modal = document.querySelector('[class*="NetworkSwitcherModal"]');
  if (modal) {
    console.log('✅ NetworkSwitcherModal found in DOM');
  } else {
    console.log('ℹ️ NetworkSwitcherModal not in DOM (this is normal when closed)');
  }
  
  console.log('🔍 UI check complete');
}

// Run all debug checks
export function runNetworkSwitchingDebug() {
  console.log('🚀 Running Network Switching Debug Suite');
  console.log('========================================');
  
  debugNetworkSwitching();
  checkNetworkSwitchingUI();
  
  console.log('🎯 Debug suite complete');
  console.log('If network switching is still not working, check:');
  console.log('1. Browser console for errors');
  console.log('2. Network requests in DevTools');
  console.log('3. React DevTools for component state');
  console.log('4. Wallet and Network context state');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected');
  console.log('Run runNetworkSwitchingDebug() to start debugging');
}
