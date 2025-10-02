import toast from 'react-hot-toast';

export interface ErrorContext {
  operation: string;
  screen?: string;
  userId?: string;
  timestamp?: number;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  context?: ErrorContext;
  originalError?: Error;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', context?: ErrorContext, originalError?: Error) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  API_ERROR: 'API_ERROR',
  
  // Wallet errors
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_LOCKED: 'WALLET_LOCKED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  
  // Transaction errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_NETWORK: 'INVALID_NETWORK',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED'
} as const;

export const ErrorMessages = {
  [ErrorCodes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ErrorCodes.CONNECTION_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.API_ERROR]: 'Service temporarily unavailable. Please try again later.',
  
  [ErrorCodes.WALLET_NOT_FOUND]: 'Wallet not found. Please create or import a wallet.',
  [ErrorCodes.WALLET_LOCKED]: 'Wallet is locked. Please unlock your wallet.',
  [ErrorCodes.INVALID_PASSWORD]: 'Invalid password. Please try again.',
  [ErrorCodes.ACCOUNT_NOT_FOUND]: 'Account not found. Please check your account selection.',
  
  [ErrorCodes.INSUFFICIENT_BALANCE]: 'Insufficient balance for this transaction.',
  [ErrorCodes.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
  [ErrorCodes.GAS_ESTIMATION_FAILED]: 'Unable to estimate gas. Please try again.',
  
  [ErrorCodes.INVALID_ADDRESS]: 'Invalid address format. Please check and try again.',
  [ErrorCodes.INVALID_AMOUNT]: 'Invalid amount. Please enter a valid number.',
  [ErrorCodes.INVALID_NETWORK]: 'Invalid network configuration.',
  
  [ErrorCodes.STORAGE_ERROR]: 'Failed to save data. Please try again.',
  [ErrorCodes.DATA_CORRUPTION]: 'Data corruption detected. Please refresh the app.',
  
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCodes.OPERATION_CANCELLED]: 'Operation was cancelled.'
} as const;

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  context?: ErrorContext;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorDetails[] = [];

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(
    error: Error | AppError | unknown,
    options: ErrorHandlerOptions = {}
  ): AppError {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred',
      context
    } = options;

    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(
        error.message || fallbackMessage,
        ErrorCodes.UNKNOWN_ERROR,
        context,
        error
      );
    } else {
      appError = new AppError(
        fallbackMessage,
        ErrorCodes.UNKNOWN_ERROR,
        context
      );
    }

    // Log error if requested
    if (logError) {
      this.logError(appError);
    }

    // Show toast if requested
    if (showToast) {
      this.showErrorToast(appError);
    }

    return appError;
  }

  private logError(error: AppError): void {
    const errorDetails: ErrorDetails = {
      message: error.message,
      code: error.code,
      context: error.context,
      originalError: error.originalError
    };

    this.errorLog.push(errorDetails);

    // Log to console in development
    if ((import.meta as any).env?.DEV) {
      console.error('App Error:', {
        message: error.message,
        code: error.code,
        context: error.context,
        stack: error.stack,
        originalError: error.originalError
      });
    }

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  private showErrorToast(error: AppError): void {
    const message = ErrorMessages[error.code as keyof typeof ErrorMessages] || error.message;
    toast.error(message);
  }

  public getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  public getLastError(): ErrorDetails | null {
    return this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null;
  }
}

// Convenience functions
export const handleError = (error: Error | AppError | unknown, options?: ErrorHandlerOptions): AppError => {
  return ErrorHandler.getInstance().handleError(error, options);
};

export const createError = (
  message: string,
  code: string = ErrorCodes.UNKNOWN_ERROR,
  context?: ErrorContext
): AppError => {
  return new AppError(message, code, context);
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
};

// Error boundary helper
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  options?: ErrorHandlerOptions
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      handleError(error, options);
      return null;
    }
  };
};
