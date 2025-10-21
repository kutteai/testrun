// Quick script to check transaction details
// Transaction ID: 0xd5a9bfa20f2c94d25c1b213d96a5b2a023a55992765914dcfcacd9c9399846c4

async function checkTransaction(txHash, network = 'ethereum') {
  try {


    // Import the transaction utilities
    const { getTransactionReceipt } = await import('./utils/web3-utils.ts');
    
    // Get transaction details
    const transaction = await getTransactionReceipt(txHash, network);
    
    if (transaction) {


      // Show input data if available
      if (transaction.input && transaction.input !== '0x') {

      }
      
      // Show logs if available
      if (transaction.logs && transaction.logs.length > 0) {
        console.log(`\n📄 Logs (${transaction.logs.length}):`);
        transaction.logs.forEach((log, index) => {


          console.log(`    Topics: ${log.topics?.join(', ') || 'None'}`);

        });
      }
      
      return transaction;
    } else {

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


