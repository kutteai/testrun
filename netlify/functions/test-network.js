// PayCio Wallet - Network Testing Function
// Test custom network connections

exports.handler = async (event, context) => {
  // Enable CORS for Chrome extension
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { networkId, rpcUrl, chainId } = JSON.parse(event.body);
    
    if (!rpcUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'RPC URL is required'
        })
      };
    }

    const startTime = Date.now();
    let isConnected = false;
    let blockNumber = null;
    let actualChainId = null;
    let error = null;

    try {
      // Test EVM network connection
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.result) {
        blockNumber = parseInt(data.result, 16);
        
        // Get chain ID
        const chainResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        });

        const chainData = await chainResponse.json();
        if (chainData.result) {
          actualChainId = parseInt(chainData.result, 16).toString();
        }

        // Verify chain ID matches if provided
        if (chainId && actualChainId && actualChainId !== chainId) {
          error = `Chain ID mismatch: expected ${chainId}, got ${actualChainId}`;
        } else {
          isConnected = true;
        }
      }
      
    } catch (err) {
      error = err.message;
      console.error('Network test error:', err);
    }

    const responseTime = Date.now() - startTime;
    
    const result = {
      networkId: networkId || 'custom',
      rpcUrl,
      isConnected,
      responseTime,
      blockNumber,
      chainId: actualChainId,
      expectedChainId: chainId,
      error,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Network test handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Network test failed',
        message: error.message
      })
    };
  }
};