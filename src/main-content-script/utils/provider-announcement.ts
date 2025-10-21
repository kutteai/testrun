import { PaycioEthereumProvider } from './ethereum-provider';

declare global {
  interface Window {
    ethereum: any;
  }
}

export const setupProviderAnnouncement = (ethereumProvider: PaycioEthereumProvider) => {
  const announceProviders = () => {
    // Standard Ethereum provider events
    window.dispatchEvent(new Event('ethereum#initialized'));

    // EIP-6963: Multi Injected Provider Discovery
    const providerInfo = {
      uuid: 'f4b4f4b4-f4b4-f4b4-f4b4-f4b4f4b4f4b4',
      name: 'Paycio',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMiIvPgo8L3N2Zz4=',
      rdns: 'io.paycio.wallet',
    };

    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info: providerInfo, provider: ethereumProvider }),
    }));

    // Custom Paycio events
    window.dispatchEvent(new CustomEvent('paycio#initialized', {
      detail: {
        isPaycio: true,
        version: '1.0.0',
        supportedNetworks: [
          'ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism',
          'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp',
        ],
        features: [
          'eth_accounts', 'eth_sendTransaction', 'personal_sign',
          'eth_signTypedData_v4', 'wallet_switchEthereumChain',
          'wallet_addEthereumChain', 'multichain', 'walletconnect',
          'subscriptions', 'filters', 'advanced_ui',
        ],
      },
    }));
  };

  // Announce immediately and on EIP-6963 request
  announceProviders();
  window.addEventListener('eip6963:requestProvider', announceProviders);
};
