import { DAppRequest, DAppResponse, PendingRequest } from '../../types/dapp-requests';
import { ApprovalPopupManager } from './approval-popup-manager'; // Import the ApprovalPopupManager

interface PendingRequest {
  resolve: (response: DAppResponse) => void;
  reject: (error: Error) => void;
  request: DAppRequest;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
}

class DAppRequestQueue {
  private queue: Map<string, PendingRequest> = new Map();
  private pendingPromises: Map<string, { resolve: (response: DAppResponse) => void; reject: (error: Error) => void }> = new Map();
  
  async addRequest(request: DAppRequest): Promise<string> {
    const requestId = crypto.randomUUID();
    
    return new Promise<string>((resolve, reject) => {
      this.pendingPromises.set(requestId, { resolve, reject });
      this.queue.set(requestId, {
        ...request,
        timestamp: Date.now(),
        status: 'pending',
        resolve: (response: DAppResponse) => {
          this.queue.delete(requestId);
          if (this.pendingPromises.has(requestId)) {
            this.pendingPromises.get(requestId)?.resolve(response);
            this.pendingPromises.delete(requestId);
          }
        },
        reject: (error: Error) => {
          this.queue.delete(requestId);
          if (this.pendingPromises.has(requestId)) {
            this.pendingPromises.get(requestId)?.reject(error);
            this.pendingPromises.delete(requestId);
          }
        },
      });
      // For now, immediately resolve the requestId for the caller
      resolve(requestId);
    });
  }
  
  async processRequest(requestId: string): Promise<DAppResponse> {
    return new Promise<DAppResponse>(async (resolve, reject) => {
      const requestEntry = this.queue.get(requestId);
      if (!requestEntry) {
        return reject(new Error('Request not found'));
      }
      
      // Store the promise resolvers for later use when the approval popup responds
      requestEntry.resolve = resolve;
      requestEntry.reject = reject;
      
      // Here you would typically open a popup or UI to get user approval
      // In a real scenario, this would involve sending a message to a UI component
      // and waiting for its response.

      // Real approval flow using ApprovalPopupManager
      try {
        const approvalResponse = await ApprovalPopupManager.openApprovalPopup(requestEntry.request);
        if (approvalResponse.approved) {
          requestEntry.status = 'approved';
          requestEntry.resolve({ success: true, data: approvalResponse.data });
        } else {
          requestEntry.status = 'rejected';
          requestEntry.reject(new Error(approvalResponse.error || 'Request rejected by user'));
        }
      } catch (error) {
        console.error('Error opening approval popup:', error);
        requestEntry.status = 'rejected';
        requestEntry.reject(new Error(`Approval process failed: ${error.message}`));
      }
    });
  }

  // A method to simulate a response from the UI/popup
  handleResponse(requestId: string, approved: boolean, data?: any, error?: string) {
    const requestEntry = this.queue.get(requestId);
    if (requestEntry) {
      if (approved) {
        requestEntry.resolve({ success: true, data });
      } else {
        requestEntry.reject(new Error(error || 'Request rejected by user'));
      }
    }
  }

  getRequest(requestId: string): PendingRequest | undefined {
    return this.queue.get(requestId);
  }

  hasRequest(requestId: string): boolean {
    return this.queue.has(requestId);
  }

  removeRequest(requestId: string): void {
    this.queue.delete(requestId);
    this.pendingPromises.delete(requestId);
  }
}

export const dappRequestQueue = new DAppRequestQueue();


