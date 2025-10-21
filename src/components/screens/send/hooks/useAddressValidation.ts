import { useState, useEffect } from 'react';
import { useNetwork } from '../../../store/NetworkContext';
import { resolveENS } from '../../../utils/ens-utils';
import { handleError } from '../../../utils/error-handler';

export const useAddressValidation = (toAddress: string, addressType: string) => {
  const { currentNetwork } = useNetwork();
  const [isAddressValid, setIsAddressValid] = useState(false);

  useEffect(() => {
    if (toAddress) {
      validateAddressInput(toAddress);
    }
  }, [toAddress, addressType, currentNetwork]);

  const validateAddressInput = (value: string) => {
    // Network-specific validation based on current network
    if (addressType === 'address') {
      const networkId = currentNetwork?.id || 'ethereum';
      let isValid = false;


      switch (networkId) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'avalanche':
        case 'arbitrum':
        case 'optimism': {
          // EVM networks - Ethereum address format
          const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
          isValid = ethAddressRegex.test(value);
          break;
        }

        case 'bitcoin': {
          // Bitcoin address validation (P2PKH, P2SH, Bech32)
          const btcAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
          isValid = btcAddressRegex.test(value);
          break;
        }

        case 'solana': {
          // Solana address validation (Base58, 32-44 characters)
          const solAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
          isValid = solAddressRegex.test(value);
          break;
        }

        case 'tron': {
          // TRON address validation (Base58, starts with 'T')
          const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
          isValid = tronAddressRegex.test(value);
          break;
        }

        case 'xrp': {
          // XRP address validation (Base58, starts with 'r')
          const xrpAddressRegex = /^r[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
          isValid = xrpAddressRegex.test(value);
          break;
        }

        case 'ton': {
          // TON address validation (Base64, starts with 'EQ' or 'UQ')
          const tonAddressRegex = /^(EQ|UQ)[A-Za-z0-9_-]{44,48}$/;
          isValid = tonAddressRegex.test(value);
          break;
        }

        case 'litecoin': {
          // Litecoin address validation (similar to Bitcoin)
          const ltcAddressRegex = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/;
          isValid = ltcAddressRegex.test(value);
          break;
        }

        default: {
          // Fallback to Ethereum validation for unknown networks
          const fallbackRegex = /^0x[a-fA-F0-9]{40}$/;
          isValid = fallbackRegex.test(value);
          break;
        }
      }

      setIsAddressValid(isValid);
    } else if (addressType === 'ens') {
      // Enhanced ENS validation with multi-chain support
      const networkId = currentNetwork?.id || 'ethereum';
      let isValid = false;

      // Network-specific domain validation
      switch (networkId) {
        case 'ethereum':
        case 'arbitrum':
        case 'optimism':
        case 'base': {
          // Ethereum-based networks support .eth domains
          const ensRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.eth$/;
          isValid = ensRegex.test(value.toLowerCase());
          break;
        }

        case 'bsc':
        case 'binance': {
          // BSC network supports .bnb domains (Space ID)
          const bnbRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.bnb$/;
          isValid = bnbRegex.test(value.toLowerCase());
          break;
        }

        case 'polygon': {
          // Polygon supports .polygon domains
          const polygonRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.polygon$/;
          isValid = polygonRegex.test(value.toLowerCase());
          break;
        }

        case 'avalanche': {
          // Avalanche supports .avax domains
          const avaxRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.avax$/;
          isValid = avaxRegex.test(value.toLowerCase());
          break;
        }

        case 'solana': {
          // Solana supports .sol domains
          const solRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.sol$/;
          isValid = solRegex.test(value.toLowerCase());
          break;
        }

        case 'tron': {
          // TRON supports .trx domains
          const trxRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.trx$/;
          isValid = trxRegex.test(value.toLowerCase());
          break;
        }

        default: {
          // Multi-chain domains (Unstoppable Domains)
          const multiChainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.(crypto|nft|blockchain|bitcoin|dao|888|wallet|x|klever|zil)$/;
          isValid = multiChainRegex.test(value.toLowerCase());
          break;
        }
      }

      setIsAddressValid(isValid);
    } else if (addressType === 'ucpi') {
      // UCPI ID validation (alphanumeric, 6-20 characters)
      const ucpiRegex = /^[a-zA-Z0-9]{6,20}$/;
      setIsAddressValid(ucpiRegex.test(value));
    }
  };

  // Test function for debugging address validation
  const testAddressValidation = (testAddress: string) => {

    const networkId = currentNetwork?.id || 'ethereum';
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    const isValid = ethAddressRegex.test(testAddress);


    // Check for hidden characters

    return isValid;
  };

  // Test the specific failing address
  const testFailingAddress = () => {
    const failingAddress = '0x100A87f0755545bB9B7ab096B2E2a3A3e083e4A4';
    return testAddressValidation(failingAddress);
  };

  return {
    isAddressValid,
    setIsAddressValid,
    handleAddressChange: validateAddressInput,
    testAddressValidation,
    testFailingAddress,
  };
};
