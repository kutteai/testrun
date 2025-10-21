export class DerivationPathService {
  public getNetworkDerivationPath(networkId: string, accountIndex: number): string {
    switch (networkId) {
      case 'bitcoin':
        return `m/84'/0'/0'/${accountIndex}`; // Native SegWit
      case 'solana':
        return `m/44'/501'/${accountIndex}'/0'`; // Solana BIP44
      case 'ton':
        return `m/44'/607'/${accountIndex}'/0'`; // TON BIP44
      case 'xrp':
        return `m/44'/144'/${accountIndex}'/0'`; // XRP BIP44
      default:
        return `m/44'/60'/0'/0/${accountIndex}`; // Default Ethereum path
    }
  }
}

export const derivationPathService = new DerivationPathService();
