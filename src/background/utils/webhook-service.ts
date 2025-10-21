import { storage } from './storage';
import { browserAPI } from './browser-api';

interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: number;
  lastTriggered?: number;
  isActive: boolean;
}

class WebhookService {
  private static webhooks: WebhookRegistration[] = [];
  private static webhookIdCounter = 0;

  static async init() {
    const storedWebhooks = await storage.local.get(['webhooks']);
    if (storedWebhooks.webhooks) {
      this.webhooks = JSON.parse(storedWebhooks.webhooks);
      // Find max ID to ensure uniqueness
      const maxId = this.webhooks.reduce((max, hook) => Math.max(max, parseInt(hook.id.split('_')[1], 10)), 0);
      this.webhookIdCounter = maxId + 1;
    }
  }

  static async registerWebhook(url: string, events: string[]): Promise<WebhookRegistration> {
    if (!url || !events || events.length === 0) {
      throw new Error('URL and events are required for webhook registration');
    }

    const newWebhook: WebhookRegistration = {
      id: `webhook_${this.webhookIdCounter++}`,
      url,
      events,
      createdAt: Date.now(),
      isActive: true,
    };

    this.webhooks.push(newWebhook);
    await this.saveWebhooks();
    return newWebhook;
  }

  static async unregisterWebhook(id: string): Promise<boolean> {
    const initialLength = this.webhooks.length;
    this.webhooks = this.webhooks.filter((hook) => hook.id !== id);
    if (this.webhooks.length < initialLength) {
      await this.saveWebhooks();
      return true;
    }
    return false;
  }

  static getWebhooks(): WebhookRegistration[] {
    return this.webhooks;
  }

  static async triggerWebhooks(event: string, data: any) {
    for (const webhook of this.webhooks) {
      if (webhook.isActive && webhook.events.includes(event)) {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, data, timestamp: Date.now() }),
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });
          webhook.lastTriggered = Date.now();
          await this.saveWebhooks();
        } catch (__error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Failed to trigger webhook ${webhook.id}:`, __error);
        }
      }
    }
  }

  private static async saveWebhooks() {
    await storage.local.set({ webhooks: JSON.stringify(this.webhooks) });
  }
}

// Initialize webhook service
WebhookService.init();

// Example of triggering a webhook on account change
browserAPI.runtime.onMessage.addListener((message) => {
  if (message.type === 'PAYCIO_ACCOUNTS_CHANGED') {
    WebhookService.triggerWebhooks('accounts_changed', { accounts: message.accounts });
  }
});

export default WebhookService;
