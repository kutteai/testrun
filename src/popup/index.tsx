import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '../store/WalletContext';
import { SecurityProvider } from '../store/SecurityContext';
import { NetworkProvider } from '../store/NetworkContext';
import { TransactionProvider } from '../store/TransactionContext';
import { NFTProvider } from '../store/NFTContext';
import { PortfolioProvider } from '../store/PortfolioContext';
import App from '../App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Handle the case where root element is not found
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Failed to load wallet extension</div>';
} else {
  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <WalletProvider>
      <SecurityProvider>
          <NetworkProvider>
            <TransactionProvider>
              <NFTProvider>
                <PortfolioProvider>
                  <App />
                  <Toaster position="top-right" />
                </PortfolioProvider>
              </NFTProvider>
            </TransactionProvider>
          </NetworkProvider>
        </SecurityProvider>
        </WalletProvider>
    </React.StrictMode>
  );
} 