export interface TransactionApprovalRequest {
  origin: string;
  to: string;
  value: string; // Hex string of wei
  gasEstimate: string; // Hex string
  data?: string; // Hex string of transaction data
  network: string;
}

export interface SignatureApprovalRequest {
  origin: string;
  method: string; // e.g., 'personal_sign', 'eth_signTypedData_v4'
  message: string; // The message to be signed
  from: string; // Address requesting the signature
  network: string;
}

export interface ApprovalResponse {
  approved: boolean;
  data?: string; // e.g., transaction hash or signature
  error?: string;
}

