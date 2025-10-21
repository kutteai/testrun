import React from 'react';
import {
  TransactionApprovalRequest,
  SignatureApprovalRequest,
} from './ApprovalModal.types';

interface ApprovalModalProps {
  request: TransactionApprovalRequest | SignatureApprovalRequest;
  onApprove: (data?: string) => void;
  onReject: (error?: string) => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ request, onApprove, onReject }) => {
  const isTransactionRequest = (req: any): req is TransactionApprovalRequest => {
    return 'to' in req && 'value' in req;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Approval Request</h2>

        {/* DApp Origin */}
        <p className="text-gray-600 mb-2">
          <span className="font-semibold">From:</span> {request.origin}
        </p>

        {isTransactionRequest(request) ? (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-gray-700">Transaction Details</h3>
            <p className="text-gray-700 mb-1"><span className="font-semibold">To:</span> {request.to}</p>
            <p className="text-gray-700 mb-1"><span className="font-semibold">Value:</span> {parseInt(request.value, 16) / (10**18)} ETH</p>
            <p className="text-gray-700 mb-1"><span className="font-semibold">Gas Estimate:</span> {parseInt(request.gasEstimate, 16).toString()} gas</p>
            {request.data && <p className="text-gray-700 mb-1"><span className="font-semibold">Data:</span> {request.data.substring(0, 60)}...</p>}
            <p className="text-gray-700 mb-4"><span className="font-semibold">Network:</span> {request.network}</p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-gray-700">Signature Request</h3>
            <p className="text-gray-700 mb-1"><span className="font-semibold">Method:</span> {request.method}</p>
            <p className="text-gray-700 mb-1"><span className="font-semibold">From:</span> {request.from}</p>
            <p className="text-gray-700 mb-4"><span className="font-semibold">Message:</span> {request.message.substring(0, 100)}...</p>
            <p className="text-gray-700 mb-4"><span className="font-semibold">Network:</span> {request.network}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={() => onReject('User rejected')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove()}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

