import '@testing-library/jest-dom';
import React from 'react';

// Jest types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string): R;
    }
  }
}

// Mock browser extension APIs
Object.defineProperty(window, 'chrome', {
  value: {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      },
      sync: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      }
    },
    runtime: {
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn()
    }
  },
  writable: true
});

// Mock Web3 providers
Object.defineProperty(window, 'ethereum', {
  value: {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    isMetaMask: true
  },
  writable: true
});

// Mock crypto APIs
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn()
    }
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

// Mock ethers.js
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    getAddress: jest.fn((address) => address),
    computeAddress: jest.fn((publicKey) => `0x${publicKey.slice(2, 42)}`),
    formatEther: jest.fn((value) => value.toString()),
    parseEther: jest.fn((value) => value.toString()),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
    utils: {
      toUtf8String: jest.fn((data) => data),
      formatEther: jest.fn((value) => value.toString()),
      parseEther: jest.fn((value) => value.toString())
    }
  }
}));

// Mock bip39
jest.mock('bip39', () => ({
  generateMnemonic: jest.fn(() => 'test test test test test test test test test test test junk'),
  validateMnemonic: jest.fn(() => true),
  mnemonicToSeedSync: jest.fn(() => Buffer.from('test-seed'))
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({ toString: () => 'decrypted-data' }))
  },
  SHA256: jest.fn(() => ({ toString: () => 'hash-value' })),
  enc: {
    Utf8: 'utf8',
    Hex: {
      parse: jest.fn()
    }
  },
  mode: {
    CBC: 'cbc'
  },
  pad: {
    Pkcs7: 'pkcs7'
  }
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
  compare: jest.fn(() => Promise.resolve(true))
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} }))
  }))
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
  Toaster: jest.fn(() => null)
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: jest.fn(({ children, ...props }) => React.createElement('div', props, children)),
    button: jest.fn(({ children, ...props }) => React.createElement('button', props, children)),
    span: jest.fn(({ children, ...props }) => React.createElement('span', props, children))
  },
  AnimatePresence: jest.fn(({ children }) => children)
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ArrowLeft: jest.fn(() => React.createElement('span', null, 'ArrowLeft')),
  Wifi: jest.fn(() => React.createElement('span', null, 'Wifi')),
  WifiOff: jest.fn(() => React.createElement('span', null, 'WifiOff')),
  MoreVertical: jest.fn(() => React.createElement('span', null, 'MoreVertical')),
  Home: jest.fn(() => React.createElement('span', null, 'Home')),
  Send: jest.fn(() => React.createElement('span', null, 'Send')),
  Download: jest.fn(() => React.createElement('span', null, 'Download')),
  Settings: jest.fn(() => React.createElement('span', null, 'Settings')),
  Wallet: jest.fn(() => React.createElement('span', null, 'Wallet'))
}));

// Setup test environment
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  });
  
  // Reset chrome storage mock
  (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
    callback({});
  });
  
  (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
    if (callback) callback();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Custom matchers
expect.extend({
  toBeValidAddress(received) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Ethereum address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Ethereum address`,
        pass: false,
      };
    }
  },
  
  toBeValidPrivateKey(received) {
    const pass = /^0x[a-fA-F0-9]{64}$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid private key`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid private key`,
        pass: false,
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAddress(): R;
      toBeValidPrivateKey(): R;
    }
  }
} 