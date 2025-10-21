import { ethers } from 'ethers';
import { getGasPrice, estimateGas, getNetworks } from '../../../../utils/web3-utils';

export const getNetworkName = (chainId: string) => {
  const networks = getNetworks();
  const network = Object.values(networks).find((n) => n.chainId === chainId);
  return network ? network.name : `Unknown Network (${chainId})`;
};

// Enhanced gas fee calculation with real-time pricing
export const calculateGasFee = async (amount: string, toAddress: string, fromAccount: any, currentNetwork: any) => {
  try {
    const networkId = currentNetwork?.id || 'ethereum';
    const networkConfig = getNetworks()[networkId];

    if (!networkConfig) {
      throw new Error(`Unsupported network: ${networkId}`);
    }


    // Try real-time gas service first
    let gasPriceData;
    try {
      const { realTimeGasService } = await import('../../../../utils/real-time-gas-prices');
      gasPriceData = await realTimeGasService.getGasPrices(networkId);
    } catch (realTimeError) {
      // eslint-disable-next-line no-console
      console.warn('Real-time gas service failed, using RPC fallback:', realTimeError);
      // Fallback to RPC
      const gasPrice = await getGasPrice(networkId);
      const gasPriceGwei = Number(BigInt(gasPrice)) / 1e9;
      gasPriceData = {
        gasPrice: gasPriceGwei,
        slow: gasPriceGwei * 0.8,
        standard: gasPriceGwei,
        fast: gasPriceGwei * 1.2,
      };
    }

    // Estimate gas limit
    const gasLimit = await estimateGas(
      fromAccount?.address || fromAccount?.addresses?.[networkId],
      toAddress,
      ethers.parseEther(amount).toString(),
      '0x',
      networkId,
    );

    // Calculate fee using standard gas price
    const gasPriceWei = ethers.parseUnits(gasPriceData.standard.toString(), 'gwei');
    const gasLimitBigInt = BigInt(gasLimit);
    const totalFeeWei = gasPriceWei * gasLimitBigInt;
    const totalFeeEth = ethers.formatEther(totalFeeWei);

    return {
      gasPrice: gasPriceWei.toString(),
      gasLimit,
      totalFee: totalFeeEth,
      networkSymbol: networkConfig.symbol,
      gasPriceGwei: gasPriceData.standard,
      slowGasPrice: gasPriceData.slow,
      fastGasPrice: gasPriceData.fast,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gas fee calculation failed:', error);
    return {
      gasPrice: '0',
      gasLimit: '21000',
      totalFee: '0',
      networkSymbol: 'ETH',
      gasPriceGwei: 0,
      slowGasPrice: 0,
      fastGasPrice: 0,
    };
  }
};
