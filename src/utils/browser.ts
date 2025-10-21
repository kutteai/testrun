import browser from 'webextension-polyfill';

export const getBrowser = (): typeof chrome | typeof browser => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  }
  throw new Error('No browser API available');
};

