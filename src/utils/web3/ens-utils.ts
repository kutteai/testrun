import { getSafeConfig } from '../../utils/config-utils';

// Get ENS address from name (real implementation)
export async function getEnsAddress(name: string): Promise<string | null> {
  try {
    const config = getSafeConfig();
    const ensRpcUrl = config.ENS_RPC_URL;

    if (!ensRpcUrl) {
      throw new Error('ENS RPC URL is not configured.');
    }

    const response = await fetch(ensRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1E', // ENS Registry address
          data: `0x3681b89f${(name.length * 2).toString(16).padStart(64, '0')}${Buffer.from(name).toString('hex').padEnd(64, '0')}`
        }, 'latest'],
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

    const address = data.result;
    return address === '0x0000000000000000000000000000000000000000' ? null : address;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting ENS address:', error);
    return null;
  }
}

// Get ENS name from address (real implementation)
export async function getEnsName(address: string): Promise<string | null> {
  try {
    const config = getSafeConfig();
    const ensRpcUrl = config.ENS_RPC_URL;

    if (!ensRpcUrl) {
      throw new Error('ENS RPC URL is not configured.');
    }

    const response = await fetch(ensRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0x3671C69438060c4C000000000000000000000000', // Reverse Registrar address
          data: `0x2a55255a${address.slice(2).padStart(64, '0')}`
        }, 'latest'],
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

    const name = data.result;
    return name === '0x0000000000000000000000000000000000000000' ? null : name;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting ENS name:', error);
    return null;
  }
}

