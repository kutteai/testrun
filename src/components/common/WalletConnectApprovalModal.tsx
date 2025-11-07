import React from 'react';

const WalletConnectApprovalModal: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">WalletConnect Approval</h3>
        <p className="text-gray-600">Static WalletConnect approval content here.</p>
      </div>
    </div>
  );
};

export default WalletConnectApprovalModal;
