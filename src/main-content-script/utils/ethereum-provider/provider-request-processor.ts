import { PaycioEthereumProvider } from '../ethereum-provider';

export class ProviderRequestProcessor {
  private provider: PaycioEthereumProvider;

  constructor(provider: PaycioEthereumProvider) {
    this.provider = provider;
  }

  async processRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.provider._requestQueue.push({
        method,
        params,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.processRequestQueue();
    });
  }

  async processRequestQueue() {
    if (this.provider._processing || this.provider._requestQueue.length === 0) {
      return;
    }

    this.provider._processing = true;

    try {
      while (this.provider._requestQueue.length > 0) {
        const request = this.provider._requestQueue.shift();

        try {
          const result = await this.provider.handleRequest(request.method, request.params);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      this.provider._processing = false;
    }
  }
}

