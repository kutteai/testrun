import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { storage } from '../utils/storage-utils';

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

    const baseUrl = network === 'ethereum' 
      ? 'https://api.opensea.io/api/v1'
      : 'https://testnets-api.opensea.io/api/v1';

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
      throw new Error(`HTTP error! status: ${response.status}`);
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
    console.error('Error fetching OpenSea metadata:', error);
    throw error;
  }
}

// Fetch NFT metadata from Alchemy
async function fetchAlchemyNFTMetadata(contractAddress: string, tokenId: string, network: string) {
  try {
    const config = getConfig();
    const apiKey = config.ALCHEMY_NFT_API_KEY;
    
    if (!apiKey) {
      throw new Error('Alchemy API key not configured');
    }

    const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}`;
    
    const response = await fetch(
      `${baseUrl}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    console.error('Error fetching Alchemy metadata:', error);
    throw error;
  }
}

// Fetch NFT metadata from blockchain
async function fetchBlockchainNFTMetadata(contractAddress: string, tokenId: string, network: string) {
  try {
    // Get token URI from smart contract
    const response = await fetch(`https://mainnet.infura.io/v3/${getConfig().INFURA_PROJECT_ID}`, {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Decode the token URI
    const tokenUri = ethers.toUtf8String(data.result);
    
    // Fetch metadata from IPFS or HTTP
    const metadataResponse = await fetch(tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
    const metadata = await metadataResponse.json();
    
    return {
      name: metadata.name || `NFT #${tokenId}`,
      description: metadata.description || '',
      imageUrl: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '',
      collection: metadata.collection || 'Unknown Collection',
      attributes: metadata.attributes || [],
      owner: '', // Will be fetched separately
      metadata: metadata
    };
  } catch (error) {
    console.error('Error fetching blockchain metadata:', error);
    throw error;
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
      let metadata;
      
      // Try different metadata sources
      try {
        // First try OpenSea
        metadata = await fetchOpenSeaNFTMetadata(contractAddress, tokenId, network);
      } catch (error) {
        try {
          // Then try Alchemy
          metadata = await fetchAlchemyNFTMetadata(contractAddress, tokenId, network);
        } catch (error2) {
          try {
            // Finally try blockchain
            metadata = await fetchBlockchainNFTMetadata(contractAddress, tokenId, network);
          } catch (error3) {
            // Throw error instead of fallback metadata
            throw new Error('Failed to fetch NFT metadata from all sources');
          }
        }
      }

      const nft: Omit<NFT, 'id'> = {
        tokenId,
        contractAddress,
        network,
        name: metadata.name,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        metadata: metadata.metadata,
        owner: metadata.owner,
        collection: metadata.collection,
        attributes: metadata.attributes
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
          try {
            const metadata = await fetchOpenSeaNFTMetadata(
              nft.contractAddress, 
              nft.tokenId, 
              nft.network
            );
            
            return {
              ...nft,
              name: metadata.name,
              description: metadata.description,
              imageUrl: metadata.imageUrl,
              owner: metadata.owner,
              metadata: metadata.metadata
            };
          } catch (error) {
            console.warn(`Failed to refresh NFT ${nft.id}:`, error);
            return nft; // Keep original if refresh fails
          }
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