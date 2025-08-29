import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
const NetworkContext = createContext(undefined);
export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};
// Get configuration
function getConfig() {
    if (typeof window !== 'undefined' && window.CONFIG) {
        return window.CONFIG;
    }
    return {
        INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID || 'YOUR_INFURA_KEY',
        ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || ''
    };
}
// Default networks with real API configurations
const defaultNetworks = [
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
        rpcUrl: 'https://bsc-dataseed.binance.org',
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
  }
];
export const NetworkProvider = ({ children }) => {
    const [networkState, setNetworkState] = useState({
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
    const saveNetworks = (networks) => {
        const customNetworks = networks.filter(n => n.isCustom);
        chrome.storage.local.set({ customNetworks });
    };
    // Test network connection
    const testConnection = async (network) => {
        try {
            const response = await fetch(network.rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1,
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.result !== undefined;
        }
        catch (error) {
            toast.error(`Connection test failed for ${network.name}`);
            return false;
        }
    };
    // Switch network
    const switchNetwork = async (networkId) => {
        try {
            const network = networkState.networks.find(n => n.id === networkId);
            if (!network) {
                throw new Error('Network not found');
            }
            // Test connection before switching
            const isConnected = await testConnection(network);
            setNetworkState(prev => ({
                ...prev,
                currentNetwork: network,
                isConnected,
                connectionError: isConnected ? null : 'Connection failed'
            }));
            // Save current network to storage
            chrome.storage.local.set({ currentNetwork: networkId });
            if (isConnected) {
                toast.success(`Switched to ${network.name}`);
            }
            else {
                toast.error(`Failed to connect to ${network.name}`);
            }
        }
        catch (error) {
            toast.error('Failed to switch network');
            setNetworkState(prev => ({
                ...prev,
                connectionError: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    };
    // Add custom network
    const addCustomNetwork = (network) => {
        const customNetwork = {
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
    };
    // Remove custom network
    const removeCustomNetwork = (networkId) => {
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
    const toggleNetwork = (networkId) => {
        setNetworkState(prev => {
            const updatedNetworks = prev.networks.map(n => n.id === networkId ? { ...n, isEnabled: !n.isEnabled } : n);
            saveNetworks(updatedNetworks);
            return {
                ...prev,
                networks: updatedNetworks
            };
        });
    };
    // Get network by ID
    const getNetworkById = (networkId) => {
        return networkState.networks.find(n => n.id === networkId);
    };
    // Refresh connection
    const refreshConnection = async () => {
        if (!networkState.currentNetwork)
            return;
        try {
            const isConnected = await testConnection(networkState.currentNetwork);
            setNetworkState(prev => ({
                ...prev,
                isConnected,
                connectionError: isConnected ? null : 'Connection failed'
            }));
            if (isConnected) {
                toast.success('Connection restored');
            }
            else {
                toast.error('Connection failed');
            }
        }
        catch (error) {
            toast.error('Failed to refresh connection');
        }
    };
    const value = {
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
    return (_jsx(NetworkContext.Provider, { value: value, children: children }));
};
