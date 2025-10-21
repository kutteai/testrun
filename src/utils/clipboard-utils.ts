/**
 * Clipboard utilities for Chrome extension
 * Provides fallback methods for copying text to clipboard
 */

/**
 * Copy text to clipboard with fallback methods
 * @param text - Text to copy to clipboard
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Method 1: Modern Clipboard API (requires clipboardWrite permission)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Clipboard API failed:', error);
  }

  try {
    // Method 2: Fallback using document.execCommand (deprecated but still works)
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('execCommand fallback failed:', error);
  }

  try {
    // Method 3: Chrome extension specific fallback
    if (typeof chrome !== 'undefined' && chrome.extension) {
      // This is a more complex fallback that might work in some contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return true;
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Chrome extension fallback failed:', error);
  }

  return false;
}

/**
 * Copy text to clipboard with user feedback
 * @param text - Text to copy to clipboard
 * @param successMessage - Success message to show
 * @param errorMessage - Error message to show
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboardWithFeedback(
  text: string,
  successMessage: string = 'Copied to clipboard',
  errorMessage: string = 'Failed to copy to clipboard'
): Promise<boolean> {
  const success = await copyToClipboard(text);
  
  if (success) {
    // Show success feedback
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(successMessage);
    } else {
      // Intentionally empty, no toast available
    }
  } else {
    // Show error feedback
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error(errorMessage);
    } else {
      // eslint-disable-next-line no-console
      console.error(errorMessage);
    }
  }
  
  return success;
}

/**
 * Check if clipboard API is available
 * @returns boolean - Whether clipboard API is available
 */
export function isClipboardAPIAvailable(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

/**
 * Check if we're in a Chrome extension context
 * @returns boolean - Whether we're in a Chrome extension
 */
export function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && 
         chrome.runtime && 
         chrome.runtime.id !== undefined;
}
