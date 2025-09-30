// Quick script to check transaction details
// Transaction ID: 0xd5a9bfa20f2c94d25c1b213d96a5b2a023a55992765914dcfcacd9c9399846c4

async function checkTransaction(txHash, network = 'ethereum') {
  try {
    console.log(`🔍 Checking transaction: ${txHash}`);
    console.log(`🌐 Network: ${network}`);
    
    // Import the transaction utilities
    const { getTransactionReceipt } = await import('./utils/web3-utils.ts');
    
    // Get transaction details
    const transaction = await getTransactionReceipt(txHash, network);
    
    if (transaction) {
      console.log('\n✅ Transaction Details Found:');
      console.log('==========================');
      console.log(`Hash: ${transaction.hash || txHash}`);
      console.log(`Status: ${transaction.status || 'Unknown'}`);
      console.log(`Block Number: ${transaction.blockNumber || 'Unknown'}`);
      console.log(`From: ${transaction.from || 'Unknown'}`);
      console.log(`To: ${transaction.to || 'Unknown'}`);
      console.log(`Value: ${transaction.value || '0'}`);
      console.log(`Gas Used: ${transaction.gasUsed || 'Unknown'}`);
      console.log(`Gas Price: ${transaction.gasPrice || 'Unknown'}`);
      console.log(`Transaction Fee: ${transaction.transactionFee || 'Unknown'}`);
      
      // Show input data if available
      if (transaction.input && transaction.input !== '0x') {
        console.log(`Input Data: ${transaction.input}`);
      }
      
      // Show logs if available
      if (transaction.logs && transaction.logs.length > 0) {
        console.log(`\n📄 Logs (${transaction.logs.length}):`);
        transaction.logs.forEach((log, index) => {
          console.log(`  Log ${index + 1}:`);
          console.log(`    Address: ${log.address}`);
          console.log(`    Topics: ${log.topics?.join(', ') || 'None'}`);
          console.log(`    Data: ${log.data}`);
        });
      }
      
      return transaction;
    } else {
      console.log('\n❌ Transaction not found or could not be retrieved');
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking transaction:', error.message);
    return null;
  }
}

// Run the check
const txHash = '0xd5a9bfa20f2c94d25c1b213d96a5b2a023a55992765914dcfcacd9c9399846c4';
checkTransaction(txHash, 'ethereum');



