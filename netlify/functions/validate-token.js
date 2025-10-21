// PayCio Wallet - Token Validation Function
// Simplified version without external dependencies

// Validate via direct RPC call (simplified without ethers)
async function validateViaRPC(address, network) {
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
    throw new Error(`Unsupported network: ${network}`);
  }

  // Check if contract exists
  const codeResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [address, 'latest'],
      id: 1,
    }),
  });

  const codeData = await codeResponse.json();

  if (codeData.error) {
    throw new Error(codeData.error.message);
  }

  // If no code, not a contract
  if (!codeData.result || codeData.result === '0x') {
    throw new Error('No contract found at address');
  }

  // Try to call symbol() function
  const symbolResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: address,
        data: '0x95d89b41', // symbol() function selector
      }, 'latest'],
      id: 1,
    }),
  });

  const symbolData = await symbolResponse.json();

  if (symbolData.error) {
    throw new Error('Contract does not implement token interface');
  }

  // Basic symbol extraction
  let symbol = 'TOKEN';
  try {
    if (symbolData.result && symbolData.result !== '0x') {
      const hex = symbolData.result.slice(2);
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        if (byte > 0 && byte < 128) bytes.push(byte);
      }
      symbol = String.fromCharCode(...bytes).replace(/\0/g, '').trim() || 'TOKEN';
    }
  } catch (_e) {
    symbol = 'TOKEN';
  }

  return {
    name: `${symbol} Token`,
    symbol,
    decimals: 18,
    totalSupply: '0',
    address,
  };
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { address, network } = JSON.parse(event.body);

    if (!address || !network) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Address and network are required',
        }),
      };
    }

    // Basic address format validation
    const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(address);
    if (!isValidFormat) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid address format',
        }),
      };
    }

    let tokenInfo = null;
    let validationMethod = 'none';

    // Try RPC validation (no API keys needed)
    try {
      tokenInfo = await validateViaRPC(address, network);
      validationMethod = 'rpc';
    } catch (error) {
      console.warn('RPC validation failed:', error.message);

      // Fallback: assume valid if format is correct
      tokenInfo = {
        address,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
        totalSupply: '0',
      };
      validationMethod = 'format';
    }

    const result = {
      isValid: !!tokenInfo,
      tokenInfo,
      validationMethod,
      network,
      address,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Token validation failed',
        message: error.message,
      }),
    };
  }
};
