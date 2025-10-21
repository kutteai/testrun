import { getBrowser } from '../../utils/browser';

export const injectProvider = (providerName: string) => {
  const script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', getBrowser().runtime.getURL(`injected.js?provider=${providerName}`));
  document.head.prepend(script);
};

export const removeProvider = () => {
};
