import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
}
else {
    const root = createRoot(rootElement);
    root.render(_jsx(React.StrictMode, { children: _jsx(WalletProvider, { children: _jsx(SecurityProvider, { children: _jsx(NetworkProvider, { children: _jsx(TransactionProvider, { children: _jsx(NFTProvider, { children: _jsxs(PortfolioProvider, { children: [_jsx(App, {}), _jsx(Toaster, { position: "top-right" })] }) }) }) }) }) }) }));
}
