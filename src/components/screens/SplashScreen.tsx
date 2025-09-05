import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import splashIcon from '../../assets/splash.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    // Show splash screen for 2 seconds then transition to main app
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full bg-[#180CB2] flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center relative"
      >
        {/* Splash Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
                           <img
                   src={splashIcon}
                   alt="Paycio Icon"
                   className="w-32 h-32 object-contain"
                 />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
