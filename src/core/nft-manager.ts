import { ethers } from 'ethers';
import { storage } from '../utils/storage-utils';
import { NETWORK_CONFIGS } from '../background/index'; // Import NETWORK_CONFIGS for consistent network info

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'; // Define IPFS Gateway as a constant

export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata: Record<string, string | number | boolean>;
  owner: string;
  network: string;
  collection: {
    name: string;
    symbol: string;
    description?: string;
    imageUrl?: string;
  };
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  rarity?: {
    rank?: number;
    score?: number;
    totalSupply?: number;
  };
  lastUpdated: number;
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  contractAddress: string;
  network: string;
  totalSupply: number;
  floorPrice?: number;
  totalVolume?: number;
  owners: number;
}

export class NFTManager {
  private nfts: NFT[] = [];
  private collections: NFTCollection[] = [];

  constructor() {
    this.loadNFTData();
  }

  // Load NFT data from storage
  private async loadNFTData(): Promise<void> {
    try {
      const result = await storage.get(['nfts', 'nftCollections']);
      if (result.nfts) {
        this.nfts = result.nfts;
      }
      if (result.nftCollections) {
        this.collections = result.nftCollections;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load NFT data:', error);
    }
  }

  // Save NFT data to storage
  private async saveNFTData(): Promise<void> {
    try {
      await storage.set({
        nfts: this.nfts,
        nftCollections: this.collections
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save NFT data:', error);
    }
  }

  // Get wallet from storage
  private async getWalletFromStorage(): Promise<any> {
    try {
      const result = await storage.get(['wallet']);
      return result.wallet || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get wallet from storage:', error);
      return null;
    }
  }

  // Import NFTs for a wallet address
  async importNFTs(address: string, network: string): Promise<NFT[]> {
    try {
      const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
      if (!networkConfig) {
        console.warn(`Unsupported network for NFT import: ${network}`);
        return [];
      }

      const nfts: NFT[] = [];
      const collectionsToUpdate = new Map<string, NFTCollection>();

      // Attempt to fetch from various sources with graceful fallback
      const fetchedOpenSea = await this.fetchFromOpenSea(address, network);
      if (fetchedOpenSea) {
        nfts.push(...fetchedOpenSea);
      }

      const fetchedAlchemy = await this.fetchFromAlchemy(address, network);
      if (fetchedAlchemy) {
        nfts.push(...fetchedAlchemy);
      }

      const fetchedPolygonScan = await this.fetchFromPolygonScan(address, network);
      if (fetchedPolygonScan) {
        nfts.push(...fetchedPolygonScan);
      }

      // Deduplicate and merge NFTs
      const uniqueNfts = new Map<string, NFT>();
      nfts.forEach(nft => {
        const key = `${nft.contractAddress}-${nft.tokenId}`;
        uniqueNfts.set(key, { ...uniqueNfts.get(key), ...nft });
      });

      const finalNfts = Array.from(uniqueNfts.values());

      // Update collections based on imported NFTs
      finalNfts.forEach(nft => {
        if (nft.collection) {
          const collectionKey = `${nft.collection.name}-${nft.network}`;
          const existingCollection = collectionsToUpdate.get(collectionKey) || {
            id: collectionKey,
            name: nft.collection.name,
            symbol: nft.collection.symbol || '',
            contractAddress: nft.contractAddress,
            network: nft.network,
            totalSupply: 0,
            owners: 0,
          };
          collectionsToUpdate.set(collectionKey, existingCollection);
        }
      });

      // Update internal state and storage
      this.nfts = [...this.nfts.filter(existingNft => !finalNfts.some(newNft => newNft.id === existingNft.id)), ...finalNfts];
      
      collectionsToUpdate.forEach(updatedCollection => {
        const existingIndex = this.collections.findIndex(c => c.id === updatedCollection.id);
        if (existingIndex > -1) {
          this.collections[existingIndex] = { ...this.collections[existingIndex], ...updatedCollection };
        } else {
          this.collections.push(updatedCollection);
        }
      });

      await this.saveNFTData();
      return finalNfts;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to import NFTs:', error);
      return [];
    }
  }

  // Fetch NFTs from OpenSea API
  private async fetchFromOpenSea(address: string, network: string): Promise<NFT[] | null> {
    try {
      const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
      if (!networkConfig || !networkConfig.apiKey) {
        console.warn(`OpenSea API key or network config not found for ${network}`);
        return null; // Return null for graceful fallback
      }
      const apiKey = networkConfig.apiKey; // Use apiKey from NETWORK_CONFIGS

      // OpenSea API endpoints (these might need to be configurable in NETWORK_CONFIGS if they vary a lot)
      const openseaApiEndpoints: Record<string, string> = {
        ethereum: 'https://api.opensea.io/api/v1',
        goerli: 'https://testnets-api.opensea.io/api/v1',
        polygon: 'https://api.opensea.io/api/v1', // OpenSea supports Polygon mainnet
        // Add other networks as OpenSea supports them
      };

      const baseUrl = openseaApiEndpoints[network.toLowerCase()];
      if (!baseUrl) {
        console.warn(`OpenSea API endpoint not configured for network: ${network}`);
        return null; // Return null for graceful fallback
      }

      const url = `${baseUrl}/assets?owner=${address}&order_direction=desc&offset=0&limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': apiKey, // Use the API key from network config
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`OpenSea API error for ${address} on ${network}: HTTP status ${response.status}`);
        return null; // Return null for graceful fallback
      }

      const data = await response.json();
      
      return data.assets.map((asset: any) => ({
        id: `${asset.asset_contract.address}-${asset.token_id}`,
        tokenId: asset.token_id,
        contractAddress: asset.asset_contract.address,
        name: asset.name || `${asset.asset_contract.name} #${asset.token_id}`,
        description: asset.description || '',
        imageUrl: asset.image_url || asset.image_thumbnail_url || '',
        metadata: asset.traits || {},
        owner: address,
        network: network,
        collection: {
          name: asset.asset_contract.name,
          symbol: asset.asset_contract.symbol,
          description: asset.asset_contract.description,
          imageUrl: asset.asset_contract.image_url
        },
        attributes: asset.traits?.map((trait: any) => ({
          trait_type: trait.trait_type,
          value: trait.value,
          display_type: trait.display_type
        })) || [],
        lastUpdated: Date.now()
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching from OpenSea:', error);
      return null; // Return null for graceful fallback
    }
  }

  // Fetch NFTs from Alchemy API
  private async fetchFromAlchemy(address: string, network: string): Promise<NFT[] | null> {
    try {
      const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
      if (!networkConfig || !networkConfig.apiKey || !networkConfig.rpcUrl) {
        console.warn(`Alchemy API key or network config not found for ${network}`);
        return null; // Return null for graceful fallback
      }
      const alchemyApiKey = networkConfig.apiKey; // Assuming apiKey in NETWORK_CONFIGS is Alchemy API key
      const alchemyRpcUrl = networkConfig.rpcUrl; // Assuming rpcUrl can be used as Alchemy base URL

      // Alchemy API base URL typically includes the API key in the URL itself for NFT API
      // This might need adjustment if the actual Alchemy API usage is different.
      // For now, we'll construct a general Alchemy NFT API URL.
      const alchemyBaseUrl = alchemyRpcUrl.replace(/v3\/[^/]+/, `v3/${alchemyApiKey}`);
      
      const url = `${alchemyBaseUrl}/getNFTs/?owner=${address}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.warn(`Alchemy API error for ${address} on ${network}: HTTP status ${response.status}`);
        return null; // Return null for graceful fallback
      }

      const data = await response.json();
      
      return data.ownedNfts.map((nft: any) => ({
        id: `${nft.contract.address}-${nft.id.tokenId}`,
        tokenId: nft.id.tokenId,
        contractAddress: nft.contract.address,
        name: nft.title || `NFT #${nft.id.tokenId}`,
        description: nft.description || '',
        imageUrl: nft.media?.[0]?.gateway || nft.media?.[0]?.raw || '',
        metadata: nft.metadata?.attributes || {},
        owner: address,
        network: network, 
        collection: {
          name: nft.contract.name,
          symbol: nft.contract.symbol
        },
        attributes: nft.metadata?.attributes?.map((attr: any) => ({
          trait_type: attr.trait_type,
          value: attr.value
        })) || [],
        lastUpdated: Date.now()
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching from Alchemy:', error);
      return null; // Return null for graceful fallback
    }
  }

  // Fetch NFTs from PolygonScan API
  private async fetchFromPolygonScan(address: string, network: string): Promise<NFT[] | null> {
    try {
      const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
      if (!networkConfig || !networkConfig.apiKey) {
        console.warn(`PolygonScan API key or network config not found for ${network}`);
        return null; // Return null for graceful fallback
      }
      const apiKey = networkConfig.apiKey;

      const baseUrl = 'https://api.polygonscan.com/api';
      const url = `${baseUrl}?module=account&action=tokennfttx&address=${address}&apikey=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`PolygonScan API error for ${address} on ${network}: HTTP status ${response.status}`);
        return null; // Return null for graceful fallback
      }

      const data = await response.json();
      
      if (data.status !== '1') {
        console.warn(`PolygonScan API error for ${address} on ${network}: ${data.message}`);
        return null; // Return null for graceful fallback
      }

      const nftTransactions = data.result;

      // Group by contract and token ID to get current ownership
      const ownershipMap = new Map<string, any>();
      
      nftTransactions.forEach((tx: any) => {
        const key = `${tx.contractAddress}-${tx.tokenID}`;
        if (tx.to.toLowerCase() === address.toLowerCase()) {
          ownershipMap.set(key, tx);
        } else if (tx.from.toLowerCase() === address.toLowerCase()) {
          ownershipMap.delete(key);
        }
      });

      // Fetch full metadata for each owned NFT
      const ownedNfts: NFT[] = [];
      for (const tx of Array.from(ownershipMap.values())) {
        try {
          const metadata = await this.getNFTMetadata(tx.contractAddress, tx.tokenID, network);
          if (metadata) {
            ownedNfts.push({
              id: `${tx.contractAddress}-${tx.tokenID}`,
              tokenId: tx.tokenID,
              contractAddress: tx.contractAddress,
              name: metadata.name || `NFT #${tx.tokenID}`,
              description: metadata.description || '',
              imageUrl: metadata.image?.replace('ipfs://', IPFS_GATEWAY) || '',
              metadata: metadata,
              owner: address,
              network: network,
              collection: {
                name: tx.tokenName || metadata.collection || 'Unknown Collection',
                symbol: tx.tokenSymbol || 'NFT',
                description: metadata.description,
                imageUrl: metadata.image?.replace('ipfs://', IPFS_GATEWAY),
              },
              attributes: metadata.attributes || [],
              lastUpdated: Date.now()
            });
          } else {
            console.warn(`Failed to fetch metadata for NFT ${tx.contractAddress}/${tx.tokenID} on ${network}`);
            ownedNfts.push({
              id: `${tx.contractAddress}-${tx.tokenID}`,
              tokenId: tx.tokenID,
              contractAddress: tx.contractAddress,
              name: `NFT #${tx.tokenID}`,
              description: '',
              imageUrl: '',
              metadata: {},
              owner: address,
              network: network,
              collection: {
                name: tx.tokenName || 'Unknown Collection',
                symbol: tx.tokenSymbol || 'NFT'
              },
              lastUpdated: Date.now()
            });
          }
        } catch (metadataError) {
          console.error(`Error fetching metadata for ${tx.contractAddress}/${tx.tokenID}:`, metadataError);
          ownedNfts.push({
            id: `${tx.contractAddress}-${tx.tokenID}`,
            tokenId: tx.tokenID,
            contractAddress: tx.contractAddress,
            name: `NFT #${tx.tokenID}`,
            description: '',
            imageUrl: '',
            metadata: {},
            owner: address,
            network: network,
            collection: {
              name: tx.tokenName || 'Unknown Collection',
              symbol: tx.tokenSymbol || 'NFT'
            },
            lastUpdated: Date.now()
          });
        }
      }

      return ownedNfts;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching from PolygonScan:', error);
      return null; // Return null for graceful fallback
    }
  }

  // Get NFT metadata from contract
  async getNFTMetadata(contractAddress: string, tokenId: string, network: string): Promise<any | null> {
    try {
      const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
      if (!networkConfig || !networkConfig.rpcUrl) {
        console.warn(`RPC URL not configured for network: ${network}`);
        return null;
      }
      const rpcUrl = networkConfig.rpcUrl;

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // ERC-721 metadata interface
      const abi = [
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function name() view returns (string)',
        'function symbol() view returns (string)'
      ];

      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Get token URI
      const tokenURI = await contract.tokenURI(tokenId);
      
      // Fetch metadata from URI
      const metadataUrl = tokenURI.startsWith('http') 
        ? tokenURI 
        : `${IPFS_GATEWAY}${tokenURI.replace('ipfs://', '')}`;
      
      const response = await fetch(metadataUrl);
      const metadata = await response.json();

      return metadata;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting NFT metadata:', error);
      return null;
    }
  }

  // Refresh NFT data
  async refreshNFTs(): Promise<void> {
    try {
      const walletData = await this.getWalletFromStorage();
      if (!walletData?.address) {
        throw new Error('No wallet found');
      }

      // Clear existing NFTs and re-import for all configured networks
      this.nfts = [];
      this.collections = []; // Clear collections as well for a full refresh
      
      const networks = Object.keys(NETWORK_CONFIGS);
      
      for (const network of networks) {
        try {
          // Using the updated importNFTs which handles multiple sources and fallbacks
          await this.importNFTs(walletData.address, network);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to refresh NFTs for ${network}:`, error);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh NFTs:', error);
      throw error;
    }
  }

  // Get all NFTs
  getAllNFTs(): NFT[] {
    return this.nfts;
  }

  // Get NFTs (alias for getAllNFTs for compatibility)
  getNFTs(): NFT[] {
    return this.nfts;
  }

  // Get NFTs by network
  getNFTsByNetwork(network: string): NFT[] {
    return this.nfts.filter(nft => nft.network === network);
  }

  // Get NFTs by collection
  getNFTsByCollection(contractAddress: string): NFT[] {
    return this.nfts.filter(nft => nft.contractAddress.toLowerCase() === contractAddress.toLowerCase());
  }

  // Get NFT by ID
  getNFT(id: string): NFT | undefined {
    return this.nfts.find(nft => nft.id === id);
  }

  // Get NFT collections
  getCollections(): NFTCollection[] {
    return this.collections;
  }

  // Get collection by address
  getCollection(contractAddress: string): NFTCollection | undefined {
    return this.collections.find(collection => 
      collection.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
  }

  // Get NFT statistics
  getNFTStats(): {
    total: number;
    byNetwork: Record<string, number>;
    byCollection: Record<string, number>;
    totalValue: number;
  } {
    const total = this.nfts.length;
    const byNetwork: Record<string, number> = {};
    const byCollection: Record<string, number> = {};
    let totalValue = 0;

    this.nfts.forEach(nft => {
      // Count by network
      byNetwork[nft.network] = (byNetwork[nft.network] || 0) + 1;
      
      // Count by collection
      byCollection[nft.collection.name] = (byCollection[nft.collection.name] || 0) + 1;
    });

    return {
      total,
      byNetwork,
      byCollection,
      totalValue
    };
  }

  // Clear NFT data
  async clearNFTData(): Promise<void> {
    this.nfts = [];
    this.collections = [];
    await this.saveNFTData();
  }

  // Get configuration
  private getConfig() {
    if (typeof window !== 'undefined' && (window as any).CONFIG) {
      return (window as any).CONFIG;
    }
    return {
      OPENSEA_API_KEY: '',
      ALCHEMY_API_KEY: '',
      POLYGONSCAN_API_KEY: '',
      IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
    };
  }
} 