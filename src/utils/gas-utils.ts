import { ethers } from 'ethers';
import { storage } from './storage-utils';

export interface GasSettings {
  priority: 'low' | 'medium' | 'high' | 'custom';
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: string;
  customGasPrice?: string;
}

export interface TransactionSettings {
  gasSettings: GasSettings;
  autoApprove: boolean;
  sessionTimeout: number; // in minutes
}

// Default gas settings
export const DEFAULT_GAS_SETTINGS: GasSettings = {
  priority: 'medium'
};

// Gas priority presets - realistic current market values
export const GAS_PRESETS = {
  low: {
    maxFeePerGas: '500000000', // 0.5 gwei (realistic low)
    maxPriorityFeePerGas: '100000000', // 0.1 gwei (realistic tip)
    description: 'Slow but cheap (~30 sec)'
  },
  medium: {
    maxFeePerGas: '1000000000', // 1 gwei (realistic standard)
    maxPriorityFeePerGas: '200000000', // 0.2 gwei (realistic tip)
    description: 'Balanced speed and cost (~15 sec)'
  },
  high: {
    maxFeePerGas: '2000000000', // 2 gwei (realistic fast)
    maxPriorityFeePerGas: '500000000', // 0.5 gwei (realistic tip)
    description: 'Fast but expensive (~5 sec)'
  }
};

// Get current gas prices from network using real-time service
export async function getCurrentGasPrices(rpcUrl: string, network?: string): Promise<{
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasPrice: string;
}> {
  try {
    // Method 1: Try real-time gas service if network is provided
    if (network) {
      try {
        const { realTimeGasService } = await import('./real-time-gas-prices');
        const gasData = await realTimeGasService.getGasPrices(network);
        
        return {
          maxFeePerGas: ethers.parseUnits(gasData.maxFeePerGas?.toString() || gasData.gasPrice.toString(), 'gwei').toString(),
          maxPriorityFeePerGas: ethers.parseUnits(gasData.maxPriorityFeePerGas?.toString() || '2', 'gwei').toString(),
          gasPrice: ethers.parseUnits(gasData.gasPrice.toString(), 'gwei').toString()
        };
      } catch (realTimeError) {
        console.warn('Real-time gas service failed, falling back to RPC:', realTimeError);
      }
    }
    
    // Method 2: Fallback to RPC call
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    
    return {
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
      gasPrice: feeData.gasPrice?.toString() || '0'
    };
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    // Throw error instead of returning fallback values - no mock data
    throw new Error(`Failed to fetch gas prices: ${error instanceof Error ? error.message : 'Unknown error'}. Real gas price API integration required.`);
  }
}

// Estimate gas limit for a transaction
export async function estimateGasLimit(
  rpcUrl: string,
  from: string,
  to: string,
  data: string,
  value: string = '0'
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const gasLimit = await provider.estimateGas({
      from,
      to,
      data,
      value
    });
    
    // Add 20% buffer for safety
    const buffer = gasLimit * 120n / 100n;
    return buffer.toString();
  } catch (error) {
    console.error('Error estimating gas limit:', error);
    return '21000'; // Default gas limit for simple transfers
  }
}

// Apply gas settings to transaction
export function applyGasSettings(
  transaction: any,
  gasSettings: GasSettings,
  currentGasPrices: any
): any {
  const tx = { ...transaction };
  
  switch (gasSettings.priority) {
    case 'low':
      tx.maxFeePerGas = GAS_PRESETS.low.maxFeePerGas;
      tx.maxPriorityFeePerGas = GAS_PRESETS.low.maxPriorityFeePerGas;
      break;
    case 'medium':
      tx.maxFeePerGas = GAS_PRESETS.medium.maxFeePerGas;
      tx.maxPriorityFeePerGas = GAS_PRESETS.medium.maxPriorityFeePerGas;
      break;
    case 'high':
      tx.maxFeePerGas = GAS_PRESETS.high.maxFeePerGas;
      tx.maxPriorityFeePerGas = GAS_PRESETS.high.maxPriorityFeePerGas;
      break;
    case 'custom':
      if (gasSettings.maxFeePerGas) {
        tx.maxFeePerGas = gasSettings.maxFeePerGas;
      }
      if (gasSettings.maxPriorityFeePerGas) {
        tx.maxPriorityFeePerGas = gasSettings.maxPriorityFeePerGas;
      }
      if (gasSettings.customGasPrice) {
        tx.gasPrice = gasSettings.customGasPrice;
      }
      break;
  }
  
  if (gasSettings.gasLimit) {
    tx.gasLimit = gasSettings.gasLimit;
  }
  
  return tx;
}

// Save gas settings to storage
export async function saveGasSettings(gasSettings: GasSettings): Promise<void> {
  try {
    await storage.set({ gasSettings });
    console.log('✅ Gas settings saved');
  } catch (error) {
    console.error('Error saving gas settings:', error);
    throw error;
  }
}

// Load gas settings from storage
export async function loadGasSettings(): Promise<GasSettings> {
  try {
    const result = await storage.get(['gasSettings']);
    return result.gasSettings || DEFAULT_GAS_SETTINGS;
  } catch (error) {
    console.error('Error loading gas settings:', error);
    return DEFAULT_GAS_SETTINGS;
  }
}

// Save transaction settings
export async function saveTransactionSettings(settings: TransactionSettings): Promise<void> {
  try {
    await storage.set({ transactionSettings: settings });
    console.log('✅ Transaction settings saved');
  } catch (error) {
    console.error('Error saving transaction settings:', error);
    throw error;
  }
}

// Load transaction settings
export async function loadTransactionSettings(): Promise<TransactionSettings> {
  try {
    const result = await storage.get(['transactionSettings']);
    return result.transactionSettings || {
      gasSettings: DEFAULT_GAS_SETTINGS,
      autoApprove: false,
      sessionTimeout: 15 // 15 minutes default
    };
  } catch (error) {
    console.error('Error loading transaction settings:', error);
    return {
      gasSettings: DEFAULT_GAS_SETTINGS,
      autoApprove: false,
      sessionTimeout: 15
    };
  }
}




