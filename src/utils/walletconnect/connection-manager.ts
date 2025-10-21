import { SignClient } from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { getConfig } from '../../utils/config-injector';
import type { WalletConnectSession, WalletConnectProposal, SessionTypes, ProposalTypes } from './types';
import { WalletConnectSessionManager } from './session-manager';

export class WalletConnectConnectionManager {
  private client: any = null;
  private projectId: string;
  private session: WalletConnectSession | null = null;
  private proposal: WalletConnectProposal | null = null;
  private uri: string | null = null;
  private connectionTimeout: number;
  private cleanupTimeouts: Set<NodeJS.Timeout>;
  private sessionManager: WalletConnectSessionManager;
  private emit: (event: string, data?: any) => void;

  constructor(
    projectId: string,
    connectionTimeout: number,
    cleanupTimeouts: Set<NodeJS.Timeout>,
    sessionManager: WalletConnectSessionManager,
    emit: (event: string, data?: any) => void,
  ) {
    this.projectId = projectId;
    this.connectionTimeout = connectionTimeout;
    this.cleanupTimeouts = cleanupTimeouts;
    this.sessionManager = sessionManager;
    this.emit = emit;
  }

  public async initialize(): Promise<void> {
    if (this.client) return;

    try {
      this.client = await SignClient.init({
        projectId: this.projectId,
        metadata: {
          name: 'PayCio Wallet',
          description: 'PayCio WalletConnect client',
          url: 'https://paycio.com/',
          icons: ['https://paycio.com/favicon.ico'],
        },
      });

      this.setupClientListeners();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error initializing WalletConnect client:', error);
      this.emit('error', new Error('Failed to initialize WalletConnect'));
    }
  }

  private setupClientListeners(): void {
    this.client.on('session_proposal', this.handleSessionProposal.bind(this));
    this.client.on('session_event', this.handleSessionEvent.bind(this));
    this.client.on('session_update', this.handleSessionUpdate.bind(this));
    this.client.on('session_delete', this.handleSessionDelete.bind(this));
    this.client.on('session_expire', this.handleSessionDelete.bind(this)); // Handle session_expire as session_delete
    // eslint-disable-next-line no-console
    this.client.on('session_ping', (data: any) => console.log('session_ping', data));
    this.client.on('session_request', this.handleSessionRequest.bind(this));
  }

  public async connect(pairingUri?: string): Promise<string> {
    try {
      if (!this.client) {
        await this.initialize();
      }

      if (pairingUri) {
        this.uri = pairingUri;
      } else if (!this.uri) {
        throw new Error('No pairing URI provided');
      }

      const { uri, approval } = await this.client.connect({
        pairingTopic: pairingUri ? undefined : this.session?.topic,
        uri: this.uri,
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'wallet_addEthereumChain',
              'wallet_switchEthereumChain',
            ],
            chains: ['eip155:1'], // Ethereum Mainnet
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      if (uri) {
        this.uri = uri;
        this.emit('display_uri', uri);

        // Set a timeout for connection approval
        const connectionTimeoutId = setTimeout(() => {
          this.emit('error', new Error('WalletConnect connection timed out'));
          this.disconnect(); // Disconnect if timed out
        }, this.connectionTimeout);
        this.cleanupTimeouts.add(connectionTimeoutId);

        const session = await approval();
        clearTimeout(connectionTimeoutId);
        this.cleanupTimeouts.delete(connectionTimeoutId);

        this.onSessionConnected(session);
        return session.topic;
      }

      throw new Error('Failed to establish WalletConnect connection');
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error connecting to WalletConnect:', error);
      this.emit('error', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client && this.session) {
      try {
        await this.client.disconnect({
          topic: this.session.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
        this.onSessionDisconnected();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error disconnecting WalletConnect session:', error);
      }
    } else {
      this.onSessionDisconnected(); // Ensure cleanup even if no active client/session
    }
  }

  public async approveSession(proposal: WalletConnectProposal, accounts: string[], chainId: string): Promise<void> {
    if (!this.client || !proposal) {
      throw new Error('No WalletConnect client or proposal found');
    }

    const { id, params } = proposal;
    const response = {
      id,
      namespaces: {
        eip155: {
          accounts: accounts.map(acc => `eip155:${chainId}:${acc}`),
          chains: [`eip155:${chainId}`],
          methods: params.requiredNamespaces.eip155.methods,
          events: params.requiredNamespaces.eip155.events,
        },
      },
      relay: params.relays[0],
    };

    try {
      const session = await this.client.approve(response);
      this.onSessionConnected(session);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error approving session:', error);
      this.emit('error', error);
      throw error;
    }
  }

  public async rejectSession(proposal: WalletConnectProposal): Promise<void> {
    if (!this.client || !proposal) {
      throw new Error('No WalletConnect client or proposal found');
    }

    try {
      await this.client.reject({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      this.emit('session_rejected');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error rejecting session:', error);
      this.emit('error', error);
      throw error;
    }
  }

  public async ping(): Promise<boolean> {
    if (!this.client || !this.session) {
      return false;
    }
    try {
      await this.client.ping({ topic: this.session.topic });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('WalletConnect ping failed:', error);
      return false;
    }
  }

  // Handlers for client events
  private handleSessionProposal(proposal: ProposalTypes['Struct']): void {
    this.proposal = proposal;
    this.sessionManager.persistProposal(proposal);
    this.emit('session_proposal', proposal);
  }

  private handleSessionEvent(event: any): void {
    this.emit('session_event', event);
  }

  private handleSessionUpdate(update: any): void {
    if (this.session) {
      this.session = { ...this.session, ...update.params.namespaces.eip155 };
      this.sessionManager.persistSession(this.session);
      this.emit('session_update', this.session);
    }
  }

  private handleSessionDelete(): void {
    this.onSessionDisconnected();
  }

  private async handleSessionRequest(request: any): Promise<void> {
    this.emit('session_request', request);
  }

  private onSessionConnected(session: any): void {
    this.session = session;
    this.sessionManager.persistSession(session);
    this.sessionManager.setupSessionHealthCheck(this.client, session);
    this.emit('session_connected', session);
  }

  private onSessionDisconnected(): void {
    this.session = null;
    this.sessionManager.clearPersistedSession();
    this.sessionManager.clearSessionHealthCheck();
    this.emit('session_disconnected');
  }
}
