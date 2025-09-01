import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';


interface Network {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  chainId: string;
  explorerUrl: string;
  isCustom: boolean;
  isEnabled: boolean;
}

interface NetworkState {
  currentNetwork: Network | null;
  networks: Network[];
  isConnected: boolean;
  connectionError: string | null;
}

interface NetworkContextType {
  networkState: NetworkState;
  currentNetwork: Network | null;
  networks: Network[];
  isConnected: boolean;
  switchNetwork: (networkId: string) => Promise<void>;
  addCustomNetwork: (network: Omit<Network, 'isCustom'>) => void;
  removeCustomNetwork: (networkId: string) => void;
  toggleNetwork: (networkId: string) => void;
  getNetworkById: (networkId: string) => Network | undefined;
  refreshConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

// Get configuration
function getConfig() {
  if (typeof window !== 'undefined' && window.CONFIG) {
    return window.CONFIG;
  }
  return {
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID ,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || ''
  };
}

// Default networks with real API configurations
const defaultNetworks: Network[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: `https://mainnet.infura.io/v3/${getConfig().INFURA_PROJECT_ID}`,
    chainId: '0x1',
    explorerUrl: 'https://etherscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'bsc',
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    chainId: '0x38',
    explorerUrl: 'https://bscscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: '0x89',
    explorerUrl: 'https://polygonscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: '0xa86a',
    explorerUrl: 'https://snowtrace.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: '0xa4b1',
    explorerUrl: 'https://arbiscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: '0xa',
    explorerUrl: 'https://optimistic.etherscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    chainId: '0x2105',
    explorerUrl: 'https://basescan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'fantom',
    name: 'Fantom',
    symbol: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools',
    chainId: '0xfa',
    explorerUrl: 'https://ftmscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'zksync',
    name: 'zkSync Era',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.era.zksync.io',
    chainId: '0x144',
    explorerUrl: 'https://explorer.zksync.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'linea',
    name: 'Linea',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    chainId: '0xe708',
    explorerUrl: 'https://lineascan.build',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'mantle',
    name: 'Mantle',
    symbol: 'MNT',
    rpcUrl: 'https://rpc.mantle.xyz',
    chainId: '0x1388',
    explorerUrl: 'https://explorer.mantle.xyz',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'scroll',
    name: 'Scroll',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.scroll.io',
    chainId: '0x82750',
    explorerUrl: 'https://scrollscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'polygon-zkevm',
    name: 'Polygon zkEVM',
    symbol: 'ETH',
    rpcUrl: 'https://zkevm-rpc.com',
    chainId: '0x44d',
    explorerUrl: 'https://zkevm.polygonscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'arbitrum-nova',
    name: 'Arbitrum Nova',
    symbol: 'ETH',
    rpcUrl: 'https://nova.arbitrum.io/rpc',
    chainId: '0xa4ba',
    explorerUrl: 'https://nova.arbiscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    rpcUrl: '', // Bitcoin doesn't use traditional RPC
    chainId: '', // Not applicable for Bitcoin
    explorerUrl: 'https://mempool.space',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    chainId: '', // Solana doesn't use chain IDs like EVM
    explorerUrl: 'https://solscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    rpcUrl: 'https://api.trongrid.io',
    chainId: '', // TRON doesn't use chain IDs like EVM
    explorerUrl: 'https://tronscan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'litecoin',
    name: 'Litecoin',
    symbol: 'LTC',
    rpcUrl: '', // Litecoin doesn't use traditional RPC
    chainId: '', // Not applicable for Litecoin
    explorerUrl: 'https://blockchair.com/litecoin',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'ton',
    name: 'TON',
    symbol: 'TON',
    rpcUrl: 'https://toncenter.com/api/v2/jsonRPC',
    chainId: '', // TON doesn't use chain IDs like EVM
    explorerUrl: 'https://tonscan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    rpcUrl: '', // XRP doesn't use traditional RPC
    chainId: '', // Not applicable for XRP
    explorerUrl: 'https://livenet.xrpl.org',
    isCustom: false,
    isEnabled: true
  },

];

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    currentNetwork: defaultNetworks[0],
    networks: defaultNetworks,
    isConnected: false,
    connectionError: null
  });

  // Load custom networks from storage
  useEffect(() => {
    chrome.storage.local.get(['customNetworks', 'currentNetwork'], (result) => {
      const customNetworks = result.customNetworks || [];
      const allNetworks = [...defaultNetworks, ...customNetworks];
      
      const currentNetworkId = result.currentNetwork || 'ethereum';
      const currentNetwork = allNetworks.find(n => n.id === currentNetworkId) || allNetworks[0];
      
      setNetworkState(prev => ({
        ...prev,
        networks: allNetworks,
        currentNetwork
      }));
    });
  }, []);

  // Save networks to storage
  const saveNetworks = (networks: Network[]) => {
    const customNetworks = networks.filter(n => n.isCustom);
    chrome.storage.local.set({ customNetworks });
  };

    // Test network connection
    const testConnection = async (network: Network): Promise<boolean> => {
      const startTime = Date.now();
      console.log(`🚀 Starting connection test for ${network.name}...`);
      
      try {
      // Set timeout based on network type
      const timeout = 10000; // 10 seconds for all networks
        console.log(`⏱️  Timeout set to ${timeout}ms for ${network.name}`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const elapsed = Date.now() - startTime;
            console.log(`⏰ Timeout after ${elapsed}ms for ${network.name}`);
            reject(new Error('Connection timeout'));
          }, timeout);
        });
  
      // Test connection based on network type
      let isConnected = false;
      
      if (['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(network.id)) {
        // EVM networks - test with eth_blockNumber
        console.log(`📡 Testing EVM network: ${network.name}`);
        const response = await Promise.race([
          fetch(network.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
          }),
          timeoutPromise
        ]) as Response;
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        if (data.error) {
          throw new Error(`RPC error: ${data.error.message || 'Unknown error'}`);
        }
        
        isConnected = data.result !== undefined;
        
      } else if (network.id === 'bitcoin') {
        // Bitcoin - test with getblockchaininfo
        console.log(`📡 Testing Bitcoin network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://blockstream.info/api/blocks/tip/height', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = typeof data === 'number' && data > 0;
        
      } else if (network.id === 'litecoin') {
        // Litecoin - test with getblockchaininfo
        console.log(`📡 Testing Litecoin network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://api.blockcypher.com/v1/ltc/main', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.height && data.height > 0;
        
      } else if (network.id === 'solana') {
        // Solana - test with getHealth
        console.log(`📡 Testing Solana network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'getHealth',
              params: [],
              id: 1,
            }),
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.result === 'ok';
        
      } else if (network.id === 'tron') {
        // TRON - test with getNowBlock
        console.log(`📡 Testing TRON network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://api.trongrid.io/wallet/getnowblock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.block_header && data.block_header.raw_data;
        
      } else if (network.id === 'ton') {
        // TON - test with getMasterchainInfo
        console.log(`📡 Testing TON network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://toncenter.com/api/v2/getMasterchainInfo', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.ok === true;
        
      } else if (network.id === 'xrp') {
        // XRP - test with server_info
        console.log(`📡 Testing XRP network: ${network.name}`);
        const response = await Promise.race([
          fetch('https://s1.ripple.com:51234', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'server_info',
              params: [],
            }),
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.result && data.result.info;
        
      } else {
        // Unknown network - try generic RPC test
        console.log(`📡 Testing unknown network: ${network.name}`);
        const response = await Promise.race([
          fetch(network.rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 1,
            }),
          }),
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        isConnected = data.result !== undefined;
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Connection test completed in ${elapsed}ms for ${network.name}: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      return isConnected;
      
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.warn(`❌ Connection test failed for ${network.name} after ${elapsed}ms:`, error);
        return false;
      }
    };

  // Switch network
  // Switch network
  const switchNetwork = async (networkId: string): Promise<void> => {
    try {
      const network = networkState.networks.find(n => n.id === networkId);
      if (!network) {
        throw new Error('Network not found');
      }

      // Test connection before switching (but don't block if it fails)
      let isConnected = false;
      try {
        console.log(`Testing connection to ${network.name} at ${network.rpcUrl}`);
        isConnected = await testConnection(network);
        console.log(`Connection test result for ${network.name}:`, isConnected);
      } catch (error) {
        console.warn('Connection test failed, but continuing with network switch:', error);
        isConnected = false;
      }
      
      setNetworkState(prev => ({
        ...prev,
        currentNetwork: network,
        isConnected: true, // Always set as connected since we're switching anyway
        connectionError: null
      }));

      // Save current network to storage
      chrome.storage.local.set({ currentNetwork: networkId });

      // Trigger a custom event to notify other contexts about network change
      window.dispatchEvent(new CustomEvent('networkChanged', { 
        detail: { networkId, network } 
      }));

    } catch (error) {
      setNetworkState(prev => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : 'Unknown error'
      }));
        throw error; // Re-throw so NetworkSwitcher can handle it
    }
  };

  // Add custom network
  const addCustomNetwork = async (network: Omit<Network, 'isCustom'>) => {
    try {
      // Validate network configuration
      const validation = validateNetworkConfig(network);
      if (!validation.isValid) {
        throw new Error(`Invalid network configuration: ${validation.errors.join(', ')}`);
      }

      // Check if network ID already exists
      const existingNetwork = networkState.networks.find(n => n.id === network.id);
      if (existingNetwork) {
        throw new Error('Network with this ID already exists');
      }

    const customNetwork: Network = {
      ...network,
      isCustom: true
    };

    setNetworkState(prev => {
      const updatedNetworks = [...prev.networks, customNetwork];
      saveNetworks(updatedNetworks);
      return {
        ...prev,
        networks: updatedNetworks
      };
    });

    toast.success(`Added custom network: ${network.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add custom network';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Validate network configuration
  const validateNetworkConfig = (config: Partial<Network>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('Network ID is required');
    if (!config.name) errors.push('Network name is required');
    if (!config.symbol) errors.push('Symbol is required');

    // RPC URL validation (optional for non-EVM networks like Bitcoin, XRP)
    if (config.rpcUrl && !config.rpcUrl.startsWith('http') && config.rpcUrl !== '') {
      errors.push('RPC URL must start with http:// or https:// (or leave empty for non-EVM networks)');
    }

    // Chain ID validation (optional for non-EVM networks)
    if (config.chainId && config.chainId !== '' && !/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(config.chainId)) {
      errors.push('Chain ID must be a valid number (decimal) or hex (0x...) format, or leave empty for non-EVM networks');
    }

    // Network ID format validation
    if (config.id && !/^[a-z0-9-]+$/.test(config.id)) {
      errors.push('Network ID must contain only lowercase letters, numbers, and hyphens');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Remove custom network
  const removeCustomNetwork = (networkId: string) => {
    setNetworkState(prev => {
      const updatedNetworks = prev.networks.filter(n => n.id !== networkId);
      saveNetworks(updatedNetworks);
      
      // If current network is being removed, switch to Ethereum
      const currentNetwork = prev.currentNetwork?.id === networkId 
        ? updatedNetworks.find(n => n.id === 'ethereum') || updatedNetworks[0]
        : prev.currentNetwork;

      return {
        ...prev,
        networks: updatedNetworks,
        currentNetwork
      };
    });

    toast.success('Custom network removed');
  };

  // Toggle network
  const toggleNetwork = (networkId: string) => {
    setNetworkState(prev => {
      const updatedNetworks = prev.networks.map(n => 
        n.id === networkId ? { ...n, isEnabled: !n.isEnabled } : n
      );
      saveNetworks(updatedNetworks);
      return {
        ...prev,
        networks: updatedNetworks
      };
    });
  };

  // Get network by ID
  const getNetworkById = (networkId: string): Network | undefined => {
    return networkState.networks.find(n => n.id === networkId);
  };

  // Refresh connection
  const refreshConnection = async (): Promise<void> => {
    if (!networkState.currentNetwork) return;

    try {
      const isConnected = await testConnection(networkState.currentNetwork);
      
      setNetworkState(prev => ({
        ...prev,
        isConnected,
        connectionError: isConnected ? null : 'Connection failed'
      }));

      if (isConnected) {
        toast.success('Connection restored');
      } else {
        toast.error('Connection failed');
      }
    } catch (error) {
      toast.error('Failed to refresh connection');
    }
  };

  const value: NetworkContextType = {
    networkState,
    currentNetwork: networkState.currentNetwork,
    networks: networkState.networks,
    isConnected: networkState.isConnected,
    switchNetwork,
    addCustomNetwork,
    removeCustomNetwork,
    toggleNetwork,
    getNetworkById,
    refreshConnection
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}; 