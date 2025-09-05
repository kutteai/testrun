import { storage } from '../utils/storage-utils';

export interface DeFiPosition {
  id: string;
  protocol: string;
  type: 'liquidity' | 'staking' | 'lending' | 'yield';
  network: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  valueUSD: number;
  apy: number;
  rewards: string;
  rewardsValueUSD: number;
  timestamp: number;
}

export interface DeFiProtocol {
  id: string;
  name: string;
  network: string;
  type: 'dex' | 'lending' | 'yield' | 'staking';
  tvl: number;
  apy: number;
  isActive: boolean;
}

export class DeFiManager {
  private positions: DeFiPosition[] = [];
  private protocols: DeFiProtocol[] = [];

  constructor() {
    this.loadDeFiData();
  }

  // Load DeFi data from storage
  private async loadDeFiData(): Promise<void> {
    try {
      const result = await storage.get(['defiPositions', 'defiProtocols']);
      if (result.defiPositions) {
        this.positions = result.defiPositions;
      }
      if (result.defiProtocols) {
        this.protocols = result.defiProtocols;
      }
    } catch (error) {
      console.error('Failed to load DeFi data:', error);
    }
  }

  // Save DeFi data to storage
  private async saveDeFiData(): Promise<void> {
    try {
      await storage.set({
        defiPositions: this.positions,
        defiProtocols: this.protocols
      });
    } catch (error) {
      console.error('Failed to save DeFi data:', error);
    }
  }

  // Add DeFi position
  async addPosition(position: Omit<DeFiPosition, 'id'>): Promise<void> {
    const newPosition: DeFiPosition = {
      ...position,
      id: `defi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.positions.push(newPosition);
    await this.saveDeFiData();
  }

  // Remove DeFi position
  async removePosition(positionId: string): Promise<void> {
    this.positions = this.positions.filter(pos => pos.id !== positionId);
    await this.saveDeFiData();
  }

  // Get all positions
  getAllPositions(): DeFiPosition[] {
    return this.positions;
  }

  // Get positions by protocol
  getPositionsByProtocol(protocol: string): DeFiPosition[] {
    return this.positions.filter(pos => pos.protocol === protocol);
  }

  // Get positions by network
  getPositionsByNetwork(network: string): DeFiPosition[] {
    return this.positions.filter(pos => pos.network === network);
  }

  // Get positions by type
  getPositionsByType(type: DeFiPosition['type']): DeFiPosition[] {
    return this.positions.filter(pos => pos.type === type);
  }

  // Get total value locked
  getTotalValueLocked(): number {
    return this.positions.reduce((total, pos) => total + pos.valueUSD, 0);
  }

  // Get total rewards
  getTotalRewards(): number {
    return this.positions.reduce((total, pos) => total + pos.rewardsValueUSD, 0);
  }

  // Get average APY
  getAverageAPY(): number {
    if (this.positions.length === 0) return 0;
    const totalAPY = this.positions.reduce((sum, pos) => sum + pos.apy, 0);
    return totalAPY / this.positions.length;
  }

  // Add protocol
  async addProtocol(protocol: Omit<DeFiProtocol, 'id'>): Promise<void> {
    const newProtocol: DeFiProtocol = {
      ...protocol,
      id: `protocol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.protocols.push(newProtocol);
    await this.saveDeFiData();
  }

  // Get all protocols
  getAllProtocols(): DeFiProtocol[] {
    return this.protocols;
  }

  // Get protocols by network
  getProtocolsByNetwork(network: string): DeFiProtocol[] {
    return this.protocols.filter(protocol => protocol.network === network);
  }

  // Get protocols by type
  getProtocolsByType(type: DeFiProtocol['type']): DeFiProtocol[] {
    return this.protocols.filter(protocol => protocol.type === type);
  }

  // Update position
  async updatePosition(positionId: string, updates: Partial<DeFiPosition>): Promise<void> {
    const position = this.positions.find(pos => pos.id === positionId);
    if (position) {
      Object.assign(position, updates);
      await this.saveDeFiData();
    }
  }

  // Refresh positions
  async refreshPositions(): Promise<void> {
    try {
      // Real DeFi protocol API calls
      for (const position of this.positions) {
        try {
          // Get updated APY from protocol
          const apyResponse = await fetch(`${this.getProtocolAPI(position.protocol)}/apy/${position.tokenAddress}`);
          if (apyResponse.ok) {
            const apyData = await apyResponse.json();
            position.apy = apyData.apy || position.apy;
          }
          
          // Get updated token price
          const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${this.getCoinGeckoId(position.tokenSymbol)}&vs_currencies=usd`);
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            const newPrice = priceData[this.getCoinGeckoId(position.tokenSymbol)]?.usd;
            if (newPrice) {
              position.valueUSD = parseFloat(position.amount) * newPrice;
            }
          }
          
          // Get updated rewards
          const rewardsResponse = await fetch(`${this.getProtocolAPI(position.protocol)}/rewards/${position.id}`);
          if (rewardsResponse.ok) {
            const rewardsData = await rewardsResponse.json();
            position.rewards = rewardsData.rewards || position.rewards;
          }
          
          position.timestamp = Date.now();
        } catch (error) {
          console.warn(`Failed to update position ${position.id}:`, error);
        }
      }
      
      await this.saveDeFiData();
    } catch (error) {
      console.error('Failed to refresh DeFi positions:', error);
    }
  }

  // Get DeFi statistics
  getDeFiStatistics(): {
    totalPositions: number;
    totalValue: number;
    totalRewards: number;
    averageAPY: number;
    byProtocol: Record<string, number>;
    byNetwork: Record<string, number>;
  } {
    const byProtocol: Record<string, number> = {};
    const byNetwork: Record<string, number> = {};

    this.positions.forEach(position => {
      byProtocol[position.protocol] = (byProtocol[position.protocol] || 0) + position.valueUSD;
      byNetwork[position.network] = (byNetwork[position.network] || 0) + position.valueUSD;
    });

    return {
      totalPositions: this.positions.length,
      totalValue: this.getTotalValueLocked(),
      totalRewards: this.getTotalRewards(),
      averageAPY: this.getAverageAPY(),
      byProtocol,
      byNetwork
    };
  }

  // Search positions
  searchPositions(query: string): DeFiPosition[] {
    const lowerQuery = query.toLowerCase();
    return this.positions.filter(pos => 
      pos.protocol.toLowerCase().includes(lowerQuery) ||
      pos.tokenSymbol.toLowerCase().includes(lowerQuery) ||
      pos.network.toLowerCase().includes(lowerQuery)
    );
  }

  // Helper methods for real API calls
  private getProtocolAPI(protocol: string): string {
    const protocolAPIs: { [key: string]: string } = {
      'aave': 'https://api.aave.com/v3',
      'compound': 'https://api.compound.finance/api/v2',
      'uniswap': 'https://api.uniswap.org/v3',
      'curve': 'https://api.curve.fi/api',
      'yearn': 'https://api.yearn.finance/v1',
      'balancer': 'https://api.balancer.fi/v2'
    };
    return protocolAPIs[protocol] || 'https://api.defi.com';
  }

  private getCoinGeckoId(symbol: string): string {
    const coinGeckoMap: { [key: string]: string } = {
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'DAI': 'dai',
      'WETH': 'weth',
      'WBTC': 'wrapped-bitcoin',
      'UNI': 'uniswap',
      'LINK': 'chainlink',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'CRV': 'curve-dao-token'
    };
    return coinGeckoMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }
} 