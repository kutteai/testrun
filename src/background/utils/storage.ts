import { browserAPI } from './browser-api';

// Unified storage API
export const storage = {
  local: {
    get: async (key: string | string[]) => {
      const result = await browserAPI.storage.local.get(key);
      if (Array.isArray(key)) {
        return result;
      }
      return result[key];
    },
    set: async (items: object) => {
      await browserAPI.storage.local.set(items);
    },
    remove: async (key: string) => {
      await browserAPI.storage.local.remove(key);
    },
    clear: async () => {
      await browserAPI.storage.local.clear();
    },
  },
  session: {
    get: async (key: string) => {
      const result = await browserAPI.storage.session.get(key);
      return result[key];
    },
    set: async (items: object) => {
      await browserAPI.storage.session.set(items);
    },
    remove: async (key: string) => {
      await browserAPI.storage.session.remove(key);
    },
    clear: async () => {
      await browserAPI.storage.session.clear();
    },
  },
};
