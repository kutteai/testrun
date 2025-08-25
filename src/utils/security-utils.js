// Default security settings
export const DEFAULT_SECURITY_SETTINGS = {
    autoLockTimeout: 15,
    requirePassword: true,
    biometricAuth: false,
    maxFailedAttempts: 5,
    lockoutDuration: 30
};
// Generate random bytes
export function generateRandomBytes(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}
// Generate session ID
export function generateSessionId() {
    const bytes = generateRandomBytes(32);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
// Create authentication session
export function createAuthSession(duration = 60) {
    const now = Date.now();
    return {
        isAuthenticated: true,
        lastActivity: now,
        sessionId: generateSessionId(),
        expiresAt: now + (duration * 60 * 1000) // Convert minutes to milliseconds
    };
}
// Check if session is valid
export function isSessionValid(session) {
    const now = Date.now();
    return session.isAuthenticated &&
        session.expiresAt > now &&
        (now - session.lastActivity) < (15 * 60 * 1000); // 15 minutes of inactivity
}
// Update session activity
export function updateSessionActivity(session) {
    return {
        ...session,
        lastActivity: Date.now()
    };
}
// Encrypt sensitive data
export function encryptSensitiveData(data, password) {
    return encryptData(data, password);
}
// Decrypt sensitive data
export function decryptSensitiveData(encryptedData, password) {
    return decryptData(encryptedData, password);
}
// Encrypt data with password
export function encryptData(data, password) {
    // In a real implementation, use proper encryption like AES-256
    // For now, we'll use a simple base64 encoding
    const encoded = btoa(data + ':' + password);
    return encoded;
}
// Decrypt data with password
export function decryptData(encryptedData, password) {
    try {
        // In a real implementation, use proper decryption
        // For now, we'll use simple base64 decoding
        const decoded = atob(encryptedData);
        const parts = decoded.split(':');
        if (parts[1] === password) {
            return parts[0];
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
// Hash password
export async function hashPassword(password) {
    return await hashData(password);
}
// Verify password
export async function verifyPassword(password, hashedPassword) {
    const hashedInput = await hashPassword(password);
    return hashedInput === hashedPassword;
}
// Hash data (real implementation)
export async function hashData(data) {
    try {
        // Use Web Crypto API for real hashing
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    catch (error) {
        console.error('Error hashing data:', error);
        throw error;
    }
}
// Generate strong password
export function generateStrongPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}
// Validate password strength
export function validatePasswordStrength(password) {
    const feedback = [];
    let score = 0;
    // Length check
    if (password.length < 8) {
        feedback.push('Password must be at least 8 characters long');
    }
    else {
        score += Math.min(password.length - 8, 4);
    }
    // Character variety checks
    if (/[a-z]/.test(password))
        score += 1;
    if (/[A-Z]/.test(password))
        score += 1;
    if (/[0-9]/.test(password))
        score += 1;
    if (/[^A-Za-z0-9]/.test(password))
        score += 1;
    // Feedback based on missing character types
    if (!/[a-z]/.test(password))
        feedback.push('Add lowercase letters');
    if (!/[A-Z]/.test(password))
        feedback.push('Add uppercase letters');
    if (!/[0-9]/.test(password))
        feedback.push('Add numbers');
    if (!/[^A-Za-z0-9]/.test(password))
        feedback.push('Add special characters');
    const isValid = score >= 3 && password.length >= 8;
    return {
        isValid,
        score: Math.min(score, 5),
        feedback
    };
}
// Check for common passwords
export function isCommonPassword(password) {
    const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'sunshine',
        'princess', 'qwerty123', 'football', 'baseball', 'superman', 'trustno1'
    ];
    return commonPasswords.includes(password.toLowerCase());
}
export function checkRateLimit(currentInfo, maxAttempts = 5, lockoutDuration = 30) {
    const now = Date.now();
    // Check if still locked out
    if (currentInfo.isLocked && now < currentInfo.lockoutUntil) {
        return {
            isAllowed: false,
            remainingAttempts: 0,
            lockoutTime: currentInfo.lockoutUntil - now
        };
    }
    // Reset if lockout period has passed
    if (currentInfo.isLocked && now >= currentInfo.lockoutUntil) {
        return {
            isAllowed: true,
            remainingAttempts: maxAttempts,
            lockoutTime: 0
        };
    }
    // Check if max attempts reached
    if (currentInfo.attempts >= maxAttempts) {
        return {
            isAllowed: false,
            remainingAttempts: 0,
            lockoutTime: lockoutDuration * 60 * 1000
        };
    }
    return {
        isAllowed: true,
        remainingAttempts: maxAttempts - currentInfo.attempts,
        lockoutTime: 0
    };
}
// Update rate limit info
export function updateRateLimit(currentInfo, success, maxAttempts = 5, lockoutDuration = 30) {
    const now = Date.now();
    if (success) {
        // Reset on successful attempt
        return {
            attempts: 0,
            lastAttempt: now,
            isLocked: false,
            lockoutUntil: 0
        };
    }
    else {
        // Increment failed attempts
        const newAttempts = currentInfo.attempts + 1;
        const isLocked = newAttempts >= maxAttempts;
        const lockoutUntil = isLocked ? now + (lockoutDuration * 60 * 1000) : 0;
        return {
            attempts: newAttempts,
            lastAttempt: now,
            isLocked,
            lockoutUntil
        };
    }
}
// Secure storage utilities
export function secureStore(key, value, password) {
    try {
        const encryptedValue = encryptSensitiveData(JSON.stringify(value), password);
        chrome.storage.local.set({ [key]: encryptedValue });
    }
    catch (error) {
        console.error('Error storing secure data:', error);
        throw new Error('Failed to store secure data');
    }
}
export function secureRetrieve(key, password) {
    try {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([key], (result) => {
                if (result[key]) {
                    const decryptedValue = decryptSensitiveData(result[key], password);
                    if (decryptedValue) {
                        resolve(JSON.parse(decryptedValue));
                    }
                    else {
                        reject(new Error('Failed to decrypt data'));
                    }
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    catch (error) {
        console.error('Error retrieving secure data:', error);
        throw new Error('Failed to retrieve secure data');
    }
}
