export const copyAddress = async (address: string) => {
  try {
    await navigator.clipboard.writeText(address);
    // setCopied(address); // This state needs to be managed at the component level or passed down
    // toast.success('Address copied to clipboard');
    // setTimeout(() => setCopied(null), 2000); // This state needs to be managed at the component level or passed down
    return { success: true, message: 'Address copied to clipboard' };
  } catch {
    // toast.error('Failed to copy address'); // This state needs to be managed at the component level or passed down
    return { success: false, message: 'Failed to copy address' };
  }
};



