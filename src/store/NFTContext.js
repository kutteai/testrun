import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
const NFTContext = createContext(undefined);
export const useNFT = () => {
    const context = useContext(NFTContext);
    if (!context) {
        throw new Error('useNFT must be used within a NFTProvider');
    }
    return context;
};
// Get configuration
function getConfig() {
    if (typeof window !== 'undefined' && window.CONFIG) {
        return window.CONFIG;
    }
    // Fallback for build time
    return {
        OPENSEA_API_KEY: '',
        ALCHEMY_NFT_API_KEY: '',
        INFURA_PROJECT_ID: 'YOUR_INFURA_KEY'
    };
}
// Fetch NFT metadata from OpenSea
async function fetchOpenSeaNFTMetadata(contractAddress, tokenId, network) {
    try {
        const config = getConfig();
        const apiKey = config.OPENSEA_API_KEY;
        if (!apiKey) {
            throw new Error('OpenSea API key not configured');
        }
        const baseUrl = network === 'ethereum'
            ? 'https://api.opensea.io/api/v1'
            : 'https://testnets-api.opensea.io/api/v1';
        const response = await fetch(`${baseUrl}/asset/${contractAddress}/${tokenId}/?include_orders=false`, {
            headers: {
                'X-API-KEY': apiKey,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
            name: data.name || `NFT #${tokenId}`,
            description: data.description || '',
            imageUrl: data.image_url || data.image_thumbnail_url || '',
            collection: data.collection?.name || 'Unknown Collection',
            attributes: data.traits?.map((trait) => ({
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
    }
    catch (error) {
        console.error('Error fetching OpenSea metadata:', error);
        throw error;
    }
}
// Fetch NFT metadata from Alchemy
async function fetchAlchemyNFTMetadata(contractAddress, tokenId, network) {
    try {
        const config = getConfig();
        const apiKey = config.ALCHEMY_NFT_API_KEY;
        if (!apiKey) {
            throw new Error('Alchemy API key not configured');
        }
        const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}`;
        const response = await fetch(`${baseUrl}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
            name: data.title || `NFT #${tokenId}`,
            description: data.description || '',
            imageUrl: data.media?.[0]?.gateway || data.media?.[0]?.raw || '',
            collection: data.contract?.name || 'Unknown Collection',
            attributes: data.rawMetadata?.attributes?.map((attr) => ({
                trait_type: attr.trait_type,
                value: attr.value
            })) || [],
            owner: data.owners?.[0] || '',
            metadata: data.rawMetadata || {}
        };
    }
    catch (error) {
        console.error('Error fetching Alchemy metadata:', error);
        throw error;
    }
}
// Fetch NFT metadata from blockchain
async function fetchBlockchainNFTMetadata(contractAddress, tokenId, network) {
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
    }
    catch (error) {
        console.error('Error fetching blockchain metadata:', error);
        throw error;
    }
}
export const NFTProvider = ({ children }) => {
    const [nftState, setNftState] = useState({
        nfts: [],
        collections: [],
        isLoading: false,
        error: null
    });
    // Load NFTs from storage
    useEffect(() => {
        chrome.storage.local.get(['nfts'], (result) => {
            if (result.nfts) {
                setNftState(prev => ({
                    ...prev,
                    nfts: result.nfts
                }));
            }
        });
    }, []);
    // Save NFTs to storage
    const saveNFTs = (nfts) => {
        chrome.storage.local.set({ nfts });
    };
    // Add NFT
    const addNFT = (nft) => {
        const newNFT = {
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
    const removeNFT = (nftId) => {
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
    const getNFTsByCollection = (collection) => {
        return nftState.nfts.filter(nft => nft.collection === collection);
    };
    // Get NFTs by network
    const getNFTsByNetwork = (network) => {
        return nftState.nfts.filter(nft => nft.network === network);
    };
    // Import NFT with real metadata
    const importNFT = async (contractAddress, tokenId, network) => {
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
            }
            catch (error) {
                try {
                    // Then try Alchemy
                    metadata = await fetchAlchemyNFTMetadata(contractAddress, tokenId, network);
                }
                catch (error2) {
                    try {
                        // Finally try blockchain
                        metadata = await fetchBlockchainNFTMetadata(contractAddress, tokenId, network);
                    }
                    catch (error3) {
                        // Fallback to basic metadata
                        metadata = {
                            name: `NFT #${tokenId}`,
                            description: `Imported NFT from ${network}`,
                            imageUrl: '',
                            collection: `Collection ${contractAddress.slice(0, 8)}...`,
                            attributes: [],
                            owner: '',
                            metadata: {}
                        };
                    }
                }
            }
            const nft = {
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
        }
        catch (error) {
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
            const updatedNFTs = await Promise.all(nftState.nfts.map(async (nft) => {
                try {
                    const metadata = await fetchOpenSeaNFTMetadata(nft.contractAddress, nft.tokenId, nft.network);
                    return {
                        ...nft,
                        name: metadata.name,
                        description: metadata.description,
                        imageUrl: metadata.imageUrl,
                        owner: metadata.owner,
                        metadata: metadata.metadata
                    };
                }
                catch (error) {
                    console.warn(`Failed to refresh NFT ${nft.id}:`, error);
                    return nft; // Keep original if refresh fails
                }
            }));
            setNftState(prev => ({
                ...prev,
                nfts: updatedNFTs,
                isLoading: false
            }));
            saveNFTs(updatedNFTs);
            toast.success('NFTs refreshed successfully');
        }
        catch (error) {
            setNftState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to refresh NFTs'
            }));
            toast.error('Failed to refresh NFTs');
        }
    };
    const value = {
        nftState,
        nfts: nftState.nfts,
        addNFT,
        removeNFT,
        getNFTsByCollection,
        getNFTsByNetwork,
        refreshNFTs,
        importNFT
    };
    return (_jsx(NFTContext.Provider, { value: value, children: children }));
};
