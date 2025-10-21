import { usePortfolio } from '../../../store/PortfolioContext';
import { useNetwork } from '../../../store/NetworkContext';

export const getAccountBalance = (account: any, portfolioValue: any, currentNetwork: any) => {
  if (!portfolioValue?.assets) {
    return { balance: '0', usdValue: 0 };
  }

  // Get the correct address for the current network
  const accountAddress = account?.address || account?.addresses?.[currentNetwork?.id || 'ethereum'];

  if (!accountAddress) {
    return { balance: '0', usdValue: 0 };
  }

  // Find assets for this account's address and current network
  const accountAssets = portfolioValue.assets.filter((asset: any) => asset.address === accountAddress
    && asset.network?.toLowerCase() === (currentNetwork?.id || 'ethereum').toLowerCase());

  if (accountAssets.length === 0) {
    return { balance: '0', usdValue: 0 };
  }

  // Calculate total balance
  const totalBalance = accountAssets.reduce((sum: number, asset: any) => sum + parseFloat(asset.balance || '0'), 0);

  const totalUsdValue = accountAssets.reduce((sum: number, asset: any) => sum + (asset.usdValue || 0), 0);

  return {
    balance: totalBalance.toFixed(6),
    usdValue: totalUsdValue,
  };
};



