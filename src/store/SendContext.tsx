import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  balance: string;
  decimals: number;
  price: number;
  change24h: number;
  logo?: string;
  isCustom: boolean;
  isAutoDetected?: boolean;
}

interface SendContextType {
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  isTokenTransfer: boolean;
  clearSelection: () => void;
}

const SendContext = createContext<SendContextType | undefined>(undefined);

export const SendProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const isTokenTransfer = selectedToken !== null;

  const clearSelection = () => {
    setSelectedToken(null);
  };

  return (
    <SendContext.Provider 
      value={{ 
        selectedToken, 
        setSelectedToken, 
        isTokenTransfer,
        clearSelection 
      }}
    >
      {children}
    </SendContext.Provider>
  );
};

export const useSend = () => {
  const context = useContext(SendContext);
  if (context === undefined) {
    throw new Error('useSend must be used within a SendProvider');
  }
  return context;
};

export type { Token };
