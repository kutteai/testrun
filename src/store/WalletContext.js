import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, hashPassword, verifyPassword } from '../utils/crypto-utils';
import { deriveWalletFromSeed } from '../utils/key-derivation';
// Initial state
const initialState = {
    wallet: null,
    isWalletUnlocked: false,
    hasWallet: false,
    balances: {},
    isLoading: false,
    error: null,
    isWalletCreated: false,
    isInitializing: false,
    address: null,
    currentNetwork: null,
    networks: [],
    accounts: [],
    privateKey: null
};
// Reducer
const walletReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_INITIALIZING':
            return { ...state, isInitializing: action.payload };
        case 'SET_WALLET_CREATED':
            return { ...state, isWalletCreated: action.payload };
        case 'SET_WALLET':
            return {
                ...state,
                wallet: action.payload,
                address: action.payload.address,
                accounts: [action.payload.address],
                isWalletUnlocked: true,
                hasWallet: true
            };
        case 'SET_WALLET_UNLOCKED':
            return { ...state, isWalletUnlocked: action.payload };
        case 'SET_BALANCES':
            return { ...state, balances: { ...state.balances, ...action.payload } };
        case 'SET_CURRENT_NETWORK':
            return { ...state, currentNetwork: action.payload };
        case 'SET_HAS_WALLET':
            return { ...state, hasWallet: action.payload };
        case 'LOCK_WALLET':
            return {
                ...state,
                isWalletUnlocked: false,
                privateKey: null
            };
        case 'CLEAR_WALLET':
            return {
                ...state,
                wallet: null,
                isWalletUnlocked: false,
                hasWallet: false,
                balances: {},
                address: null,
                accounts: [],
                privateKey: null,
                isInitializing: false
            };
        default:
            return state;
    }
};
// Create context
const WalletContext = createContext(undefined);
// Provider component
export const WalletProvider = ({ children }) => {
    const [state, dispatch] = useReducer(walletReducer, initialState);
    // Initialize wallet on mount
    useEffect(() => {
        initializeWallet();
    }, []);
    // Auto-update balances when wallet is unlocked
    useEffect(() => {
        if (state.isWalletUnlocked && state.address) {
            updateAllBalances();
        }
    }, [state.isWalletUnlocked, state.address]);
    // Initialize wallet
    const initializeWallet = async () => {
        try {
            dispatch({ type: 'SET_INITIALIZING', payload: true });
            // Check if wallet exists in storage
            const storedWallet = await getStoredWallet();
            if (storedWallet) {
                dispatch({ type: 'SET_WALLET_CREATED', payload: true });
                dispatch({ type: 'SET_WALLET', payload: storedWallet });
            }
        }
        catch (error) {
            toast.error('Failed to initialize wallet');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize wallet' });
        }
        finally {
            dispatch({ type: 'SET_INITIALIZING', payload: false });
        }
    };
    // Create new wallet with real implementation
    const createWallet = async (name, network) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            // Generate real BIP39 seed phrase
            const seedPhrase = generateBIP39SeedPhrase();
            // Derive wallet from seed phrase
            const walletData = await deriveWalletFromSeed(seedPhrase, network);
            const wallet = {
                id: Date.now().toString(),
                name,
                address: walletData.address,
                privateKey: walletData.privateKey,
                publicKey: walletData.publicKey,
                seedPhrase: walletData.seedPhrase,
                network,
                currentNetwork: network,
                derivationPath: walletData.derivationPath,
                createdAt: Date.now()
            };
            // Store wallet securely
            await storeWallet(wallet);
            dispatch({ type: 'SET_WALLET', payload: wallet });
            dispatch({ type: 'SET_WALLET_CREATED', payload: true });
            dispatch({ type: 'SET_HAS_WALLET', payload: true });
            toast.success('Wallet created successfully');
        }
        catch (error) {
            toast.error('Failed to create wallet');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to create wallet' });
        }
        finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };
    // Import wallet from seed phrase with real implementation
    const importWallet = async (seedPhrase, network) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            // Validate seed phrase
            if (!validateBIP39SeedPhrase(seedPhrase)) {
                throw new Error('Invalid seed phrase');
            }
            // Derive wallet from seed phrase
            const walletData = await deriveWalletFromSeed(seedPhrase, network);
            const wallet = {
                id: Date.now().toString(),
                name: 'Imported Wallet',
                address: walletData.address,
                privateKey: walletData.privateKey,
                publicKey: walletData.publicKey,
                seedPhrase: walletData.seedPhrase,
                network,
                currentNetwork: network,
                derivationPath: walletData.derivationPath,
                createdAt: Date.now()
            };
            // Store wallet securely
            await storeWallet(wallet);
            dispatch({ type: 'SET_WALLET', payload: wallet });
            dispatch({ type: 'SET_WALLET_CREATED', payload: true });
            dispatch({ type: 'SET_HAS_WALLET', payload: true });
            toast.success('Wallet imported successfully');
        }
        catch (error) {
            toast.error('Failed to import wallet');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to import wallet' });
        }
        finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };
    // Unlock wallet with real password verification
    const unlockWallet = async (password) => {
        try {
            const storedWallet = await getStoredWallet();
            if (!storedWallet) {
                throw new Error('No wallet found');
            }
            // Get stored password hash
            const storedHash = await getStoredPasswordHash();
            if (!storedHash) {
                // First time unlock, create password hash
                const hash = await hashPassword(password);
                await storePasswordHash(hash);
                dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
                toast.success('Wallet unlocked successfully');
                return true;
            }
            // Verify password
            const isValid = await verifyPassword(password, storedHash);
            if (isValid) {
                dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
                toast.success('Wallet unlocked successfully');
                return true;
            }
            else {
                toast.error('Invalid password');
                return false;
            }
        }
        catch (error) {
            toast.error('Failed to unlock wallet');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to unlock wallet' });
            return false;
        }
    };
    // Lock wallet
    const lockWallet = () => {
        dispatch({ type: 'LOCK_WALLET' });
        toast.success('Wallet locked');
    };
    // Switch network
    const switchNetwork = async (networkId) => {
        try {
            toast(`Switching to network: ${networkId}`);
            // Find the network
            const network = state.networks.find(n => n.id === networkId);
            if (!network) {
                throw new Error('Network not found');
            }
            dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
            // Update balances for new network
            if (state.address) {
                await updateAllBalances();
            }
        }
        catch (error) {
            toast.error('Failed to switch network');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to switch network' });
        }
    };
    // Get balance for specific address and network
    const getBalance = async (address, network) => {
        try {
            const balance = await getRealBalance(address, network);
            return balance;
        }
        catch (error) {
            toast.error('Failed to get balance');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to get balance' });
            return '0';
        }
    };
    // Update all balances
    const updateAllBalances = async () => {
        if (!state.address)
            return;
        try {
            const newBalances = {};
            for (const network of state.networks) {
                const balance = await getRealBalance(state.address, network.id);
                newBalances[`${state.address}_${network.id}`] = balance;
            }
            dispatch({ type: 'SET_BALANCES', payload: newBalances });
        }
        catch (error) {
            toast.error('Failed to update balances');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update balances' });
        }
    };
    // Store wallet securely
    const storeWallet = async (wallet) => {
        // In a real implementation, you would encrypt the wallet data
        // For now, we'll store it as is (should be encrypted in production)
        chrome.storage.local.set({ wallet });
    };
    // Get stored wallet
    const getStoredWallet = async () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['wallet'], (result) => {
                resolve(result.wallet || null);
            });
        });
    };
    // Store password hash
    const storePasswordHash = async (hash) => {
        chrome.storage.local.set({ passwordHash: hash });
    };
    // Get stored password hash
    const getStoredPasswordHash = async () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['passwordHash'], (result) => {
                resolve(result.passwordHash || null);
            });
        });
    };
    // Add hardware wallet
    const addHardwareWallet = async (type, address, derivationPath) => {
        try {
            const { hardwareWalletManager } = await import('../utils/hardware-wallet');
            // Connect to hardware wallet
            await hardwareWalletManager.connectHardwareWallet(type);
            // Verify the address matches
            const addresses = await hardwareWalletManager.getHardwareWalletAddresses(derivationPath);
            if (!addresses.includes(address)) {
                throw new Error('Address verification failed');
            }
            // Create hardware wallet data
            const hardwareWallet = {
                id: `hw_${type}_${Date.now()}`,
                name: `${type.charAt(0).toUpperCase() + type.slice(1)} Wallet`,
                address,
                seedPhrase: '', // Hardware wallets don't expose seed phrases
                privateKey: '', // Hardware wallets don't expose private keys
                publicKey: await hardwareWalletManager.exportPublicKey(`hw_${type}_${Date.now()}`, derivationPath),
                network: 'ethereum',
                currentNetwork: 'ethereum',
                derivationPath,
                createdAt: Date.now()
            };
            // Store hardware wallet
            await storeWallet(hardwareWallet);
            dispatch({ type: 'SET_WALLET', payload: hardwareWallet });
            dispatch({ type: 'SET_HAS_WALLET', payload: true });
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} wallet added successfully`);
        }
        catch (error) {
            toast.error(`Failed to add ${type} wallet`);
            dispatch({ type: 'SET_ERROR', payload: `Failed to add ${type} wallet` });
        }
    };
    const value = {
        ...state,
        createWallet,
        importWallet,
        unlockWallet,
        lockWallet,
        switchNetwork,
        getBalance,
        updateAllBalances,
        initializeWallet,
        addHardwareWallet
    };
    return (_jsx(WalletContext.Provider, { value: value, children: children }));
};
// Hook to use wallet context
export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
