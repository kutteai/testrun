import { getNetworks } from './network-utils';
import { getGasPrice } from './gas-utils';

// Estimate gas limit (real implementation)
export async function estimateGas(
  from: string,
  to: string,
  value: string,
  txData: string = '0x',
  network: string
): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_estimateGas',
        params: [{
          from,
          to,
          value,
          data: txData
        }],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error estimating gas:', error);
    return '0x0';
  }
}

// Get transaction count (nonce) - real implementation
export async function getTransactionCount(address: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting transaction count:', error);
    return '0x0';
  }
}

// Sign transaction with private key - real implementation
export async function signTransaction(
  transaction: any,
  privateKey: string,
  network: string
): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey);
    
    // Prepare transaction object
    const tx = {
      to: transaction.to,
      value: transaction.value || '0x0',
      data: transaction.data || '0x',
      gasLimit: transaction.gasLimit || '0x5208', // Default 21000
      gasPrice: transaction.gasPrice || await getGasPrice(network),
      nonce: transaction.nonce || await getTransactionCount(wallet.address, network)
    };
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    return signedTx;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error signing transaction:', error);
    throw error;
  }
}

// Send signed transaction - real implementation
export async function sendSignedTransaction(signedTransaction: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTransaction],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending signed transaction:', error);
    throw error;
  }
}

// Sign message - real implementation
export async function signMessage(message: string, privateKey: string): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    
    return signature;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error signing message:', error);
    throw error;
  }
}

// Sign typed data - real implementation
export async function signTypedData(
  typedData: any,
  privateKey: string
): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.value
    );
    
    return signature;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error signing typed data:', error);
    throw error;
  }
}

// Send raw transaction (real implementation)
export async function sendRawTransaction(signedTransaction: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTransaction],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending transaction:', error);
    throw error;
  }
}
