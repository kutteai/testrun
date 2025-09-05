import type { ScreenId } from '../types/index';

export interface NavigationHistory {
  screen: ScreenId;
  timestamp: number;
  data?: any;
}

export interface NavigationOptions {
  replace?: boolean;
  data?: any;
  preventBack?: boolean;
}

export class NavigationManager {
  private static instance: NavigationManager;
  private history: NavigationHistory[] = [];
  private maxHistorySize = 50;

  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  public navigate(
    screen: ScreenId,
    options: NavigationOptions = {},
    onNavigate: (screen: ScreenId) => void
  ): void {
    const { replace = false, data, preventBack = false } = options;

    // Add to history if not replacing
    if (!replace) {
      this.addToHistory(screen, data);
    }

    // Navigate to screen
    onNavigate(screen);
  }

  public goBack(onNavigate: (screen: ScreenId) => void): boolean {
    if (this.history.length <= 1) {
      // If no history or only one item, go to dashboard
      onNavigate('dashboard');
      return true;
    }

    // Remove current screen from history
    this.history.pop();

    // Get previous screen
    const previousScreen = this.history[this.history.length - 1];
    if (previousScreen) {
      onNavigate(previousScreen.screen);
      return true;
    }

    // Fallback to dashboard
    onNavigate('dashboard');
    return true;
  }

  public canGoBack(): boolean {
    return this.history.length > 1;
  }

  public getCurrentScreen(): ScreenId | null {
    return this.history.length > 0 ? this.history[this.history.length - 1].screen : null;
  }

  public getHistory(): NavigationHistory[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  public addToHistory(screen: ScreenId, data?: any): void {
    const historyItem: NavigationHistory = {
      screen,
      timestamp: Date.now(),
      data
    };

    this.history.push(historyItem);

    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  public replaceHistory(screen: ScreenId, data?: any): void {
    if (this.history.length > 0) {
      this.history[this.history.length - 1] = {
        screen,
        timestamp: Date.now(),
        data
      };
    } else {
      this.addToHistory(screen, data);
    }
  }
}

// Navigation patterns for different screen types
export const NavigationPatterns = {
  // Main navigation screens
  MAIN: ['dashboard', 'accounts', 'tokens', 'transactions', 'nfts'],
  
  // Transaction flow screens
  TRANSACTION: ['send', 'receive', 'swap', 'buy-sell'],
  
  // Settings screens
  SETTINGS: ['settings', 'preferences', 'wallet-security', 'networks', 'notifications'],
  
  // Account management screens
  ACCOUNT_MANAGEMENT: ['accounts', 'account-details', 'add-account', 'wallet-details'],
  
  // Import/export screens
  IMPORT_EXPORT: ['import-wallet', 'import-seed-phrase', 'import-private-key', 'hardware-wallet'],
  
  // Network management screens
  NETWORK_MANAGEMENT: ['networks', 'manage-networks', 'add-custom-network']
} as const;

// Screen hierarchy for breadcrumb navigation
export const ScreenHierarchy: Record<ScreenId, ScreenId[]> = {
  'dashboard': [],
  'accounts': ['dashboard'],
  'account-details': ['dashboard', 'accounts'],
  'add-account': ['dashboard', 'accounts'],
  'wallet-details': ['dashboard', 'accounts'],
  'send': ['dashboard'],
  'receive': ['dashboard'],
  'swap': ['dashboard'],
  'buy-sell': ['dashboard'],
  'tokens': ['dashboard'],
  'transactions': ['dashboard'],
  'nfts': ['dashboard'],
  'settings': ['dashboard'],
  'preferences': ['dashboard', 'settings'],
  'wallet-security': ['dashboard', 'settings'],
  'networks': ['dashboard', 'settings'],
  'manage-networks': ['dashboard', 'settings', 'networks'],
  'add-custom-network': ['dashboard', 'settings', 'networks', 'manage-networks'],
  'notifications': ['dashboard'],
  'notification-settings': ['dashboard', 'notifications'],
  'enable-notifications': ['dashboard', 'notifications'],
  'options': ['dashboard'],
  'more': ['dashboard'],
  'about': ['dashboard'],
  'import-wallet': ['dashboard'],
  'import-seed-phrase': ['dashboard', 'import-wallet'],
  'import-private-key': ['dashboard', 'import-wallet'],
  'hardware-wallet': ['dashboard', 'import-wallet'],
  'create-wallet': ['dashboard'],
  'create-password': ['dashboard', 'create-wallet'],
  'verify-seed': ['dashboard', 'create-wallet', 'create-password'],
  'recovery-phrase': ['dashboard'],
  'verify-phrase': ['dashboard', 'recovery-phrase'],
  'security': ['dashboard'],
  'gas-settings': ['dashboard'],
  'manage-crypto': ['dashboard'],
  'address-book': ['dashboard'],
  'wallet-connect': ['dashboard'],
  'expand-view': ['dashboard'],
  'loading': [],
  'error': []
};

// Get breadcrumb path for a screen
export const getBreadcrumbPath = (screen: ScreenId): ScreenId[] => {
  return ScreenHierarchy[screen] || [];
};

// Check if screen is a modal/overlay
export const isModalScreen = (screen: ScreenId): boolean => {
  const modalScreens: ScreenId[] = [
    'options',
    'account-details',
    'settings',
    'preferences',
    'wallet-security',
    'more',
    'networks',
    'manage-networks',
    'add-custom-network',
    'notification-settings',
    'enable-notifications',
    'gas-settings',
    'manage-crypto',
    'address-book',
    'wallet-connect',
    'expand-view'
  ];
  return modalScreens.includes(screen);
};

// Check if screen should have a back button
export const shouldShowBackButton = (screen: ScreenId): boolean => {
  const noBackButtonScreens: ScreenId[] = [
    'dashboard',
    'loading',
    'error'
  ];
  return !noBackButtonScreens.includes(screen);
};

// Get default back navigation target
export const getDefaultBackTarget = (screen: ScreenId): ScreenId => {
  const hierarchy = ScreenHierarchy[screen];
  if (hierarchy && hierarchy.length > 0) {
    return hierarchy[hierarchy.length - 1];
  }
  return 'dashboard';
};

// Convenience functions
export const navigationManager = NavigationManager.getInstance();

export const navigateWithHistory = (
  screen: ScreenId,
  onNavigate: (screen: ScreenId) => void,
  options?: NavigationOptions
): void => {
  navigationManager.navigate(screen, options, onNavigate);
};

export const goBackWithHistory = (onNavigate: (screen: ScreenId) => void): boolean => {
  return navigationManager.goBack(onNavigate);
};

export const canGoBack = (): boolean => {
  return navigationManager.canGoBack();
};
