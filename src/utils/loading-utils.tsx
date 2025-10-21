import React from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export interface LoadingOptions {
  initialData?: any;
  showError?: boolean;
  retryable?: boolean;
  timeout?: number;
}

export class LoadingManager {
  private static instance: LoadingManager;
  private loadingStates: Map<string, LoadingState> = new Map();

  public static getInstance(): LoadingManager {
    if (!LoadingManager.instance) {
      LoadingManager.instance = new LoadingManager();
    }
    return LoadingManager.instance;
  }

  public createLoadingState(
    key: string,
    options: LoadingOptions = {}
  ): LoadingState {
    const { initialData = null } = options;
    
    const state: LoadingState = {
      isLoading: false,
      error: null,
      data: initialData
    };

    this.loadingStates.set(key, state);
    return state;
  }

  public setLoading(key: string, isLoading: boolean): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.isLoading = isLoading;
      if (isLoading) {
        state.error = null;
      }
    }
  }

  public setError(key: string, error: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.error = error;
      state.isLoading = false;
    }
  }

  public setData(key: string, data: any): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.data = data;
      state.isLoading = false;
      state.error = null;
    }
  }

  public getState(key: string): LoadingState | undefined {
    return this.loadingStates.get(key);
  }

  public clearState(key: string): void {
    this.loadingStates.delete(key);
  }
}

// Loading components
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-[#180CB2] ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingSkeleton: React.FC<{ 
  className?: string; 
  lines?: number;
  height?: string;
}> = ({ 
  className = '', 
  lines = 1,
  height = 'h-4'
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded animate-pulse ${height} ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const LoadingCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl p-4 border border-gray-200 ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
};

export const LoadingButton: React.FC<{ 
  isLoading: boolean; 
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ 
  isLoading, 
  children, 
  className = '', 
  disabled = false,
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center justify-center space-x-2 ${className} ${
        disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
};

// Loading hooks
export const useLoadingState = (
  key: string,
  options: LoadingOptions = {}
): [LoadingState, {
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setData: (data: any) => void;
  clearState: () => void;
}] => {
  const manager = LoadingManager.getInstance();
  
  // Create state if it doesn't exist
  if (!manager.getState(key)) {
    manager.createLoadingState(key, options);
  }

  const state = manager.getState(key)!;

  const setLoading = (loading: boolean) => manager.setLoading(key, loading);
  const setError = (error: string) => manager.setError(key, error);
  const setData = (data: any) => manager.setData(key, data);
  const clearState = () => manager.clearState(key);

  return [
    state,
    { setLoading, setError, setData, clearState }
  ];
};

// Async operation wrapper
export const withLoading = async <T,>(
  operation: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  setData: (data: T) => void,
  options: { timeout?: number} = {}
): Promise<T | null> => {
  const { timeout = 30000 } = options;

  try {
    setLoading(true);
    setError('');

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });

    // Race between operation and timeout
    const result = await Promise.race([operation(), timeoutPromise]);
    
    setData(result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    setError(errorMessage);
    return null;
  } finally {
    setLoading(false);
  }
};

// Non-blocking operation wrapper
export const withNonBlockingLoading = async <T,>(
  operation: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  setData: (data: T) => void,
  options: { timeout?: number } = {}
): Promise<void> => {
  // Don't await the operation - let it run in background
  withLoading(operation, setLoading, setError, setData, options).catch(() => {
    // Error handling is done in withLoading
  });
};

// Convenience functions
export const loadingManager = LoadingManager.getInstance();

export const createLoadingState = (key: string, options?: LoadingOptions): LoadingState => {
  return loadingManager.createLoadingState(key, options);
};

export const setLoading = (key: string, isLoading: boolean): void => {
  loadingManager.setLoading(key, isLoading);
};

export const setError = (key: string, error: string): void => {
  loadingManager.setError(key, error);
};

export const setData = (key: string, data: any): void => {
  loadingManager.setData(key, data);
};
