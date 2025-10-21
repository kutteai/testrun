// PayCio Wallet - Balance Fetching Function
// Simplified version without external dependencies

// Get native token balance
async function getNativeBalance(address, network) {
  const rpcUrls = {
    ethereum: 'https://eth.llamarpc.com',
    bsc: 'https://bsc-dataseed1.binance.org',
    polygon: 'https://polygon-rpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  };

  const rpcUrl = rpcUrls[network.toLowerCase()];

  if (!rpcUrl) {
    // Handle non-EVM networks
    switch (network.toLowerCase()) {
      case 'bitcoin':
        return getBitcoinBalance(address);
      case 'litecoin':
        return getLitecoinBalance(address);
      case 'solana':
        return getSolanaBalance(address);
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  // EVM networks
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  // Convert hex to decimal and then to ether (simplified)
  const balanceWei = BigInt(data.result || '0x0');
  const balanceEther = Number(balanceWei) / 10 ** 18;
  return balanceEther.toFixed(6);
}

// Get token balance (simplified)
async function getTokenBalance(tokenAddress, walletAddress, network) {
  const rpcUrls = {
    ethereum: 'https://eth.llamarpc.com',
    bsc: 'https://bsc-dataseed1.binance.org',
    polygon: 'https://polygon-rpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  };

  const rpcUrl = rpcUrls[network.toLowerCase()];
  if (!rpcUrl) {
    throw new Error(`Token balances not supported for ${network}`);
  }

  // Call balanceOf function
  const paddedAddress = walletAddress.slice(2).padStart(64, '0');
  const data = `0x70a08231000000000000000000000000${paddedAddress}`;

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data,
      }, 'latest'],
      id: 1,
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message);
  }

  // Convert hex to decimal (simplified, assumes 18 decimals)
  const balanceWei = BigInt(result.result || '0x0');
  const balance = Number(balanceWei) / 10 ** 18;
  return balance.toFixed(6);
}

// Bitcoin balance
async function getBitcoinBalance(address) {
  try {
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    const data = await response.json();
    const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const balanceBTC = balanceSatoshis / 100000000;
    return balanceBTC.toFixed(8);
  } catch (err) {
    console.error('Bitcoin balance fetch error:', err);
    return '0';
  }
}

// Litecoin balance
async function getLitecoinBalance(address) {
  try {
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    const data = await response.json();
    const balanceLTC = data.balance / 100000000;
    return balanceLTC.toFixed(8);
  } catch (err) {
    console.error('Litecoin balance fetch error:', err);
    return '0';
  }
}

// Solana balance
async function getSolanaBalance(address) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });

    const data = await response.json();
    const balanceSOL = (data.result?.value || 0) / 1000000000;
    return balanceSOL.toFixed(9);
  } catch (err) {
    console.error('Solana balance fetch error:', err);
    return '0';
  }
}

exports.handler = async (event, _context) => {
  // Enable CORS for Chrome extension
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const {
      network, address, tokenAddress, type,
    } = JSON.parse(event.body || '{}');

    if (!network || !address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Network and address are required',
        }),
      };
    }

    let balance = '0';
    let handlerError = null; // Renamed to avoid conflict with catch block

    try {
      if (type === 'token' && tokenAddress) {
        // Get token balance
        balance = await getTokenBalance(tokenAddress, address, network);
      } else {
        // Get native balance
        balance = await getNativeBalance(address, network);
      }
    } catch (err) {
      handlerError = err.message;
      console.error('Balance fetch error:', err);
    }

    const result = {
      network,
      address,
      tokenAddress,
      balance,
      type: type || 'native',
      error: handlerError,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Balance handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Balance fetch failed',
        message: error.message,
      }),
    };
  }
};
