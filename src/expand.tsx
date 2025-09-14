// PayCio Wallet Expanded View
// This script initializes the full-screen wallet interface

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './store/WalletContext';
import { SecurityProvider } from './store/SecurityContext';
import { NetworkProvider } from './store/NetworkContext';
import { TransactionProvider } from './store/TransactionContext';
import { NFTProvider } from './store/NFTContext';
import { PortfolioProvider } from './store/PortfolioContext';
import { SendProvider } from './store/SendContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

console.log('🚀 PayCio Wallet Expanded View Initializing...');

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <WalletProvider>
          <SecurityProvider>
            <NetworkProvider>
              <TransactionProvider>
                <NFTProvider>
                  <PortfolioProvider>
                    <SendProvider>
                      <App />
                      <Toaster 
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: '#180CB2',
                            color: '#fff',
                          },
                        }}
                      />
                    </SendProvider>
                  </PortfolioProvider>
                </NFTProvider>
              </TransactionProvider>
            </NetworkProvider>
          </SecurityProvider>
        </WalletProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('✅ PayCio Wallet Expanded View Loaded');
} else {
  console.error('❌ Root container not found');
}

// Handle window events
window.addEventListener('beforeunload', () => {
  console.log('🔄 PayCio Wallet Expanded View Closing...');
});

// Handle extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome extension context available');
} else if (typeof browser !== 'undefined' && browser.runtime) {
  console.log('✅ Firefox extension context available');
} else {
  console.log('⚠️ No extension context - running in standalone mode');
}
