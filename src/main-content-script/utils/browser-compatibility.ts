import { getBrowser } from '../../utils/browser';

export const getBrowserAPI = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  return getBrowser();
};
