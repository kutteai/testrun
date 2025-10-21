import { WalletConnectSession, WalletConnectRequest, WalletConnectProposal, SessionTypes, ProposalTypes } from './types';
import { storage } from '../../utils/storage-utils';

export class WalletConnectSessionManager {
  private sessionStorageKey = 'walletconnect_session';
  private proposalStorageKey = 'walletconnect_proposal';
  private sessionHealthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {}

  // Load persisted session on initialization
  public loadPersistedSession(): WalletConnectSession | null {
    try {
      const storedSession = localStorage.getItem(this.sessionStorageKey);
      if (storedSession) {
        return JSON.parse(storedSession) as WalletConnectSession;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading persisted session:', error);
    }
    return null;
  }

  // Persist session to local storage
  public persistSession(session: WalletConnectSession): void {
    try {
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(session));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error persisting session:', error);
    }
  }

  // Clear persisted session from local storage
  public clearPersistedSession(): void {
    try {
      localStorage.removeItem(this.sessionStorageKey);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error clearing persisted session:', error);
    }
  }

  // Setup session health check (example - adjust as needed)
  public setupSessionHealthCheck(client: any, session: WalletConnectSession, intervalMs: number = 60000): void {
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
    }
    this.sessionHealthCheckInterval = setInterval(async () => {
      try {
        await client.ping({ topic: session.topic });
        // console.log('WalletConnect session ping successful');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('WalletConnect session ping failed, attempting to reconnect:', error);
        // In a real scenario, you might want to emit a 'session_disconnected' event
        // and attempt to re-establish connection or prompt the user.
        this.clearSessionHealthCheck();
      }
    }, intervalMs);
  }

  public clearSessionHealthCheck(): void {
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
      this.sessionHealthCheckInterval = null;
    }
  }

  public persistProposal(proposal: WalletConnectProposal): void {
    try {
      localStorage.setItem(this.proposalStorageKey, JSON.stringify(proposal));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error persisting proposal:', error);
    }
  }

  public loadPersistedProposal(): WalletConnectProposal | null {
    try {
      const savedProposal = localStorage.getItem(this.proposalStorageKey);
      if (savedProposal) {
        return JSON.parse(savedProposal);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading persisted proposal:', error);
    }
    return null;
  }

  public getSessionStorageKey(): string {
    return this.sessionStorageKey;
  }

  public getProposalStorageKey(): string {
    return this.proposalStorageKey;
  }
}
