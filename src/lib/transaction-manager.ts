import { ethers } from 'ethers';
import { Connection, Transaction as SolanaTransaction, SystemProgram, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import type { Network, TransactionRequest, Transaction, GasSettings } from '../types';

/**
 * Multi-chain transaction manager
 * Handles transaction creation, signing, and broadcasting
 */

export class TransactionManager {
  /**
   * Estimate gas for EVM transaction
   */
  static async estimateGas(
    provider: ethers.Provider,
    tx: Partial<ethers.TransactionRequest>
  ): Promise<GasSettings> {
    try {
      const feeData = await provider.getFeeData();
      const gasLimit = await provider.estimateGas(tx);

      return {
        gasLimit: gasLimit.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        gasPrice: feeData.gasPrice?.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${(error as Error).message}`);
    }
  }

  /**
   * Build EVM transaction
   */
  static async buildEVMTransaction(
    provider: ethers.Provider,
    from: string,
    to: string,
    value: string,
    data?: string,
    gasSettings?: GasSettings
  ): Promise<ethers.TransactionRequest> {
    const nonce = await provider.getTransactionCount(from, 'pending');
    
    const tx: ethers.TransactionRequest = {
      from,
      to,
      value: ethers.parseEther(value),
      nonce,
    };

    if (data) {
      tx.data = data;
    }

    // Add gas settings or estimate
    if (gasSettings) {
      if (gasSettings.maxFeePerGas && gasSettings.maxPriorityFeePerGas) {
        // EIP-1559
        tx.maxFeePerGas = BigInt(gasSettings.maxFeePerGas);
        tx.maxPriorityFeePerGas = BigInt(gasSettings.maxPriorityFeePerGas);
      } else if (gasSettings.gasPrice) {
        // Legacy
        tx.gasPrice = BigInt(gasSettings.gasPrice);
      }
      
      if (gasSettings.gasLimit) {
        tx.gasLimit = BigInt(gasSettings.gasLimit);
      }
    } else {
      // Auto-estimate gas
      const estimated = await this.estimateGas(provider, tx);
      
      if (estimated.maxFeePerGas && estimated.maxPriorityFeePerGas) {
        tx.maxFeePerGas = BigInt(estimated.maxFeePerGas);
        tx.maxPriorityFeePerGas = BigInt(estimated.maxPriorityFeePerGas);
      } else if (estimated.gasPrice) {
        tx.gasPrice = BigInt(estimated.gasPrice);
      }
      
      if (estimated.gasLimit) {
        tx.gasLimit = BigInt(estimated.gasLimit);
      }
    }

    return tx;
  }

  /**
   * Sign and send EVM transaction
   */
  static async sendEVMTransaction(
    provider: ethers.Provider,
    wallet: ethers.Wallet,
    tx: ethers.TransactionRequest
  ): Promise<string> {
    try {
      const signer = wallet.connect(provider);
      const response = await signer.sendTransaction(tx);
      return response.hash;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Build Solana transaction
   */
  static async buildSolanaTransaction(
    connection: Connection,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    lamports: number
  ): Promise<SolanaTransaction> {
    const transaction = new SolanaTransaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction;
  }

  /**
   * Send Solana transaction
   */
  static async sendSolanaTransaction(
    connection: Connection,
    transaction: SolanaTransaction,
    signers: any[]
  ): Promise<string> {
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        {
          commitment: 'confirmed',
        }
      );
      return signature;
    } catch (error) {
      throw new Error(`Failed to send Solana transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Build Bitcoin transaction
   */
  static async buildBitcoinTransaction(
    network: bitcoin.Network,
    inputs: Array<{ txid: string; vout: number; value: number; address: string }>,
    outputs: Array<{ address: string; value: number }>,
    changeAddress: string,
    feeRate: number = 10
  ): Promise<bitcoin.Psbt> {
    const psbt = new bitcoin.Psbt({ network });

    let totalInput = 0;
    let totalOutput = 0;

    // Add inputs
    for (const input of inputs) {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(input.address, network),
          value: input.value,
        },
      });
      totalInput += input.value;
    }

    // Add outputs
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: output.value,
      });
      totalOutput += output.value;
    }

    // Calculate fee (rough estimate)
    const txSize = inputs.length * 148 + outputs.length * 34 + 10;
    const fee = Math.ceil(txSize * feeRate);

    // Add change output if needed
    const change = totalInput - totalOutput - fee;
    if (change > 546) { // Dust threshold
      psbt.addOutput({
        address: changeAddress,
        value: change,
      });
    }

    return psbt;
  }

  /**
   * Send TRON transaction
   */
  static async sendTRONTransaction(
    tronWeb: any,
    from: string,
    to: string,
    amount: number
  ): Promise<string> {
    try {
      const transaction = await tronWeb.transactionBuilder.sendTrx(
        to,
        amount,
        from
      );
      
      const signedTx = await tronWeb.trx.sign(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);
      
      if (!result.result) {
        throw new Error(result.message || 'Transaction failed');
      }
      
      return result.txid;
    } catch (error) {
      throw new Error(`Failed to send TRON transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Get transaction status
   */
  static async getTransactionStatus(
    network: Network,
    txHash: string
  ): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      switch (network.type) {
        case 'EVM': {
          const provider = new ethers.JsonRpcProvider(network.rpcUrl);
          const receipt = await provider.getTransactionReceipt(txHash);
          
          if (!receipt) return 'pending';
          return receipt.status === 1 ? 'confirmed' : 'failed';
        }

        case 'Solana': {
          const connection = new Connection(network.rpcUrl);
          const status = await connection.getSignatureStatus(txHash);
          
          if (!status.value) return 'pending';
          if (status.value.err) return 'failed';
          return status.value.confirmationStatus === 'finalized' ? 'confirmed' : 'pending';
        }

        case 'Bitcoin':
        case 'Litecoin': {
          // Would need to query block explorer API
          // Implementation depends on chosen API
          return 'pending';
        }

        case 'TRON': {
          const TronWeb = (await import('tronweb')).default;
          const tronWeb = new TronWeb({ fullHost: network.rpcUrl });
          const txInfo = await tronWeb.trx.getTransaction(txHash);
          
          if (!txInfo) return 'pending';
          return txInfo.ret[0].contractRet === 'SUCCESS' ? 'confirmed' : 'failed';
        }

        default:
          return 'pending';
      }
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return 'pending';
    }
  }

  /**
   * Calculate transaction fee
   */
  static async calculateFee(
    network: Network,
    gasSettings: GasSettings
  ): Promise<{ fee: string; feeUSD?: number }> {
    switch (network.type) {
      case 'EVM': {
        const gasLimit = BigInt(gasSettings.gasLimit || '21000');
        let gasPrice: bigint;

        if (gasSettings.maxFeePerGas) {
          gasPrice = BigInt(gasSettings.maxFeePerGas);
        } else if (gasSettings.gasPrice) {
          gasPrice = BigInt(gasSettings.gasPrice);
        } else {
          gasPrice = BigInt('20000000000'); // 20 gwei default
        }

        const feeWei = gasLimit * gasPrice;
        const feeEther = ethers.formatEther(feeWei);
        
        return { fee: feeEther };
      }

      case 'Solana': {
        // Solana fees are typically 5000 lamports (0.000005 SOL)
        return { fee: '0.000005' };
      }

      case 'Bitcoin':
      case 'Litecoin': {
        // Would calculate based on tx size and fee rate
        return { fee: '0.0001' };
      }

      case 'TRON': {
        // TRON fees are bandwidth-based, typically free for most txs
        return { fee: '0' };
      }

      default:
        return { fee: '0' };
    }
  }

  /**
   * Format transaction for display
   */
  static formatTransaction(tx: Transaction): {
    formattedValue: string;
    formattedFee: string;
    statusColor: string;
    statusText: string;
  } {
    const statusMap = {
      pending: { color: 'text-yellow-600', text: 'Pending' },
      confirmed: { color: 'text-green-600', text: 'Confirmed' },
      failed: { color: 'text-red-600', text: 'Failed' },
    };

    return {
      formattedValue: `${tx.value} ${tx.symbol}`,
      formattedFee: tx.gasUsed && tx.gasPrice 
        ? ethers.formatEther(BigInt(tx.gasUsed) * BigInt(tx.gasPrice))
        : '—',
      statusColor: statusMap[tx.status].color,
      statusText: statusMap[tx.status].text,
    };
  }
}