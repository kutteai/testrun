export interface ENSDomain {
  id: string;
  name: string;
  address: string;
  expiryDate: string;
  price: number;
  isOwned: boolean;
  isAvailable: boolean;
  resolver?: string;
  avatar?: string;
  records?: any;
  notes?: string;
  txHash?: string;
}


