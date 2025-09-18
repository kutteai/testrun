// Network Navigation Fix - Handles navigation issues during network switching
// Ensures users can always navigate back regardless of network changes

export interface NavigationState {
  currentScreen: string;
  navigationHistory: string[];
  networkAtNavigation: string;
  canGoBack: boolean;
}

export interface NetworkNavigationOptions {
  preserveHistory: boolean;
  allowNetworkSpecificScreens: boolean;
  fallbackScreen: string;
}

export class NetworkNavigationManager {
  private static instance: NetworkNavigationManager;
  private navigationStack: NavigationState[] = [];
  private currentNetwork: string = 'ethereum';
  
  static getInstance(): NetworkNavigationManager {
    if (!NetworkNavigationManager.instance) {
      NetworkNavigationManager.instance = new NetworkNavigationManager();
    }
    return NetworkNavigationManager.instance;
  }

  // Save navigation state before network switch
  saveNavigationState(currentScreen: string, history: string[], network: string): void {
    const state: NavigationState = {
      currentScreen,
      navigationHistory: [...history],
      networkAtNavigation: network,
      canGoBack: history.length > 1
    };
    
    this.navigationStack.push(state);
    this.currentNetwork = network;
    
    console.log('📍 Navigation state saved:', state);
  }

  // Restore navigation state after network switch
  restoreNavigationState(newNetwork: string): NavigationState | null {
    if (this.navigationStack.length === 0) {
      return null;
    }

    const lastState = this.navigationStack[this.navigationStack.length - 1];
    
    // Check if the screen is network-specific
    const networkSpecificScreens = [
      'bitcoin-screen', 'litecoin-screen', 'ethereum-screen', 
      'bsc-screen', 'polygon-screen', 'solana-screen',
      'tron-screen', 'ton-screen', 'xrp-screen'
    ];

    const isNetworkSpecific = networkSpecificScreens.some(screen => 
      lastState.currentScreen.includes(screen.replace('-screen', ''))
    );

    if (isNetworkSpecific && lastState.networkAtNavigation !== newNetwork) {
      // Network-specific screen is no longer valid, navigate to dashboard
      console.log('📍 Network-specific screen invalid after switch, redirecting to dashboard');
      return {
        currentScreen: 'dashboard',
        navigationHistory: ['dashboard'],
        networkAtNavigation: newNetwork,
        canGoBack: false
      };
    }

    // Update network but preserve navigation
    const restoredState: NavigationState = {
      ...lastState,
      networkAtNavigation: newNetwork
    };

    console.log('📍 Navigation state restored:', restoredState);
    return restoredState;
  }

  // Handle navigation during network switch
  handleNetworkSwitchNavigation(
    currentScreen: string,
    navigationHistory: string[],
    oldNetwork: string,
    newNetwork: string,
    options: Partial<NetworkNavigationOptions> = {}
  ): { screen: string; history: string[] } {
    
    const opts: NetworkNavigationOptions = {
      preserveHistory: true,
      allowNetworkSpecificScreens: false,
      fallbackScreen: 'dashboard',
      ...options
    };

    // Save current state
    this.saveNavigationState(currentScreen, navigationHistory, oldNetwork);

    // Check if current screen is network-dependent
    const networkDependentScreens = [
      'send', 'receive', 'swap', 'tokens', 'nfts', 
      'transactions', 'defi', 'buy-sell'
    ];

    const isNetworkDependent = networkDependentScreens.includes(currentScreen);

    if (isNetworkDependent) {
      // For network-dependent screens, preserve the screen but update context
      console.log(`📍 Preserving network-dependent screen: ${currentScreen}`);
      return {
        screen: currentScreen,
        history: opts.preserveHistory ? navigationHistory : [opts.fallbackScreen, currentScreen]
      };
    }

    // For network management screens, handle specially
    const networkManagementScreens = ['networks', 'manage-networks', 'add-custom-network'];
    
    if (networkManagementScreens.includes(currentScreen)) {
      console.log(`📍 In network management screen: ${currentScreen}, preserving navigation`);
      return {
        screen: currentScreen,
        history: navigationHistory
      };
    }

    // For other screens, preserve as-is
    return {
      screen: currentScreen,
      history: navigationHistory
    };
  }

  // Check if user can safely navigate back
  canNavigateBack(currentScreen: string, history: string[]): boolean {
    // Always allow navigation back unless we're at the root
    if (history.length <= 1) {
      return false;
    }

    // Special handling for certain screens
    const alwaysAllowBackScreens = [
      'settings', 'preferences', 'wallet-security', 'networks',
      'manage-networks', 'add-custom-network', 'gas-settings'
    ];

    if (alwaysAllowBackScreens.includes(currentScreen)) {
      return true;
    }

    return history.length > 1;
  }

  // Get safe back navigation target
  getSafeBackTarget(currentScreen: string, history: string[]): string {
    if (history.length <= 1) {
      return 'dashboard';
    }

    const previousScreen = history[history.length - 2];
    
    // Ensure the previous screen is still valid
    const validScreens = [
      'dashboard', 'send', 'receive', 'swap', 'tokens', 'nfts',
      'transactions', 'settings', 'networks', 'manage-networks'
    ];

    if (validScreens.includes(previousScreen)) {
      return previousScreen;
    }

    // Fallback to dashboard if previous screen is invalid
    return 'dashboard';
  }

  // Clear navigation stack (useful for wallet lock/unlock)
  clearNavigationStack(): void {
    this.navigationStack = [];
    console.log('📍 Navigation stack cleared');
  }

  // Get current navigation info for debugging
  getNavigationInfo(): {
    stackSize: number;
    currentNetwork: string;
    lastState: NavigationState | null;
  } {
    return {
      stackSize: this.navigationStack.length,
      currentNetwork: this.currentNetwork,
      lastState: this.navigationStack.length > 0 
        ? this.navigationStack[this.navigationStack.length - 1] 
        : null
    };
  }
}

// Export utilities
export const networkNavigationUtils = {
  // Get navigation manager instance
  getManager: () => NetworkNavigationManager.getInstance(),
  
  // Handle network switch navigation
  handleNetworkSwitch: (
    currentScreen: string,
    history: string[],
    oldNetwork: string,
    newNetwork: string,
    options?: Partial<NetworkNavigationOptions>
  ) => {
    const manager = NetworkNavigationManager.getInstance();
    return manager.handleNetworkSwitchNavigation(currentScreen, history, oldNetwork, newNetwork, options);
  },
  
  // Check if can navigate back
  canGoBack: (currentScreen: string, history: string[]) => {
    const manager = NetworkNavigationManager.getInstance();
    return manager.canNavigateBack(currentScreen, history);
  },
  
  // Get safe back target
  getBackTarget: (currentScreen: string, history: string[]) => {
    const manager = NetworkNavigationManager.getInstance();
    return manager.getSafeBackTarget(currentScreen, history);
  },
  
  // Clear navigation on wallet events
  clearOnWalletLock: () => {
    const manager = NetworkNavigationManager.getInstance();
    manager.clearNavigationStack();
  }
};

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).networkNavigationManager = NetworkNavigationManager.getInstance();
  (window as any).networkNavigationUtils = networkNavigationUtils;
}
