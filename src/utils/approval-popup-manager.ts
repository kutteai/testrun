import { getBrowser } from './browser';
import {
  TransactionApprovalRequest,
  SignatureApprovalRequest,
  ApprovalResponse,
} from '../components/modals/ApprovalModal/ApprovalModal.types';

const browserAPI = getBrowser();

type ApprovalRequest = TransactionApprovalRequest | SignatureApprovalRequest;

interface PendingApproval {
  resolve: (response: ApprovalResponse) => void;
  reject: (error: Error) => void;
  windowId?: number;
}

class ApprovalPopupManager {
  private static pendingApprovals = new Map<string, PendingApproval>();

  static async openApprovalPopup(request: ApprovalRequest): Promise<ApprovalResponse> {
    return new Promise(async (resolve, reject) => {
      const requestId = Date.now().toString(); // Simple unique ID for now
      ApprovalPopupManager.pendingApprovals.set(requestId, { resolve, reject });

      try {
        const popupUrl = browserAPI.runtime.getURL(
          `popup.html?approval=true&requestId=${requestId}&requestType=${'to' in request ? 'transaction' : 'signature'}`
        );

        const popupWindow = await browserAPI.windows.create({
          url: popupUrl,
          type: 'popup',
          width: 400,
          height: 600,
        });

        if (popupWindow?.id) {
          ApprovalPopupManager.pendingApprovals.get(requestId)!.windowId = popupWindow.id;
        } else {
          throw new Error('Failed to create approval popup window.');
        }

        // Send the full request object to the popup via runtime message once it's loaded
        const messageListener = (message: any) => {
          if (message.type === 'APPROVAL_REQUEST_READY' && message.requestId === requestId) {
            browserAPI.runtime.sendMessage({
              type: 'APPROVAL_REQUEST_DATA',
              requestId,
              request,
            });
          }
        };
        browserAPI.runtime.onMessage.addListener(messageListener);

        // Listen for approval response from the popup
        const responseListener = (message: any) => {
          if (message.type === 'APPROVAL_RESPONSE' && message.requestId === requestId) {
            browserAPI.runtime.onMessage.removeListener(messageListener);
            browserAPI.runtime.onMessage.removeListener(responseListener);
            const pending = ApprovalPopupManager.pendingApprovals.get(requestId);
            if (pending) {
              ApprovalPopupManager.pendingApprovals.delete(requestId);
              if (popupWindow?.id) {
                browserAPI.windows.remove(popupWindow.id);
              }
              if (message.approved) {
                pending.resolve({ approved: true, data: message.data });
              } else {
                pending.reject(new Error(message.error || 'User rejected the request'));
              }
            }
          }
        };
        browserAPI.runtime.onMessage.addListener(responseListener);

      } catch (error) {
        console.error('Error opening approval popup:', error);
        ApprovalPopupManager.pendingApprovals.delete(requestId);
        reject(error);
      }
    });
  }

  static async handlePopupClose(windowId: number) {
    // Find any pending approval requests associated with this windowId
    for (const [requestId, pending] of ApprovalPopupManager.pendingApprovals.entries()) {
      if (pending.windowId === windowId) {
        ApprovalPopupManager.pendingApprovals.delete(requestId);
        pending.reject(new Error('Approval popup closed by user.'));
        break;
      }
    }
  }
}

// Handle popup window closing
browserAPI.windows.onRemoved.addListener((windowId: number) => {
  ApprovalPopupManager.handlePopupClose(windowId);
});

export default ApprovalPopupManager;

