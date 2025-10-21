import { getBrowser } from '../../utils/browser';

export const browserAPI = (() => {
  if (typeof chrome !== 'undefined') return chrome;
  return getBrowser();
})();
