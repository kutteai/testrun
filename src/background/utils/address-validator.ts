export function validateAddress(address: string, type = 'ethereum'): boolean {
  if (!address || typeof address !== 'string') return false;

  switch (type) {
    case 'ethereum':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'bitcoin':
      // Basic Bitcoin address validation (P2PKH, P2SH, Bech32)
      return /^[13][a-km-zA-HJ-NP-Z0-9]{26,33}$/.test(address) // P2PKH, P2SH
        || /^(bc1)[0-9a-zA-HJ-NP-Z]{2,59}$/.test(address); // Bech32
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'tron':
      return /^T[a-zA-Z0-9]{33}$/.test(address);
    case 'litecoin':
      return /^[LM3][a-km-zA-HJ-NP-Z0-9]{26,33}$/.test(address);
    case 'xrp':
      return /^r[0-9a-zA-Z]{24,34}$/.test(address);
    case 'ton':
      return /^[U][0-9a-zA-Z\-_]{47}$/.test(address);
    default:
      return false;
  }
}
