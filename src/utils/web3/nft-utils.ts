import { getConfig } from '../../utils/config-utils';

// Get NFT metadata from OpenSea API (real implementation)
export async function getNftMetadata(contractAddress: string, tokenId: string, network: string): Promise<any> {
  try {
    const config = getConfig();
    const apiKey = config.OPENSEA_API_KEY;

    if (!apiKey) {
      throw new Error('OpenSea API key required for NFT metadata');
    }

    let baseUrl = '';
    if (network === 'ethereum') {
      baseUrl = 'https://api.opensea.io/api/v2';
    } else if (network === 'polygon') {
      baseUrl = 'https://api.opensea.io/api/v2'; // OpenSea supports Polygon on V2
    } else {
      throw new Error(`Unsupported network for OpenSea API: ${network}`);
    }

    const url = `${baseUrl}/chain/${network}/contract/${contractAddress}/nfts/${tokenId}`;

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.nft;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting NFT metadata:', error);
    return null;
  }
}

// Get NFTs for an address from OpenSea API (real implementation)
export async function getNftsForAddress(address: string, network: string): Promise<any[]> {
  try {
    const config = getConfig();
    const apiKey = config.OPENSEA_API_KEY;

    if (!apiKey) {
      throw new Error('OpenSea API key required for NFTs');
    }

    let baseUrl = '';
    if (network === 'ethereum') {
      baseUrl = 'https://api.opensea.io/api/v2';
    } else if (network === 'polygon') {
      baseUrl = 'https://api.opensea.io/api/v2'; // OpenSea supports Polygon on V2
    } else {
      throw new Error(`Unsupported network for OpenSea API: ${network}`);
    }

    const url = `${baseUrl}/chain/${network}/account/${address}/nfts`;

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.nfts || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting NFTs for address:', error);
    return [];
  }
}

