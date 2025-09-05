import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const TermsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if user has scrolled to bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  // Handle agreement
  const handleAgree = () => {
    if (hasAgreed && hasScrolledToBottom) {
      onNavigate('create');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >


      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        {/* Title */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-gray-900 text-center mb-6"
          style={{ 
            fontFamily: 'Inter',
            fontWeight: 700,
            fontStyle: 'normal',
            fontSize: '25px',
            lineHeight: '35px',
            letterSpacing: '0%',
            textAlign: 'center'
          }}
        >
          Review our Terms of Use
        </motion.h2>

        {/* Terms Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-50 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto"
          ref={contentRef}
          onScroll={handleScroll}
        >
          <div className="text-gray-700 space-y-4" style={{ 
            fontFamily: 'Inter',
            fontWeight: 400,
            fontStyle: 'normal',
            fontSize: '14px',
            lineHeight: '15px',
            letterSpacing: '0%'
          }}>
            <p>
              <strong>Important Notice:</strong> This agreement is subject to binding arbitration and a waiver of class action rights. Please read it carefully.
            </p>
            
            <p>
              ConsenSys Software Inc. is a leading blockchain software development company, focusing on decentralized technologies like Ethereum. ConsenSys plays a crucial role in commerce and finance, and maintains a website at www.consensys.io. Our "Offerings" include text, images, audio, code, and third-party information.
            </p>
            
            <p>
              These Terms of Use (the "Terms," "Terms of Use" or "Agreement") contain the terms and conditions that govern your access to and use of our services, applications, and platforms. By using our services, you agree to be bound by these terms.
            </p>
            
            <p>
              Our services include but are not limited to digital wallet functionality, blockchain transaction processing, and decentralized application support. You acknowledge that cryptocurrency transactions are irreversible and that you are responsible for maintaining the security of your private keys.
            </p>
            
            <p>
              Our services include but are not limited to digital wallet functionality, blockchain transaction processing, and decentralized application support. You acknowledge that cryptocurrency transactions are irreversible and that you are responsible for maintaining the security of your private keys.
            </p>
            
            <p>
              We reserve the right to modify these terms at any time. Continued use of our services after such modifications constitutes acceptance of the updated terms. You are responsible for reviewing these terms periodically.
            </p>
            
            <p>
              By proceeding with the use of our services, you confirm that you have read, understood, and agree to be bound by all the terms and conditions outlined in this agreement.
            </p>
          </div>
        </motion.div>

        {/* Agreement Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-4"
        >
          {/* Checkbox and Terms */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="agree-terms"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="w-5 h-5 text-[#180CB2] bg-white border-gray-300 rounded focus:ring-[#180CB2] focus:ring-2"
            />
            <label htmlFor="agree-terms" className="text-sm text-gray-700">
              I agree to all of the Terms of Use
            </label>
            <div className="ml-auto">
              <div className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>

          {/* I Agree Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAgree}
            disabled={!hasAgreed || !hasScrolledToBottom}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
              hasAgreed && hasScrolledToBottom
                ? 'bg-[#180CB2] hover:shadow-lg cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            I Agree
          </motion.button>

          {/* Scroll Instruction */}
          <p className="text-center text-gray-400 py-2 bg-white" style={{ 
            fontFamily: 'Inter',
            fontWeight: 400,
            fontStyle: 'normal',
            fontSize: '15px',
            lineHeight: '100%',
            letterSpacing: '0%'
          }}>
            Please scroll to read all sections
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TermsScreen;
