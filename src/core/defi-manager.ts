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
      const result = await chrome.storage.local.get(['defiPositions', 'defiProtocols']);
      if (result.defiPositions) {
        this.positions = result.defiPositions;
      }
      if (result.defiProtocols) {
        this.protocols = result.defiProtocols;
      }
    } catch (error) {
      console.error('Error loading DeFi data:', error);
    }
  }

  // Save DeFi data to storage
  private async saveDeFiData(): Promise<void> {
    try {
      await chrome.storage.local.set({ 
        defiPositions: this.positions,
        defiProtocols: this.protocols
      });
    } catch (error) {
      console.error('Error saving DeFi data:', error);
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
    // In a real implementation, this would fetch updated data from DeFi protocols
    // For now, we'll simulate some updates
    this.positions.forEach(position => {
      // Simulate APY changes
      position.apy += (Math.random() - 0.5) * 2; // ±1% change
      
      // Simulate value changes
      const valueChange = (Math.random() - 0.5) * 0.1; // ±5% change
      position.valueUSD *= (1 + valueChange);
      
      // Update timestamp
      position.timestamp = Date.now();
    });

    await this.saveDeFiData();
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
} 