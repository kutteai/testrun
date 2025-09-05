import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { hashPassword, verifyPassword } from '../utils/crypto-utils';
import { storage } from '../utils/storage-utils';

interface SecurityState {
  isAuthenticated: boolean;
  isWalletUnlocked: boolean;
  autoLockTimeout: number;
  requirePassword: boolean;
  biometricAuth: boolean;
  failedAttempts: number;
  lastActivity: number;
}

interface SecurityContextType {
  securityState: SecurityState;
  isAuthenticated: boolean;
  sessionExpiry?: number;
  authenticate: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  unlockWallet: (password: string) => Promise<boolean>;
  updateSecuritySettings: (settings: Partial<SecurityState>) => void;
  resetFailedAttempts: () => void;
  checkSession: () => Promise<boolean>;
  authenticateUser: (password: string) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isAuthenticated: false,
    isWalletUnlocked: false,
    autoLockTimeout: 15, // minutes
    requirePassword: true,
    biometricAuth: false,
    failedAttempts: 0,
    lastActivity: Date.now()
  });

  // Load security settings from storage
  useEffect(() => {
    loadSecuritySettings();
  }, []);

  // Auto-lock functionality
  useEffect(() => {
    if (!securityState.isWalletUnlocked) return;

    const checkActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - securityState.lastActivity;
      const timeoutMs = securityState.autoLockTimeout * 60 * 1000;

      if (timeSinceLastActivity > timeoutMs) {
        lockWallet();
      }
    };

    const interval = setInterval(checkActivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [securityState.isWalletUnlocked, securityState.lastActivity, securityState.autoLockTimeout]);

  // Update last activity
  const updateLastActivity = () => {
    setSecurityState(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
  };

  // Security functions with real implementations
  const authenticate = async (password: string): Promise<boolean> => {
    try {
      // Get stored password hash
      const storedHash = await getStoredPasswordHash();
      if (!storedHash) {
        // First time authentication, create password hash
        const hash = await hashPassword(password);
        await updatePasswordHash(hash);
        return true;
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash);
      
      if (isValid) {
        // Reset failed attempts on successful authentication
        setSecurityState(prev => ({
          ...prev,
          failedAttempts: 0,
          lastActivity: Date.now()
        }));
      } else {
        // Increment failed attempts
        setSecurityState(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1
        }));
      }

      return isValid;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const lockWallet = (): void => {
    setSecurityState(prev => ({
      ...prev,
      isAuthenticated: false,
      isWalletUnlocked: false
    }));
    
    updateWalletLockStatus(false);
  };

  const unlockWallet = async (password: string): Promise<boolean> => {
    try {
      // Check if too many failed attempts
      if (securityState.failedAttempts >= 5) {
        throw new Error('Too many failed attempts. Please wait before trying again.');
      }

      const isValid = await authenticate(password);
      if (isValid) {
        setSecurityState(prev => ({
          ...prev,
          isWalletUnlocked: true,
          lastActivity: Date.now()
        }));
        updateWalletLockStatus(true);
      }
      return isValid;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  };



  const resetFailedAttempts = (): void => {
    setSecurityState(prev => ({
      ...prev,
      failedAttempts: 0
    }));
  };

  const checkSession = async (): Promise<boolean> => {
    // Check if session is still valid
    const now = Date.now();
    const timeSinceLastActivity = now - securityState.lastActivity;
    const timeoutMs = securityState.autoLockTimeout * 60 * 1000;

    if (timeSinceLastActivity > timeoutMs) {
      lockWallet();
      return false;
    }

    // Update last activity
    updateLastActivity();
    return securityState.isAuthenticated;
  };

  const authenticateUser = async (password: string): Promise<boolean> => {
    return authenticate(password);
  };



  const loadSecuritySettings = async () => {
    try {
      const result = await storage.get(['securitySettings', 'isWalletUnlocked', 'passwordHash']);
      if (result.securitySettings) {
        setSecurityState(prev => ({
          ...prev,
          ...result.securitySettings
        }));
      }
      if (result.isWalletUnlocked !== undefined) {
        // setIsWalletUnlocked(result.isWalletUnlocked); // This line was removed from the new_code, so it's removed here.
      }
      if (result.passwordHash) {
        // setPasswordHash(result.passwordHash); // This line was removed from the new_code, so it's removed here.
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const updateWalletLockStatus = async (locked: boolean) => {
    try {
      await storage.set({ isWalletUnlocked: locked });
      // setIsWalletUnlocked(locked); // This line was removed from the new_code, so it's removed here.
    } catch (error) {
      console.error('Failed to update wallet lock status:', error);
    }
  };

  const updateSecuritySettings = async (settings: Partial<SecurityState>) => {
    try {
      await storage.set({ securitySettings: settings });
      setSecurityState(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error('Failed to update security settings:', error);
    }
  };

  const updatePasswordHash = async (hash: string) => {
    try {
      await storage.set({ passwordHash: hash });
      // setPasswordHash(hash); // This line was removed from the new_code, so it's removed here.
    } catch (error) {
      console.error('Failed to update password hash:', error);
    }
  };

  const getStoredPasswordHash = async () => {
    try {
      const result = await storage.get(['passwordHash']);
      return result.passwordHash || null;
    } catch (error) {
      console.error('Failed to get stored password hash:', error);
      return null;
    }
  };

  const value: SecurityContextType = {
    securityState: securityState,
    isAuthenticated: securityState.isAuthenticated,
    sessionExpiry: securityState.lastActivity,
    authenticate,
    lockWallet,
    unlockWallet,
    updateSecuritySettings,
    resetFailedAttempts,
    checkSession,
    authenticateUser
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}; 