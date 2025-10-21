export interface WalletConnectSession {
  topic: string;
  chainId: number;
  accounts: string[];
  connected: boolean;
  namespaces: Record<string, any>;
  clientMeta: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export interface WalletConnectRequest {
  id: number;
  method: string;
  params: any[];
}

export interface WalletConnectProposal {
  id: number;
  params: {
    requiredNamespaces: Record<string, any>;
    optionalNamespaces?: Record<string, any>;
    relays: Array<{ protocol: string }>;
    proposer: {
      publicKey: string;
      controller: boolean;
      metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
      };
    };
  };
}

// Type aliases for compatibility
export type SessionTypes = {
  Struct: WalletConnectSession;
};

export type ProposalTypes = {
  Struct: WalletConnectProposal;
};
