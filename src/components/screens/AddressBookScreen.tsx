import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Users, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  ExternalLink,
  Globe
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { addressBook, Contact } from '../../utils/address-book';
import { resolveENS, lookupENS } from '../../utils/ens-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AddressBookScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    address: '',
    network: 'ethereum',
    tags: '',
    notes: ''
  });

  // Load contacts
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    const allContacts = addressBook.getAllContacts();
    setContacts(allContacts);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.ens?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.address) {
      toast.error('Please fill in name and address');
      return;
    }

    try {
      const tags = newContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const contact = await addressBook.addContact(
        newContact.name,
        newContact.address,
        newContact.network as any,
        tags,
        newContact.notes
      );

      setContacts(prev => [...prev, contact]);
      setIsAddingContact(false);
      setNewContact({ name: '', address: '', network: 'ethereum', tags: '', notes: '' });
      toast.success('Contact added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const success = addressBook.removeContact(contactId);
      if (success) {
        setContacts(prev => prev.filter(c => c.id !== contactId));
        toast.success('Contact deleted');
      }
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleToggleFavorite = async (contactId: string) => {
    try {
      const contact = addressBook.toggleFavorite(contactId);
      setContacts(prev => prev.map(c => c.id === contactId ? contact : c));
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500',
      bsc: 'bg-yellow-500',
      polygon: 'bg-[#180CB2]',
      avalanche: 'bg-red-500',
      arbitrum: 'bg-cyan-500',
      optimism: 'bg-orange-500',
      bitcoin: 'bg-orange-600',
      solana: 'bg-[#180CB2]',
      tron: 'bg-red-600',
      litecoin: 'bg-gray-500',
      xrp: 'bg-blue-600'
    };
    return colors[network] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#180CB2] to-slate-900 text-white flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Address Book</h1>
              <p className="text-slate-400 text-sm">Manage your contacts</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingContact(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-4 pb-6 flex-1 overflow-y-auto"
      >
        {filteredContacts.map((contact, index) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-white">{contact.name}</h3>
                    {contact.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                    <div className={`w-2 h-2 rounded-full ${getNetworkColor(contact.network)}`}></div>
                  </div>
                  
                  {contact.ens && (
                    <div className="flex items-center space-x-1 mb-1">
                      <Globe className="w-3 h-3 text-blue-400" />
                      <p className="text-blue-400 text-sm">{contact.ens}</p>
                    </div>
                  )}
                  
                  <p className="text-slate-400 text-sm">{formatAddress(contact.address)}</p>
                  
                  {contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {contact.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleFavorite(contact.id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {contact.isFavorite ? (
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  ) : (
                    <StarOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                <button
                  onClick={() => copyAddress(contact.address)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied === contact.address ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredContacts.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No contacts found</p>
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Try adjusting your search' : 'Add contacts to get started'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add New Contact</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Address or ENS Name
                </label>
                <input
                  type="text"
                  value={newContact.address}
                  onChange={(e) => setNewContact(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x... or ENS name (.eth)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Network
                </label>
                <select
                  value={newContact.network}
                  onChange={(e) => setNewContact(prev => ({ ...prev, network: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="bsc">BSC</option>
                  <option value="polygon">Polygon</option>
                  <option value="avalanche">Avalanche</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="optimism">Optimism</option>
                  <option value="bitcoin">Bitcoin</option>
                  <option value="solana">Solana</option>
                  <option value="tron">TRON</option>
                  <option value="litecoin">Litecoin</option>
                  <option value="xrp">XRP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newContact.tags}
                  onChange={(e) => setNewContact(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="friend, work, family"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddingContact(false)}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddContact}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Contact
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AddressBookScreen;