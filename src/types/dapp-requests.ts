export interface DAppRequest {
  type: 'eth_sendTransaction' | 'eth_sign' | 'personal_sign' | 'eth_signTypedData' | string;
  origin: string;
  id: string;
  params: any[];
}

export interface DAppResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface PendingRequest {
  request: DAppRequest;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  resolve: (response: DAppResponse) => void;
  reject: (error: Error) => void;
}
