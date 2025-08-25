import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  onDebugClick?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...', onDebugClick }) => {
  return (
    <div className="h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
        />
        <p className="text-gray-600 font-medium">{message}</p>
        {onDebugClick && (
          <button
            onClick={onDebugClick}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
          >
            Debug: Skip Loading
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen; 