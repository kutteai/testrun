import { ethers } from 'ethers';
import { getRealBalance, getTokenBalance } from './web3-utils';

export interface DeFiProtocol {
  id: string;
  name: string;
  description: string;
  category: 'lending' | 'dex' | 'yield' | 'derivatives' | 'bridge';
  networks: string[];
  tvl: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  website: string;
  logo: string;
}

export interface DeFiPosition {
  id: string;
  protocol: string;
  type: 'liquidity' | 'lending' | 'yield' | 'stake';
  token: string;
  amount: string;
  value: number;
  apy: number;
  rewards: string[];
  network: string;
  contractAddress: string;
  createdAt: number;
}

export interface DeFiYield {
  protocol: string;
  token: string;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  minAmount: string;
  maxAmount: string;
}

export class DeFiManager {
  private protocols: Map<string, DeFiProtocol> = new Map();
  private positions: Map<string, DeFiPosition> = new Map();

  constructor() {
    this.initializeProtocols();
  }

  // Initialize supported DeFi protocols
  private initializeProtocols(): void {
    const protocolList: DeFiProtocol[] = [
      {
        id: 'uniswap-v3',
        name: 'Uniswap V3',
        description: 'Decentralized exchange with concentrated liquidity',
        category: 'dex',
        networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        tvl: 2500000000,
        apy: 15.5,
        risk: 'medium',
        website: 'https://uniswap.org',
        logo: 'https://uniswap.org/static/media/logo.1b9c8b6c.png'
      },
      {
        id: 'aave-v3',
        name: 'Aave V3',
        description: 'Decentralized lending and borrowing protocol',
        category: 'lending',
        networks: ['ethereum', 'polygon', 'avalanche', 'arbitrum'],
        tvl: 1500000000,
        apy: 8.2,
        risk: 'low',
        website: 'https://aave.com',
        logo: 'https://aave.com/favicon.ico'
      },
      {
        id: 'compound-v3',
        name: 'Compound V3',
        description: 'Algorithmic interest rate protocol',
        category: 'lending',
        networks: ['ethereum', 'polygon'],
        tvl: 800000000,
        apy: 7.8,
        risk: 'low',
        website: 'https://compound.finance',
        logo: 'https://compound.finance/favicon.ico'
      },
      {
        id: 'curve',
        name: 'Curve Finance',
        description: 'Stablecoin exchange and yield farming',
        category: 'dex',
        networks: ['ethereum', 'polygon', 'avalanche', 'arbitrum'],
        tvl: 1200000000,
        apy: 12.3,
        risk: 'medium',
        website: 'https://curve.fi',
        logo: 'https://curve.fi/favicon.ico'
      },
      {
        id: 'yearn-finance',
        name: 'Yearn Finance',
        description: 'Automated yield farming strategies',
        category: 'yield',
        networks: ['ethereum', 'polygon'],
        tvl: 600000000,
        apy: 18.7,
        risk: 'high',
        website: 'https://yearn.finance',
        logo: 'https://yearn.finance/favicon.ico'
      },
      {
        id: 'balancer',
        name: 'Balancer',
        description: 'Automated portfolio manager and trading platform',
        category: 'dex',
        networks: ['ethereum', 'polygon', 'arbitrum'],
        tvl: 400000000,
        apy: 14.2,
        risk: 'medium',
        website: 'https://balancer.fi',
        logo: 'https://balancer.fi/favicon.ico'
      }
    ];

    protocolList.forEach(protocol => {
      this.protocols.set(protocol.id, protocol);
    });
  }

  // Get all protocols
  getAllProtocols(): DeFiProtocol[] {
    return Array.from(this.protocols.values());
  }

  // Get protocols by category
  getProtocolsByCategory(category: DeFiProtocol['category']): DeFiProtocol[] {
    return this.getAllProtocols().filter(protocol => protocol.category === category);
  }

  // Get protocols by network
  getProtocolsByNetwork(network: string): DeFiProtocol[] {
    return this.getAllProtocols().filter(protocol => protocol.networks.includes(network));
  }

  // Get protocol by ID
  getProtocol(id: string): DeFiProtocol | undefined {
    return this.protocols.get(id);
  }

  // Get yield opportunities
  async getYieldOpportunities(network: string, token: string): Promise<DeFiYield[]> {
    const protocols = this.getProtocolsByNetwork(network);
    const yields: DeFiYield[] = [];

    for (const protocol of protocols) {
      try {
        // In a real implementation, you would fetch actual APY data from APIs
        const yieldData: DeFiYield = {
          protocol: protocol.id,
          token,
          apy: protocol.apy + Math.random() * 5, // Add some variation
          tvl: protocol.tvl,
          risk: protocol.risk,
          minAmount: '0.01',
          maxAmount: '1000000'
        };
        yields.push(yieldData);
      } catch (error) {
        console.warn(`Failed to get yield for ${protocol.name}:`, error);
      }
    }

    return yields.sort((a, b) => b.apy - a.apy);
  }

  // Add liquidity to DEX
  async addLiquidity(
    protocol: string,
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    network: string,
    walletAddress: string,
    privateKey: string
  ): Promise<DeFiPosition> {
    try {
      const protocolInfo = this.protocols.get(protocol);
      if (!protocolInfo) {
        throw new Error('Protocol not found');
      }

      // In a real implementation, you would interact with the actual protocol contracts
      const position: DeFiPosition = {
        id: `${protocol}-${tokenA}-${tokenB}-${Date.now()}`,
        protocol,
        type: 'liquidity',
        token: `${tokenA}/${tokenB}`,
        amount: amountA,
        value: parseFloat(amountA) * 2000, // Simplified value calculation
        apy: protocolInfo.apy,
        rewards: [],
        network,
        contractAddress: this.getProtocolContract(protocol, network),
        createdAt: Date.now()
      };

      this.positions.set(position.id, position);
      this.savePositions();

      return position;
    } catch (error) {
      throw new Error(`Failed to add liquidity: ${error}`);
    }
  }

  // Lend tokens
  async lendTokens(
    protocol: string,
    token: string,
    amount: string,
    network: string,
    walletAddress: string,
    privateKey: string
  ): Promise<DeFiPosition> {
    try {
      const protocolInfo = this.protocols.get(protocol);
      if (!protocolInfo) {
        throw new Error('Protocol not found');
      }

      const position: DeFiPosition = {
        id: `${protocol}-lend-${token}-${Date.now()}`,
        protocol,
        type: 'lending',
        token,
        amount,
        value: parseFloat(amount) * 2000, // Simplified value calculation
        apy: protocolInfo.apy,
        rewards: [],
        network,
        contractAddress: this.getProtocolContract(protocol, network),
        createdAt: Date.now()
      };

      this.positions.set(position.id, position);
      this.savePositions();

      return position;
    } catch (error) {
      throw new Error(`Failed to lend tokens: ${error}`);
    }
  }

  // Stake tokens
  async stakeTokens(
    protocol: string,
    token: string,
    amount: string,
    network: string,
    walletAddress: string,
    privateKey: string
  ): Promise<DeFiPosition> {
    try {
      const protocolInfo = this.protocols.get(protocol);
      if (!protocolInfo) {
        throw new Error('Protocol not found');
      }

      const position: DeFiPosition = {
        id: `${protocol}-stake-${token}-${Date.now()}`,
        protocol,
        type: 'stake',
        token,
        amount,
        value: parseFloat(amount) * 2000, // Simplified value calculation
        apy: protocolInfo.apy,
        rewards: [],
        network,
        contractAddress: this.getProtocolContract(protocol, network),
        createdAt: Date.now()
      };

      this.positions.set(position.id, position);
      this.savePositions();

      return position;
    } catch (error) {
      throw new Error(`Failed to stake tokens: ${error}`);
    }
  }

  // Get user positions
  getUserPositions(walletAddress: string): DeFiPosition[] {
    return Array.from(this.positions.values()).filter(
      position => position.id.includes(walletAddress)
    );
  }

  // Get positions by protocol
  getPositionsByProtocol(protocol: string): DeFiPosition[] {
    return Array.from(this.positions.values()).filter(
      position => position.protocol === protocol
    );
  }

  // Get positions by network
  getPositionsByNetwork(network: string): DeFiPosition[] {
    return Array.from(this.positions.values()).filter(
      position => position.network === network
    );
  }

  // Get total value locked
  getTotalValueLocked(): number {
    return this.getAllProtocols().reduce((total, protocol) => total + protocol.tvl, 0);
  }

  // Get average APY
  getAverageAPY(): number {
    const protocols = this.getAllProtocols();
    if (protocols.length === 0) return 0;
    
    const totalAPY = protocols.reduce((sum, protocol) => sum + protocol.apy, 0);
    return totalAPY / protocols.length;
  }

  // Get protocol contract address
  private getProtocolContract(protocol: string, network: string): string {
    const contracts: Record<string, Record<string, string>> = {
      'uniswap-v3': {
        ethereum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        polygon: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        arbitrum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        optimism: '0xE592427A0AEce92De3Edee1F18E0157C05861564'
      },
      'aave-v3': {
        ethereum: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD'
      },
      'compound-v3': {
        ethereum: '0xc3d688B66703497DAA19211EEdff47fD253c0Cb1',
        polygon: '0xF25212E676D1F7F89Cd72fFEe66158f541246445'
      }
    };

    return contracts[protocol]?.[network] || '0x0000000000000000000000000000000000000000';
  }

  // Save positions to storage
  private savePositions(): void {
    const positions = Array.from(this.positions.values());
    chrome.storage.local.set({ defiPositions: JSON.stringify(positions) });
  }

  // Load positions from storage
  loadPositions(): void {
    chrome.storage.local.get(['defiPositions'], (result) => {
      if (result.defiPositions) {
        const positions = JSON.parse(result.defiPositions);
        positions.forEach((position: DeFiPosition) => {
          this.positions.set(position.id, position);
        });
      }
    });
  }

  // Get DeFi statistics
  getStatistics(): {
    totalProtocols: number;
    totalTVL: number;
    averageAPY: number;
    totalPositions: number;
    byCategory: Record<string, number>;
  } {
    const protocols = this.getAllProtocols();
    const positions = Array.from(this.positions.values());
    
    const byCategory: Record<string, number> = {};
    protocols.forEach(protocol => {
      byCategory[protocol.category] = (byCategory[protocol.category] || 0) + 1;
    });

    return {
      totalProtocols: protocols.length,
      totalTVL: this.getTotalValueLocked(),
      averageAPY: this.getAverageAPY(),
      totalPositions: positions.length,
      byCategory
    };
  }
}

// Export singleton instance
export const defiManager = new DeFiManager(); 