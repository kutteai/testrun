import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { hashPassword, verifyPassword } from '../utils/crypto-utils';
const SecurityContext = createContext(undefined);
export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
};
export const SecurityProvider = ({ children }) => {
    const [securityState, setSecurityState] = useState({
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
        chrome.storage.local.get(['securitySettings', 'isWalletUnlocked', 'passwordHash'], (result) => {
            if (result.securitySettings) {
                setSecurityState(prev => ({
                    ...prev,
                    ...result.securitySettings,
                    isWalletUnlocked: result.isWalletUnlocked || false
                }));
            }
        });
    }, []);
    // Auto-lock functionality
    useEffect(() => {
        if (!securityState.isWalletUnlocked)
            return;
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
    const authenticate = async (password) => {
        try {
            // Get stored password hash
            const storedHash = await getStoredPasswordHash();
            if (!storedHash) {
                // First time authentication, create password hash
                const hash = await hashPassword(password);
                await storePasswordHash(hash);
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
            }
            else {
                // Increment failed attempts
                setSecurityState(prev => ({
                    ...prev,
                    failedAttempts: prev.failedAttempts + 1
                }));
            }
            return isValid;
        }
        catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    };
    const lockWallet = () => {
        setSecurityState(prev => ({
            ...prev,
            isAuthenticated: false,
            isWalletUnlocked: false
        }));
        chrome.storage.local.set({ isWalletUnlocked: false });
    };
    const unlockWallet = async (password) => {
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
                chrome.storage.local.set({ isWalletUnlocked: true });
            }
            return isValid;
        }
        catch (error) {
            console.error('Unlock error:', error);
            return false;
        }
    };
    const updateSecuritySettings = (settings) => {
        setSecurityState(prev => ({
            ...prev,
            ...settings
        }));
        chrome.storage.local.set({ securitySettings: settings });
    };
    const resetFailedAttempts = () => {
        setSecurityState(prev => ({
            ...prev,
            failedAttempts: 0
        }));
    };
    const checkSession = async () => {
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
    const authenticateUser = async (password) => {
        return authenticate(password);
    };
    // Store password hash
    const storePasswordHash = async (hash) => {
        chrome.storage.local.set({ passwordHash: hash });
    };
    // Get stored password hash
    const getStoredPasswordHash = async () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['passwordHash'], (result) => {
                resolve(result.passwordHash || null);
            });
        });
    };
    const value = {
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
    return (_jsx(SecurityContext.Provider, { value: value, children: children }));
};
