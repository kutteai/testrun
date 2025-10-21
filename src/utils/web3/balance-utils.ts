import { getNetworks } from './network-utils';

// Get balance from RPC (real implementation)
export async function getBalance(address: string, network: string): Promise<string> {
  try {
    // eslint-disable-next-line no-console
    console.log(`🔍 DEBUG: getBalance called with address="${address}" (length: ${address?.length}), network="${network}"`);
    // eslint-disable-next-line no-console
    console.log(`🔍 DEBUG: address starts with 0x: ${address?.startsWith('0x')}`);
    
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    // Ensure address has 0x prefix for Ethereum-compatible networks
    let formattedAddress = address;
    if (network === 'ethereum' || network === 'bsc' || network === 'polygon' || network === 'arbitrum' || network === 'optimism' || network === 'avalanche') {
      if (!address.startsWith('0x')) {
        formattedAddress = '0x' + address;

      }
      
      // Check if the address has the correct length (42 characters for 0x + 40 hex chars)
      if (formattedAddress.length !== 42) {
        // eslint-disable-next-line no-console
        console.error(`❌ DEBUG: Invalid EVM address length: ${formattedAddress.length} (expected 42)`);
        // eslint-disable-next-line no-console
        console.error(`❌ DEBUG: Address: "${formattedAddress}"`);
        throw new Error(`Invalid address length: ${formattedAddress.length} characters, expected 42 for EVM address`);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [formattedAddress, 'latest'],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    if (error.name === 'AbortError') {
      // eslint-disable-next-line no-console
      console.error('Balance request timed out for', network);
    } else {
      // eslint-disable-next-line no-console
      console.error('Error getting balance for', network, ':', error);
    }
    // Always return "0" instead of throwing error
    return '0';
  }
}

// Get real balance with proper fallback handling
export async function getRealBalance(address: string, network: string): Promise<string> {
  try {

    // Handle different network types
    switch (network.toLowerCase()) {
      case 'bitcoin':
        return await getBitcoinBalance(address);
      case 'litecoin':
        return await getLitecoinBalance(address);
      case 'solana':
        return await getSolanaBalance(address);
      case 'tron':
        return await getTronBalance(address);
      case 'ton':
        return await getTonBalance(address);
      case 'xrp':
        return await getXrpBalance(address);
      default:
        // EVM networks (Ethereum, BSC, Polygon, etc.)
        return await getBalance(address, network);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Failed to get balance for ${address} on ${network}:`, error);
    // Always return "0" instead of throwing error
    return '0';
  }
}

// Non-EVM balance fetchers with proper fallback
async function getBitcoinBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    if (!response.ok) throw new Error('Bitcoin API failed');
    const data = await response.json();
    const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const balanceBTC = balanceSatoshis / 100000000;
    return balanceBTC.toFixed(8);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Bitcoin balance fetch failed:', error);
    return '0';
  }
}

async function getLitecoinBalance(address: string): Promise<string> {
  try {
    // Using BlockCypher API for Litecoin
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    if (!response.ok) throw new Error('Litecoin API failed');
    const data = await response.json();
    const balanceLTC = data.balance / 100000000; // Convert from litoshis to LTC
    return balanceLTC.toFixed(8);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Litecoin balance fetch failed:', error);
    return '0';
  }
}

async function getSolanaBalance(address: string): Promise<string> {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    if (!response.ok) throw new Error('Solana API failed');
    const data = await response.json();
    const balanceSOL = (data.result?.value || 0) / 1000000000; // Convert from lamports to SOL
    return balanceSOL.toFixed(9);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Solana balance fetch failed:', error);
    return '0';
  }
}

async function getTronBalance(address: string): Promise<string> {
  try {
    const response = await fetch('https://api.trongrid.io/v1/accounts/' + address);
    if (!response.ok) throw new Error('Tron API failed');
    const data = await response.json();
    const balanceTRX = (data.data?.[0]?.balance || 0) / 1000000; // Convert from sun to TRX
    return balanceTRX.toFixed(6);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Tron balance fetch failed:', error);
    return '0';
  }
}

async function getTonBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${address}`);
    if (!response.ok) throw new Error('TON API failed');
    const data = await response.json();
    const balanceTON = (data.result?.balance || 0) / 1000000000; // Convert from nanotons to TON
    return balanceTON.toFixed(9);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('TON balance fetch failed:', error);
    return '0';
  }
}

async function getXrpBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://data.ripple.com/v2/accounts/${address}/balances`);
    if (!response.ok) throw new Error('XRP API failed');
    const data = await response.json();
    const xrpBalance = data.balances?.find((b: any) => b.currency === 'XRP');
    return xrpBalance?.value || '0';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('XRP balance fetch failed:', error);
    return '0';
  }
}
