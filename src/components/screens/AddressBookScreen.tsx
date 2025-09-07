import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, Edit, Trash2, Copy, Check, User, Mail } from 'lucide-react';
import { storage } from '../../utils/storage-utils';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface Contact {
  id: string;
  name: string;
  address: string;
  network: string;
  notes?: string;
  createdAt: number;
}

const AddressBookScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { currentNetwork } = useWallet();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for adding/editing contacts
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    network: currentNetwork?.id || 'ethereum',
    notes: ''
  });

  // Update form network when current network changes
  useEffect(() => {
    if (currentNetwork && !editingContact) {
      setFormData(prev => ({
        ...prev,
        network: currentNetwork.id
      }));
    }
  }, [currentNetwork, editingContact]);

  const networks = [
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
    { id: 'bsc', name: 'BSC', symbol: 'BNB' },
    { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH' },
    { id: 'optimism', name: 'Optimism', symbol: 'ETH' },
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'solana', name: 'Solana', symbol: 'SOL' }
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const result = await storage.get(['addressBook']);
      setContacts(result.addressBook || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const saveContacts = async (updatedContacts: Contact[]) => {
    try {
      await storage.set({ addressBook: updatedContacts });
      setContacts(updatedContacts);
    } catch (error) {
      console.error('Failed to save contacts:', error);
      toast.error('Failed to save contacts');
    }
  };

  const handleAddContact = () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      address: formData.address.trim(),
      network: formData.network,
      notes: formData.notes.trim(),
      createdAt: Date.now()
    };

    const updatedContacts = [...contacts, newContact];
    saveContacts(updatedContacts);
    
    setFormData({ name: '', address: '', network: 'ethereum', notes: '' });
    setShowAddContact(false);
    toast.success('Contact added successfully');
  };

  const handleEditContact = () => {
    if (!editingContact || !formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedContacts = contacts.map(contact =>
      contact.id === editingContact.id
        ? {
            ...contact,
            name: formData.name.trim(),
            address: formData.address.trim(),
            network: formData.network,
            notes: formData.notes.trim()
          }
        : contact
    );

    saveContacts(updatedContacts);
    
    setFormData({ name: '', address: '', network: 'ethereum', notes: '' });
    setEditingContact(null);
    toast.success('Contact updated successfully');
  };

  const handleDeleteContact = (contactId: string) => {
    const updatedContacts = contacts.filter(contact => contact.id !== contactId);
    saveContacts(updatedContacts);
    toast.success('Contact deleted successfully');
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const startEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      address: contact.address,
      network: contact.network,
      notes: contact.notes || ''
    });
    setShowAddContact(true);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.network.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">Address Book</h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
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
              <span className="text-xs text-white/80">
                {currentNetwork?.name || 'Select Network'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', address: '', network: currentNetwork?.id || 'ethereum', notes: '' });
              setEditingContact(null);
              setShowAddContact(true);
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
          />
        </motion.div>

        {/* Contacts List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-600 text-[13px] mb-6">
                {searchQuery ? 'Try adjusting your search terms' : 'Add your first contact to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddContact(true)}
                  className="bg-[#180CB2] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#140a8f] transition-colors text-[13px]"
                >
                  Add Contact
                </button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#180CB2]/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[#180CB2]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-[13px]">{contact.name}</h3>
                      <p className="text-gray-600 text-[13px]">
                        {contact.address.substring(0, 8)}...{contact.address.substring(contact.address.length - 6)}
                      </p>
                      <p className="text-gray-500 text-xs">{contact.network.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyAddress(contact.address)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      {copied === contact.address ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => startEditContact(contact)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                
                {contact.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-gray-600 text-[13px]">{contact.notes}</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
                  placeholder="Enter contact name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
                  placeholder="Enter wallet address"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Network</label>
                <select
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
                >
                  {networks.map(network => (
                    <option key={network.id} value={network.id}>
                      {network.name} ({network.symbol})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
                  placeholder="Optional notes about this contact"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddContact(false);
                  setEditingContact(null);
                  setFormData({ name: '', address: '', network: 'ethereum', notes: '' });
                }}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={editingContact ? handleEditContact : handleAddContact}
                className="flex-1 py-2 px-4 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors text-[13px]"
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AddressBookScreen;