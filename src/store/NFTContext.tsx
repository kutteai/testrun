import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { storage } from '../utils/storage-utils';
import { NETWORK_CONFIGS } from '../background/index'; // Import NETWORK_CONFIGS from background

interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  network: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata: Record<string, string | number | boolean>;
  owner: string;
  collection: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface NFTState {
  nfts: NFT[];
  collections: string[];
  isLoading: boolean;
  error: string | null;
}

interface NFTContextType {
  nftState: NFTState;
  nfts: NFT[];
  addNFT: (nft: Omit<NFT, 'id'>) => void;
  removeNFT: (nftId: string) => void;
  getNFTsByCollection: (collection: string) => NFT[];
  getNFTsByNetwork: (network: string) => NFT[];
  refreshNFTs: () => Promise<void>;
  importNFT: (contractAddress: string, tokenId: string, network: string) => Promise<void>;
}

const NFTContext = createContext<NFTContextType | undefined>(undefined);

export const useNFT = () => {
  const context = useContext(NFTContext);
  if (!context) {
    throw new Error('useNFT must be used within a NFTProvider');
  }
  return context;
};

interface NFTProviderProps {
  children: ReactNode;
}

// Get configuration
function getConfig() {
  if (typeof window !== 'undefined' && window.CONFIG) {
    return window.CONFIG;
  }
  // Throw error if no config available
  throw new Error('Configuration not available');
}

// Fetch NFT metadata from OpenSea
async function fetchOpenSeaNFTMetadata(contractAddress: string, tokenId: string, network: string) {
  try {
    const config = getConfig();
    const apiKey = config.OPENSEA_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenSea API key not configured');
    }

    // Dynamically determine OpenSea API endpoint based on network
    const openseaApiEndpoints: Record<string, string> = {
      ethereum: 'https://api.opensea.io/api/v1',
      goerli: 'https://testnets-api.opensea.io/api/v1',
      polygon: 'https://api.opensea.io/api/v1', // OpenSea supports Polygon mainnet
      // Add other networks as OpenSea supports them, mapping to their mainnet or testnet APIs
    };

    const baseUrl = openseaApiEndpoints[network.toLowerCase()];
    if (!baseUrl) {
      // Instead of throwing, return null for graceful fallback in importNFT
      return null;
    }

    const response = await fetch(
      `${baseUrl}/asset/${contractAddress}/${tokenId}/?include_orders=false`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      // Log the error but return null for graceful fallback
      console.warn(`OpenSea API error for ${contractAddress}/${tokenId}: HTTP status ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    return {
      name: data.name || `NFT #${tokenId}`,
      description: data.description || '',
      imageUrl: data.image_url || data.image_thumbnail_url || '',
      collection: data.collection?.name || 'Unknown Collection',
      attributes: data.traits?.map((trait: any) => ({
        trait_type: trait.trait_type,
        value: trait.value
      })) || [],
      owner: data.owner?.address || '',
      metadata: {
        name: data.name,
        description: data.description,
        external_url: data.external_link,
        animation_url: data.animation_url,
        background_color: data.background_color
      }
    };
  } catch (error) {
    // Log the error but return null for graceful fallback
    // eslint-disable-next-line no-console
    console.error('Error fetching OpenSea metadata:', error);
    return null;
  }
}

// Fetch NFT metadata from Alchemy
async function fetchAlchemyNFTMetadata(contractAddress: string, tokenId: string, network: string) {
  try {
    const config = getConfig();
    const apiKey = config.ALCHEMY_NFT_API_KEY;
    
    if (!apiKey) {
      // Instead of throwing, return null for graceful fallback in importNFT
      return null;
    }

    const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}`;
    
    const response = await fetch(
      `${baseUrl}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`
    );

    if (!response.ok) {
      // Log the error but return null for graceful fallback
      console.warn(`Alchemy API error for ${contractAddress}/${tokenId}: HTTP status ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    return {
      name: data.title || `NFT #${tokenId}`,
      description: data.description || '',
      imageUrl: data.media?.[0]?.gateway || data.media?.[0]?.raw || '',
      collection: data.contract?.name || 'Unknown Collection',
      attributes: data.rawMetadata?.attributes?.map((attr: any) => ({
        trait_type: attr.trait_type,
        value: attr.value
      })) || [],
      owner: data.owners?.[0] || '',
      metadata: data.rawMetadata || {}
    };
  } catch (error) {
    // Log the error but return null for graceful fallback
    // eslint-disable-next-line no-console
    console.error('Error fetching Alchemy metadata:', error);
    return null;
  }
}

// Fetch NFT metadata from blockchain
async function fetchBlockchainNFTMetadata(contractAddress: string, tokenId: string, network: string) {
  try {
    // Get network configuration
    const networkConfig = NETWORK_CONFIGS[network.toLowerCase()];
    if (!networkConfig || !networkConfig.rpcUrl) {
      // Instead of throwing, return null for graceful fallback in importNFT
      return null;
    }
    const rpcUrl = networkConfig.rpcUrl;

    // Get token URI from smart contract
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: `0xc87b56dd000000000000000000000000000000000000000000000000000000000000000${tokenId}`
        }, 'latest'],
        id: 1
      })
    });

    if (!response.ok) {
      // Log the error but return null for graceful fallback
      console.warn(`Blockchain RPC error for ${contractAddress}/${tokenId}: HTTP status ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      // Log the error but return null for graceful fallback
      console.warn(`Blockchain RPC error for ${contractAddress}/${tokenId}: ${data.error.message}`);
      return null;
    }

    // Decode the token URI
    const tokenUri = ethers.toUtf8String(data.result);
    
    // Fetch metadata from IPFS or HTTP
    const metadataResponse = await fetch(tokenUri.replace('ipfs://', getConfig().IPFS_GATEWAY || 'https://ipfs.io/ipfs/'));

    if (!metadataResponse.ok) {
      console.warn(`IPFS/Metadata fetch error for ${tokenUri}: HTTP status ${metadataResponse.status}`);
      return null;
    }

    const metadata = await metadataResponse.json();
    
    return {
      name: metadata.name || `NFT #${tokenId}`,
      description: metadata.description || '',
      imageUrl: metadata.image?.replace('ipfs://', getConfig().IPFS_GATEWAY || 'https://ipfs.io/ipfs/') || '',
      collection: metadata.collection || 'Unknown Collection',
      attributes: metadata.attributes || [],
      owner: '', // Will be fetched separately
      metadata: metadata
    };
  } catch (error) {
    // Log the error but return null for graceful fallback
    // eslint-disable-next-line no-console
    console.error('Error fetching blockchain metadata:', error);
    return null;
  }
}

export const NFTProvider: React.FC<NFTProviderProps> = ({ children }) => {
  const [nftState, setNftState] = useState<NFTState>({
    nfts: [],
    collections: [],
    isLoading: false,
    error: null
  });

  // Load NFTs from storage
  useEffect(() => {
    const loadNFTs = async () => {
      try {
        const result = await storage.get(['nfts']);
        if (result.nfts) {
          setNftState(prev => ({
            ...prev,
            nfts: result.nfts
          }));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load NFTs:', error);
      }
    };
    loadNFTs();
  }, []);

  // Save NFTs to storage
  const saveNFTs = async (nfts: NFT[]) => {
    try {
      await storage.set({ nfts });
      setNftState(prev => ({
        ...prev,
        nfts: nfts
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save NFTs:', error);
    }
  };

  // Add NFT
  const addNFT = (nft: Omit<NFT, 'id'>) => {
    const newNFT: NFT = {
      ...nft,
      id: `${nft.contractAddress}-${nft.tokenId}-${nft.network}`
    };

    setNftState(prev => {
      const updatedNFTs = [...prev.nfts, newNFT];
      saveNFTs(updatedNFTs);
      return {
        ...prev,
        nfts: updatedNFTs
      };
    });
  };

  // Remove NFT
  const removeNFT = (nftId: string) => {
    setNftState(prev => {
      const updatedNFTs = prev.nfts.filter(nft => nft.id !== nftId);
      saveNFTs(updatedNFTs);
      return {
        ...prev,
        nfts: updatedNFTs
      };
    });
  };

  // Get NFTs by collection
  const getNFTsByCollection = (collection: string): NFT[] => {
    return nftState.nfts.filter(nft => nft.collection === collection);
  };

  // Get NFTs by network
  const getNFTsByNetwork = (network: string): NFT[] => {
    return nftState.nfts.filter(nft => nft.network === network);
  };

  // Import NFT with real metadata
  const importNFT = async (contractAddress: string, tokenId: string, network: string) => {
    setNftState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      let mergedMetadata: any = {};
      const metadataSources = [
        fetchOpenSeaNFTMetadata,
        fetchAlchemyNFTMetadata,
        fetchBlockchainNFTMetadata,
      ];

      for (const source of metadataSources) {
        try {
          const fetched = await source(contractAddress, tokenId, network);
          if (fetched) {
            mergedMetadata = { ...mergedMetadata, ...fetched };
            // If we have a name and image, we can potentially stop trying other sources
            if (mergedMetadata.name && mergedMetadata.imageUrl) {
              break;
            }
          }
        } catch (sourceError) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to fetch metadata from a source (${source.name}):`, sourceError);
        }
      }
      
      if (!mergedMetadata.name && !mergedMetadata.imageUrl && !mergedMetadata.description) {
        throw new Error('Failed to fetch any significant NFT metadata from all sources');
      }

      const nft: Omit<NFT, 'id'> = {
        tokenId,
        contractAddress,
        network,
        name: mergedMetadata.name || `NFT #${tokenId}`,
        description: mergedMetadata.description || '',
        imageUrl: mergedMetadata.imageUrl || '',
        metadata: mergedMetadata.metadata || {},
        owner: mergedMetadata.owner || '',
        collection: mergedMetadata.collection || 'Unknown Collection',
        attributes: mergedMetadata.attributes || []
      };

      addNFT(nft);
      
      setNftState(prev => ({
        ...prev,
        isLoading: false
      }));

      toast.success('NFT imported successfully');
    } catch (error) {
      setNftState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to import NFT'
      }));
      toast.error('Failed to import NFT');
    }
  };

  // Refresh NFTs
  const refreshNFTs = async () => {
    setNftState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Refresh metadata for all NFTs
      const updatedNFTs = await Promise.all(
        nftState.nfts.map(async (nft) => {
          let mergedMetadata: any = {};
          const metadataSources = [
            fetchOpenSeaNFTMetadata,
            fetchAlchemyNFTMetadata,
            fetchBlockchainNFTMetadata,
          ];

          for (const source of metadataSources) {
            try {
              const fetched = await source(nft.contractAddress, nft.tokenId, nft.network);
              if (fetched) {
                mergedMetadata = { ...mergedMetadata, ...fetched };
                if (mergedMetadata.name && mergedMetadata.imageUrl) {
                  break;
                }
              }
            } catch (sourceError) {
              // eslint-disable-next-line no-console
              console.warn(`Failed to refresh NFT ${nft.id} from a source (${source.name}):`, sourceError);
            }
          }

          if (!mergedMetadata.name && !mergedMetadata.imageUrl && !mergedMetadata.description) {
            // If no metadata could be refreshed, keep the old NFT data
            return nft;
          }
          
          return {
            ...nft,
            name: mergedMetadata.name || nft.name,
            description: mergedMetadata.description || nft.description,
            imageUrl: mergedMetadata.imageUrl || nft.imageUrl,
            owner: mergedMetadata.owner || nft.owner,
            metadata: mergedMetadata.metadata || nft.metadata,
            collection: mergedMetadata.collection || nft.collection,
            attributes: mergedMetadata.attributes || nft.attributes,
          };
        })
      );
      
      setNftState(prev => ({
        ...prev,
        nfts: updatedNFTs,
        isLoading: false
      }));

      saveNFTs(updatedNFTs);
      toast.success('NFTs refreshed successfully');
    } catch (error) {
      setNftState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh NFTs'
      }));
      toast.error('Failed to refresh NFTs');
    }
  };

  const value: NFTContextType = {
    nftState,
    nfts: nftState.nfts,
    addNFT,
    removeNFT,
    getNFTsByCollection,
    getNFTsByNetwork,
    refreshNFTs,
    importNFT
  };

  return (
    <NFTContext.Provider value={value}>
      {children}
    </NFTContext.Provider>
  );
}; 