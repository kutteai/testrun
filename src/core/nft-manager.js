import { ethers } from 'ethers';
import { NETWORKS } from '../utils/web3-utils';
export class NFTManager {
    constructor() {
        this.nfts = [];
        this.collections = [];
        this.loadNFTData();
    }
    // Load NFT data from storage
    async loadNFTData() {
        try {
            chrome.storage.local.get(['nfts', 'nftCollections'], (result) => {
                if (result.nfts) {
                    this.nfts = result.nfts;
                }
                if (result.nftCollections) {
                    this.collections = result.nftCollections;
                }
            });
        }
        catch (error) {
            console.error('Failed to load NFT data:', error);
        }
    }
    // Save NFT data to storage
    async saveNFTData() {
        try {
            chrome.storage.local.set({
                nfts: this.nfts,
                nftCollections: this.collections
            });
        }
        catch (error) {
            console.error('Failed to save NFT data:', error);
        }
    }
    // Get wallet from storage
    async getWalletFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['wallet'], (result) => {
                resolve(result.wallet || null);
            });
        });
    }
    // Import NFTs for a wallet address
    async importNFTs(address, network) {
        try {
            const networkConfig = NETWORKS[network];
            if (!networkConfig) {
                throw new Error(`Unsupported network: ${network}`);
            }
            const config = this.getConfig();
            const nfts = [];
            // Use OpenSea API for Ethereum mainnet
            if (network === 'ethereum') {
                const openSeaNfts = await this.fetchFromOpenSea(address, config.OPENSEA_API_KEY);
                nfts.push(...openSeaNfts);
            }
            // Use Alchemy API for other networks
            if (networkConfig.rpcUrl) {
                const alchemyNfts = await this.fetchFromAlchemy(address, networkConfig.rpcUrl, config.ALCHEMY_API_KEY);
                nfts.push(...alchemyNfts);
            }
            // Use network-specific APIs
            if (network === 'polygon') {
                const polygonNfts = await this.fetchFromPolygonScan(address, config.POLYGONSCAN_API_KEY);
                nfts.push(...polygonNfts);
            }
            // Add to existing NFTs
            this.nfts.push(...nfts);
            await this.saveNFTData();
            return nfts;
        }
        catch (error) {
            console.error('Failed to import NFTs:', error);
            throw error;
        }
    }
    // Fetch NFTs from OpenSea API
    async fetchFromOpenSea(address, apiKey) {
        try {
            const baseUrl = 'https://api.opensea.io/api/v1';
            const url = apiKey
                ? `${baseUrl}/assets?owner=${address}&order_direction=desc&offset=0&limit=50&X-API-KEY=${apiKey}`
                : `${baseUrl}/assets?owner=${address}&order_direction=desc&offset=0&limit=50`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OpenSea API error: ${response.status}`);
            }
            const data = await response.json();
            return data.assets.map((asset) => ({
                id: `${asset.asset_contract.address}-${asset.token_id}`,
                tokenId: asset.token_id,
                contractAddress: asset.asset_contract.address,
                name: asset.name || `${asset.asset_contract.name} #${asset.token_id}`,
                description: asset.description || '',
                imageUrl: asset.image_url || asset.image_thumbnail_url || '',
                metadata: asset.traits || {},
                owner: address,
                network: 'ethereum',
                collection: {
                    name: asset.asset_contract.name,
                    symbol: asset.asset_contract.symbol,
                    description: asset.asset_contract.description,
                    imageUrl: asset.asset_contract.image_url
                },
                attributes: asset.traits?.map((trait) => ({
                    trait_type: trait.trait_type,
                    value: trait.value,
                    display_type: trait.display_type
                })) || [],
                lastUpdated: Date.now()
            }));
        }
        catch (error) {
            console.error('Error fetching from OpenSea:', error);
            return [];
        }
    }
    // Fetch NFTs from Alchemy API
    async fetchFromAlchemy(address, alchemyUrl, apiKey) {
        try {
            const url = `${alchemyUrl}/getNFTs/?owner=${address}`;
            const headers = {
                'Content-Type': 'application/json'
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`Alchemy API error: ${response.status}`);
            }
            const data = await response.json();
            return data.ownedNfts.map((nft) => ({
                id: `${nft.contract.address}-${nft.id.tokenId}`,
                tokenId: nft.id.tokenId,
                contractAddress: nft.contract.address,
                name: nft.title || `NFT #${nft.id.tokenId}`,
                description: nft.description || '',
                imageUrl: nft.media?.[0]?.gateway || nft.media?.[0]?.raw || '',
                metadata: nft.metadata?.attributes || {},
                owner: address,
                network: 'ethereum', // Alchemy primarily supports Ethereum
                collection: {
                    name: nft.contract.name,
                    symbol: nft.contract.symbol
                },
                attributes: nft.metadata?.attributes?.map((attr) => ({
                    trait_type: attr.trait_type,
                    value: attr.value
                })) || [],
                lastUpdated: Date.now()
            }));
        }
        catch (error) {
            console.error('Error fetching from Alchemy:', error);
            return [];
        }
    }
    // Fetch NFTs from PolygonScan API
    async fetchFromPolygonScan(address, apiKey) {
        try {
            const baseUrl = 'https://api.polygonscan.com/api';
            const url = apiKey
                ? `${baseUrl}?module=account&action=tokennfttx&address=${address}&apikey=${apiKey}`
                : `${baseUrl}?module=account&action=tokennfttx&address=${address}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`PolygonScan API error: ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== '1') {
                throw new Error(`PolygonScan API error: ${data.message}`);
            }
            // Group by contract and token ID to get current ownership
            const ownershipMap = new Map();
            data.result.forEach((tx) => {
                const key = `${tx.contractAddress}-${tx.tokenID}`;
                if (tx.to.toLowerCase() === address.toLowerCase()) {
                    ownershipMap.set(key, tx);
                }
                else if (tx.from.toLowerCase() === address.toLowerCase()) {
                    ownershipMap.delete(key);
                }
            });
            // Convert to NFT objects
            return Array.from(ownershipMap.values()).map((tx) => ({
                id: `${tx.contractAddress}-${tx.tokenID}`,
                tokenId: tx.tokenID,
                contractAddress: tx.contractAddress,
                name: `NFT #${tx.tokenID}`,
                description: '',
                imageUrl: '', // Would need additional API call to get metadata
                metadata: {},
                owner: address,
                network: 'polygon',
                collection: {
                    name: tx.tokenName || 'Unknown Collection',
                    symbol: tx.tokenSymbol || 'NFT'
                },
                lastUpdated: Date.now()
            }));
        }
        catch (error) {
            console.error('Error fetching from PolygonScan:', error);
            return [];
        }
    }
    // Get NFT metadata from contract
    async getNFTMetadata(contractAddress, tokenId, network) {
        try {
            const networkConfig = NETWORKS[network];
            if (!networkConfig) {
                throw new Error(`Unsupported network: ${network}`);
            }
            const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
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
                : `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}`;
            const response = await fetch(metadataUrl);
            const metadata = await response.json();
            return metadata;
        }
        catch (error) {
            console.error('Error getting NFT metadata:', error);
            return null;
        }
    }
    // Refresh NFT data
    async refreshNFTs() {
        try {
            const walletData = await this.getWalletFromStorage();
            if (!walletData?.address) {
                throw new Error('No wallet found');
            }
            // Clear existing NFTs
            this.nfts = [];
            // Re-import NFTs for all supported networks
            const networks = ['ethereum', 'polygon', 'bsc', 'avalanche'];
            for (const network of networks) {
                try {
                    await this.importNFTs(walletData.address, network);
                }
                catch (error) {
                    console.warn(`Failed to refresh NFTs for ${network}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Failed to refresh NFTs:', error);
            throw error;
        }
    }
    // Get all NFTs
    getAllNFTs() {
        return this.nfts;
    }
    // Get NFTs (alias for getAllNFTs for compatibility)
    getNFTs() {
        return this.nfts;
    }
    // Get NFTs by network
    getNFTsByNetwork(network) {
        return this.nfts.filter(nft => nft.network === network);
    }
    // Get NFTs by collection
    getNFTsByCollection(contractAddress) {
        return this.nfts.filter(nft => nft.contractAddress.toLowerCase() === contractAddress.toLowerCase());
    }
    // Get NFT by ID
    getNFT(id) {
        return this.nfts.find(nft => nft.id === id);
    }
    // Get NFT collections
    getCollections() {
        return this.collections;
    }
    // Get collection by address
    getCollection(contractAddress) {
        return this.collections.find(collection => collection.contractAddress.toLowerCase() === contractAddress.toLowerCase());
    }
    // Get NFT statistics
    getNFTStats() {
        const total = this.nfts.length;
        const byNetwork = {};
        const byCollection = {};
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
    async clearNFTData() {
        this.nfts = [];
        this.collections = [];
        await this.saveNFTData();
    }
    // Get configuration
    getConfig() {
        if (typeof window !== 'undefined' && window.CONFIG) {
            return window.CONFIG;
        }
        return {
            OPENSEA_API_KEY: '',
            ALCHEMY_API_KEY: '',
            POLYGONSCAN_API_KEY: ''
        };
    }
}
