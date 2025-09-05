export class DeFiManager {
    constructor() {
        this.positions = [];
        this.protocols = [];
        this.loadDeFiData();
    }
    // Load DeFi data from storage
    async loadDeFiData() {
        try {
            const result = await chrome.storage.local.get(['defiPositions', 'defiProtocols']);
            if (result.defiPositions) {
                this.positions = result.defiPositions;
            }
            if (result.defiProtocols) {
                this.protocols = result.defiProtocols;
            }
        }
        catch (error) {
            console.error('Error loading DeFi data:', error);
        }
    }
    // Save DeFi data to storage
    async saveDeFiData() {
        try {
            await chrome.storage.local.set({
                defiPositions: this.positions,
                defiProtocols: this.protocols
            });
        }
        catch (error) {
            console.error('Error saving DeFi data:', error);
        }
    }
    // Add DeFi position
    async addPosition(position) {
        const newPosition = {
            ...position,
            id: `defi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        this.positions.push(newPosition);
        await this.saveDeFiData();
    }
    // Remove DeFi position
    async removePosition(positionId) {
        this.positions = this.positions.filter(pos => pos.id !== positionId);
        await this.saveDeFiData();
    }
    // Get all positions
    getAllPositions() {
        return this.positions;
    }
    // Get positions by protocol
    getPositionsByProtocol(protocol) {
        return this.positions.filter(pos => pos.protocol === protocol);
    }
    // Get positions by network
    getPositionsByNetwork(network) {
        return this.positions.filter(pos => pos.network === network);
    }
    // Get positions by type
    getPositionsByType(type) {
        return this.positions.filter(pos => pos.type === type);
    }
    // Get total value locked
    getTotalValueLocked() {
        return this.positions.reduce((total, pos) => total + pos.valueUSD, 0);
    }
    // Get total rewards
    getTotalRewards() {
        return this.positions.reduce((total, pos) => total + pos.rewardsValueUSD, 0);
    }
    // Get average APY
    getAverageAPY() {
        if (this.positions.length === 0)
            return 0;
        const totalAPY = this.positions.reduce((sum, pos) => sum + pos.apy, 0);
        return totalAPY / this.positions.length;
    }
    // Add protocol
    async addProtocol(protocol) {
        const newProtocol = {
            ...protocol,
            id: `protocol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        this.protocols.push(newProtocol);
        await this.saveDeFiData();
    }
    // Get all protocols
    getAllProtocols() {
        return this.protocols;
    }
    // Get protocols by network
    getProtocolsByNetwork(network) {
        return this.protocols.filter(protocol => protocol.network === network);
    }
    // Get protocols by type
    getProtocolsByType(type) {
        return this.protocols.filter(protocol => protocol.type === type);
    }
    // Update position
    async updatePosition(positionId, updates) {
        const position = this.positions.find(pos => pos.id === positionId);
        if (position) {
            Object.assign(position, updates);
            await this.saveDeFiData();
        }
    }
    // Refresh positions
    async refreshPositions() {
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
                            position.valueUSD = position.balance * newPrice;
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
    getDeFiStatistics() {
        const byProtocol = {};
        const byNetwork = {};
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
    searchPositions(query) {
        const lowerQuery = query.toLowerCase();
        return this.positions.filter(pos => pos.protocol.toLowerCase().includes(lowerQuery) ||
            pos.tokenSymbol.toLowerCase().includes(lowerQuery) ||
            pos.network.toLowerCase().includes(lowerQuery));
    }

    // Helper methods for real API calls
    getProtocolAPI(protocol) {
        const protocolAPIs = {
            'aave': 'https://api.aave.com/v3',
            'compound': 'https://api.compound.finance/api/v2',
            'uniswap': 'https://api.uniswap.org/v3',
            'curve': 'https://api.curve.fi/api',
            'yearn': 'https://api.yearn.finance/v1',
            'balancer': 'https://api.balancer.fi/v2'
        };
        return protocolAPIs[protocol] || 'https://api.defi.com';
    }

    getCoinGeckoId(symbol) {
        const coinGeckoMap = {
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
