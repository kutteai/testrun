export interface BitcoinTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  type: 'send' | 'receive';
  address: string;
}

// Bitcoin network configuration
const BITCOIN_NETWORKS = {
  mainnet: {
    apiUrl: 'https://blockstream.info/api',
    explorerUrl: 'https://blockstream.info'
  },
  testnet: {
    apiUrl: 'https://blockstream.info/testnet/api',
    explorerUrl: 'https://blockstream.info/testnet'
  }
};

// Get Bitcoin balance
export async function getBitcoinBalance(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<string> {
  try {
    const apiUrl = BITCOIN_NETWORKS[network].apiUrl;
    const response = await fetch(`${apiUrl}/address/${address}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Bitcoin balance');
    }
    
    const data = await response.json();
    const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const balanceBTC = balanceSatoshis / 100000000; // Convert satoshis to BTC
    
    return balanceBTC.toFixed(8);
  } catch (error) {
    console.error('Error fetching Bitcoin balance:', error);
    return '0';
  }
}

// Get Bitcoin transaction history
export async function getBitcoinTransactions(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<BitcoinTransaction[]> {
  try {
    const apiUrl = BITCOIN_NETWORKS[network].apiUrl;
    const response = await fetch(`${apiUrl}/address/${address}/txs`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Bitcoin transactions');
    }
    
    const transactions = await response.json();
    
    return transactions.map((tx: any) => ({
      txid: tx.txid,
      amount: tx.vout.reduce((sum: number, output: any) => {
        if (output.scriptpubkey_address === address) {
          return sum + (output.value / 100000000);
        }
        return sum;
      }, 0),
      confirmations: tx.status.confirmed ? 1 : 0,
      blockHeight: tx.status.block_height,
      timestamp: tx.status.block_time || Date.now() / 1000,
      type: 'receive', // Simplified - would need to check inputs for send transactions
      address
    }));
  } catch (error) {
    console.error('Error fetching Bitcoin transactions:', error);
    return [];
  }
}

// Validate Bitcoin address (basic validation)
export function validateBitcoinAddress(address: string): boolean {
  // Basic Bitcoin address validation
  const bitcoinAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  return bitcoinAddressRegex.test(address);
}

// Get Bitcoin network fee estimate
export async function getBitcoinFeeEstimate(
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<number> {
  try {
    const apiUrl = BITCOIN_NETWORKS[network].apiUrl;
    const response = await fetch(`${apiUrl}/fee-estimates`);
    
    if (!response.ok) {
      return 0.001; // Default fee
    }
    
    const feeEstimates = await response.json();
    // Return fee for 1 block confirmation (sat/vB)
    return (feeEstimates['1'] || 10) / 100000000; // Convert to BTC
  } catch (error) {
    console.error('Error fetching Bitcoin fee estimate:', error);
    return 0.001; // Default fee
  }
}


