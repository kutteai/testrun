import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ENSDomain } from '../../../../types/ens';

interface EditDomainModalProps {
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  editingDomain: ENSDomain | null;
  setEditingDomain: (domain: ENSDomain | null) => void;
  handleSaveDomainEdit: (domain: ENSDomain) => void;
}

export const EditDomainModal: React.FC<EditDomainModalProps> = ({
  showEditModal,
  setShowEditModal,
  editingDomain,
  setEditingDomain,
  handleSaveDomainEdit,
}) => {
  if (!showEditModal || !editingDomain) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 rounded-2xl p-6 w-96 mx-4 border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Edit Domain</h3>
          <button
            onClick={() => setShowEditModal(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Domain Name
            </label>
            <input
              type="text"
              value={editingDomain.name}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={editingDomain.notes || ''}
              onChange={(e) => setEditingDomain({ ...editingDomain, notes: e.target.value })}
              placeholder="Add notes about this domain..."
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveDomainEdit(editingDomain)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};




