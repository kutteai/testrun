import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Copy, Check, Image, User, RefreshCw, Loader, Eye, Settings, Crown } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { getOwnedNFTs, setNFTAsProfilePicture, getProfilePicture, removeProfilePicture, type NFT } from '../../utils/nft-utils';
import { getNetworkRPCUrl } from '../../utils/token-balance-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const NFTsScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  console.log('🎨 NFTsScreen: Component rendered');
  
  const { wallet, currentNetwork } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [profilePicture, setProfilePicture] = useState<NFT | null>(null);
  const [isSettingProfile, setIsSettingProfile] = useState(false);

  useEffect(() => {
    console.log('🔄 NFTsScreen: useEffect triggered, wallet address:', wallet?.address, 'network:', currentNetwork?.id);
    if (wallet?.address) {
      loadNFTs();
      loadProfilePicture();
    } else {
      console.log('❌ NFTsScreen: No wallet address available');
    }
  }, [wallet?.address, currentNetwork?.id]);

  // Listen for network changes to refresh NFTs
  useEffect(() => {
    const handleNetworkChange = async (event: CustomEvent) => {
      console.log('🔄 Network changed event received in NFTsScreen:', event.detail);
      if (wallet?.address) {
        await loadNFTs();
      }
    };

    const handleAccountSwitched = async (event: CustomEvent) => {
      console.log('🔄 Account switched event received in NFTsScreen:', event.detail);
      if (wallet?.address) {
        await loadNFTs();
        await loadProfilePicture();
      }
    };

    window.addEventListener('networkChanged', handleNetworkChange as EventListener);
    window.addEventListener('accountSwitched', handleAccountSwitched as EventListener);
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
      window.removeEventListener('accountSwitched', handleAccountSwitched as EventListener);
    };
  }, [wallet?.address]);

  const loadNFTs = async () => {
    if (!wallet?.address) {
      console.log('❌ NFTsScreen: No wallet address available');
      return;
    }

    setIsLoading(true);
    try {
      const network = currentNetwork?.id || wallet.currentNetwork || 'ethereum';
      const rpcUrl = getNetworkRPCUrl(network);
      
      console.log('🔍 NFTsScreen: Loading NFTs for address:', wallet.address);
      console.log('🔍 NFTsScreen: Network:', network);
      console.log('🔍 NFTsScreen: RPC URL:', rpcUrl);
      
      const ownedNFTs = await getOwnedNFTs(wallet.address, rpcUrl, network);
      
      console.log('✅ NFTsScreen: Loaded NFTs:', ownedNFTs.length);
      console.log('📊 NFTsScreen: NFT details:', ownedNFTs.map(nft => ({
        name: nft.metadata.name,
        collection: nft.name,
        tokenId: nft.tokenId
      })));
      
      setNfts(ownedNFTs);
      
      if (ownedNFTs.length === 0) {
        console.log('ℹ️ NFTsScreen: No NFTs found, showing demo NFTs');
        toast.success('No NFTs found in your wallet');
      } else {
        toast.success(`Found ${ownedNFTs.length} NFTs`);
      }
    } catch (error) {
      console.error('❌ NFTsScreen: Error loading NFTs:', error);
      toast.error('Failed to load NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfilePicture = async () => {
    try {
      const currentProfile = await getProfilePicture();
      setProfilePicture(currentProfile);
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const handleSetAsProfilePicture = async (nft: NFT) => {
    setIsSettingProfile(true);
    try {
      await setNFTAsProfilePicture(nft);
      setProfilePicture(nft);
      toast.success(`${nft.metadata.name} set as profile picture!`);
    } catch (error) {
      console.error('Error setting profile picture:', error);
      toast.error('Failed to set profile picture');
    } finally {
      setIsSettingProfile(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      await removeProfilePicture();
      setProfilePicture(null);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const filteredNFTs = nfts.filter(nft =>
    nft.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nft.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
          <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#180CB2] rounded-xl flex items-center justify-center">
              <Image className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NFTs</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentNetwork?.id === 'bitcoin' ? 'bg-orange-500' : 
                  currentNetwork?.id === 'ethereum' ? 'bg-blue-500' :
                  currentNetwork?.id === 'solana' ? 'bg-purple-500' :
                  currentNetwork?.id === 'tron' ? 'bg-red-500' :
                  currentNetwork?.id === 'ton' ? 'bg-blue-400' :
                  currentNetwork?.id === 'xrp' ? 'bg-blue-300' :
                  currentNetwork?.id === 'litecoin' ? 'bg-gray-400' :
                  'bg-gray-500'
                }`}></div>
                <p className="text-gray-600 text-sm">
                  {currentNetwork?.name || 'Select Network'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={loadNFTs}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-6 h-6 animate-spin text-gray-700" /> : <RefreshCw className="w-6 h-6 text-gray-700" />}
          </button>
        </div>

        {/* Search Section */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NFTs..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
            />
            <Search className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
          </div>
        </div>
      </motion.div>

      {/* Profile Picture Section */}
      {profilePicture && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-4"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center text-gray-900">
                <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                Profile Picture
              </h3>
              <button
                onClick={handleRemoveProfilePicture}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#180CB2]">
                <img 
                  src={profilePicture.metadata.image} 
                  alt={profilePicture.metadata.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjODg4Ii8+CjxwYXRoIGQ9Ik0zMiAzMkM0Mi4wNTg5IDMyIDUwIDI0LjA1ODkgNTAgMTRDNTAgMy45NDExIDQyLjA1ODkgLTQgMzIgLTRDMjEuOTQxMSAtNCAxNCAzLjk0MTEgMTQgMTRDMTQgMjQuMDU4OSAyMS45NDExIDMyIDMyIDMyWiIgZmlsbD0iI0FBQSIvPgo8cGF0aCBkPSJNNTAgNTJDNTAgNDEuOTQxMSA0Mi4wNTg5IDM0IDMyIDM0QzIxLjk0MTEgMzQgMTQgNDEuOTQxMSAxNCA1Mkg1MFoiIGZpbGw9IiNBQUEiLz4KPC9zdmc+';
                  }}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{profilePicture.metadata.name}</h4>
                <p className="text-sm text-gray-600">{profilePicture.name}</p>
                <p className="text-xs text-gray-500">Token #{profilePicture.tokenId}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* NFTs Grid */}
      {filteredNFTs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-6 flex-1"
        >
          <div className="grid grid-cols-2 gap-4">
            {filteredNFTs.map((nft) => (
              <motion.div
                key={nft.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedNFT(nft)}
              >
                <div className="aspect-square bg-[#180CB2]/20 relative">
                  <img 
                    src={nft.metadata.image} 
                    alt={nft.metadata.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjODg4Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEzMy4xMzcgMTAwIDE2MCA3My4xMzcgMTYwIDQwQzE2MCA2Ljg2MyAxMzMuMTM3IC0yMCAxMDAgLTIwQzY2Ljg2MyAtMjAgNDAgNi44NjMgNDAgNDBDNDAgNzMuMTM3IDY2Ljg2MyAxMDAgMTAwIDEwMFoiIGZpbGw9IiNBQUEiLz4KPHBhdGggZD0iTTE2MCAxNjBDMTYwIDEyNi44NjMgMTMzLjEzNyAxMDAgMTAwIDEwMEM2Ni44NjMgMTAwIDQwIDEyNi44NjMgNDAgMTYwSDE2MFoiIGZpbGw9IiNBQUEiLz4KPC9zdmc+';
                    }}
                  />
                  {profilePicture?.id === nft.id && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                      PFP
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-sm truncate">{nft.metadata.name}</h4>
                  <p className="text-xs text-gray-400 truncate">{nft.name}</p>
                  <p className="text-xs text-gray-500">#{nft.tokenId}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-[#180CB2]" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nfts.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No NFTs Found</h3>
            <p className="text-sm text-gray-500">Your NFTs will appear here when detected</p>
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedNFT(null)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
                            <div className="aspect-square bg-[#180CB2]/20 rounded-xl overflow-hidden mb-4">
              <img 
                src={selectedNFT.metadata.image} 
                alt={selectedNFT.metadata.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <h3 className="text-xl font-bold mb-2">{selectedNFT.metadata.name}</h3>
            <p className="text-gray-400 mb-4">{selectedNFT.metadata.description}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Collection:</span>
                <span className="font-semibold">{selectedNFT.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token ID:</span>
                <span className="font-mono">#{selectedNFT.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Contract:</span>
                <button
                  onClick={() => copyAddress(selectedNFT.contractAddress)}
                  className="font-mono text-sm hover:text-blue-400"
                >
                  {formatAddress(selectedNFT.contractAddress)}
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {profilePicture?.id !== selectedNFT.id ? (
                <button
                  onClick={() => handleSetAsProfilePicture(selectedNFT)}
                  disabled={isSettingProfile}
                  className="flex-1 bg-gradient-to-r from-[#180CB2] to-[#140a8f] hover:from-[#140a8f] hover:to-[#0f0a6b] disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  {isSettingProfile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Setting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Crown className="w-4 h-4" />
                      <span>Set as PFP</span>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRemoveProfilePicture}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Remove PFP
                </button>
              )}
              <button
                onClick={() => setSelectedNFT(null)}
                className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default NFTsScreen;
