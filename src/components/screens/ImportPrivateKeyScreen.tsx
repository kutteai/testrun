import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Shield, Loader } from 'lucide-react';
import { ethers } from 'ethers';
import { ECPairFactory } from 'ecpair';
import * as bitcoin from 'bitcoinjs-lib';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TronWeb } from 'tronweb';
import { mnemonicToSeedSync } from 'bip39';
import { HDKey } from 'hdkey';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { useWallet } from '../../store/WalletContext';

const ImportPrivateKeyScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { importWalletFromPrivateKey } = useWallet();
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [derivedAddresses, setDerivedAddresses] = useState<{[key: string]: string | false | undefined}>({});

  // Derive addresses for different networks from private key
  const deriveAddresses = (privateKeyHex: string): {[key: string]: string | false | undefined} => {
    try {
      const addresses: {[key: string]: string | false | undefined} = {};
      
      // Ethereum and EVM networks
      try {
        const wallet = new ethers.Wallet(privateKeyHex);
        addresses.ethereum = wallet.address;
        addresses.bsc = wallet.address;
        addresses.polygon = wallet.address;
        addresses.arbitrum = wallet.address;
        addresses.optimism = wallet.address;
      } catch (error) {
        console.error('EVM address derivation failed:', error);
      }
      
      // Bitcoin
      try {
        const ECPair = ECPairFactory(require('tiny-secp256k1'));
        // Convert hex string to Buffer properly using new Buffer constructor
        const privateKeyBuffer = new Buffer(privateKeyHex, 'hex');
        const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
        // Convert Uint8Array to Buffer for bitcoin.payments.p2pkh
        const publicKeyBuffer = Buffer.from(keyPair.publicKey);
        const payment = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer });
        const bitcoinAddress = payment.address;
        if (bitcoinAddress && typeof bitcoinAddress === 'string') {
          addresses.bitcoin = bitcoinAddress as string;
        }
      } catch (error) {
        console.error('Bitcoin address derivation failed:', error);
      }
      
      // Solana
      try {
        const keypair = Keypair.fromSecretKey(new Buffer(privateKeyHex, 'hex'));
        addresses.solana = keypair.publicKey.toString();
      } catch (error) {
        console.error('Solana address derivation failed:', error);
      }
      
      // TRON
      try {
        const tronWeb = new TronWeb({
          fullHost: 'https://api.trongrid.io',
          privateKey: privateKeyHex
        });
        addresses.tron = tronWeb.defaultAddress.base58;
      } catch (error) {
        console.error('TRON address derivation failed:', error);
      }
      
      return addresses;
    } catch (error) {
      console.error('Address derivation failed:', error);
      return {};
    }
  };

  const validatePrivateKey = (key: string) => {
    // Basic validation for private key (64 hex characters, with or without 0x prefix)
    const cleanKey = key.replace('0x', '');
    const isValid = /^[0-9a-fA-F]{64}$/.test(cleanKey);
    setIsValid(isValid);
    
    // If valid, derive addresses
    if (isValid) {
      const addresses: {[key: string]: string | false | undefined} = deriveAddresses(cleanKey);
      setDerivedAddresses(addresses);
    } else {
      setDerivedAddresses({});
    }
    
    return isValid;
  };

  const handlePrivateKeyChange = (value: string) => {
    setPrivateKey(value);
    validatePrivateKey(value);
  };

  const handleImport = async () => {
    if (isValid && password.trim()) {
      setIsImporting(true);
      
      try {
        const cleanPrivateKey = privateKey.replace('0x', '');
        
        // Create wallet data structure
        const walletData = {
          id: `imported_${Date.now()}`,
          name: 'Imported Wallet',
          type: 'imported',
          addresses: derivedAddresses,
          privateKey: cleanPrivateKey, // This will be encrypted
          password: password,
          createdAt: new Date().toISOString(),
          networks: Object.keys(derivedAddresses)
        };
        
        // Import wallet using context - use first available network
        const primaryNetwork = Object.keys(derivedAddresses)[0] || 'ethereum';
        await importWalletFromPrivateKey(cleanPrivateKey, primaryNetwork, password);
        
        toast.success('Wallet imported successfully!');
        onNavigate('create-ucpi');
        
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import wallet. Please try again.');
      } finally {
        setIsImporting(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="flex-1 text-center text-xl font-bold">
            Import Private Key
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enter your private key
          </h2>
          <p className="text-gray-600">
            Import your wallet using a private key
          </p>
        </motion.div>

        {/* Private Key Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Private Key
          </label>
          <div className="relative">
            <input
              type={showPrivateKey ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => handlePrivateKeyChange(e.target.value)}
              placeholder="Enter your private key (0x...)"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors pr-12 ${
                privateKey && !isValid
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : privateKey && isValid
                  ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                  : 'border-gray-300 focus:ring-[#180CB2] focus:border-[#180CB2]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {showPrivateKey ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          {privateKey && !isValid && (
            <p className="text-red-500 text-sm mt-1">
              Invalid private key format. Please enter a valid 64-character hex string.
            </p>
          )}
        </motion.div>

        {/* Password Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password to encrypt your wallet"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This password will be used to encrypt and protect your imported wallet
          </p>
        </motion.div>

        {/* Derived Addresses Display */}
        {Object.keys(derivedAddresses).length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Derived Addresses</h3>
            <div className="space-y-2">
              {Object.entries(derivedAddresses).map(([network, address]) => (
                <div key={network} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 capitalize">{network}</span>
                  <span className="text-xs font-mono text-gray-600 truncate max-w-[200px]">{address}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Security Warning */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-800 text-xs font-bold">!</span>
            </div>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Security Notice</p>
              <p className="text-yellow-700">
                Never share your private key with anyone. This information gives full access to your wallet.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Import Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleImport}
          disabled={!isValid || !password.trim() || isImporting}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            isValid && password.trim() && !isImporting
              ? 'bg-[#180CB2] hover:bg-[#140a8f] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isImporting ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Importing...</span>
            </div>
          ) : (
            'Import Wallet'
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ImportPrivateKeyScreen;
