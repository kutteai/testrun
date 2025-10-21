export const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export const formatUSD = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);

export const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

