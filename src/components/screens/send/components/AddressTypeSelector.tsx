import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface AddressType {
  id: string;
  label: string;
  icon: any; // Assuming 'icon' can be a React component or null
}

interface AddressTypeSelectorProps {
  addressTypes: AddressType[];
  addressType: string;
  handleAddressTypeChange: (type: string) => void;
}

const AddressTypeSelector: React.FC<AddressTypeSelectorProps> = ({
  addressTypes,
  addressType,
  handleAddressTypeChange,
}) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-6"
    >
      <div className="flex space-x-2">
        {addressTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleAddressTypeChange(type.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
              addressType === type.id
                ? 'bg-[#180CB2] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type.icon && addressType === type.id && <type.icon className="w-4 h-4" />}
            <span className="text-[13px] font-medium">{type.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default AddressTypeSelector;





