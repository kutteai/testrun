const browserAPI = (() => {
  if (typeof browser !== 'undefined') return browser as typeof chrome;
  if (typeof chrome !== 'undefined') return chrome;
  throw new Error('No browser API available');
})();

export { browserAPI };
