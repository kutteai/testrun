// Complete enhanced content script with all advanced features
console.log('Paycio main content script loaded');

// Cross-browser compatibility
const browserAPI = (() => {
  if (typeof browser !== 'undefined') return browser;
  if (typeof chrome !== 'undefined') return chrome;
  throw new Error('No browser API available');
})();

// Only inject if not already injected
if (!(window as any).paycioInjected) {
  (window as any).paycioInjected = true;

  // Create script element to inject provider
  const script = document.createElement('script');
  
  // Complete provider script with all advanced features
  script.textContent = `
    (function() {
      'use strict';
      
      if (window.paycioProviderInjected) {
        return;
      }
      window.paycioProviderInjected = true;

      console.log('Paycio: Injecting advanced wallet providers with all features');

      // Advanced Toast Notification System
      class ToastManager {
        constructor() {
          this.toasts = new Set();
          this.container = null;
          this.createContainer();
        }

        createContainer() {
          this.container = document.createElement('div');
          this.container.id = 'paycio-toast-container';
          this.container.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          \`;
          document.body.appendChild(this.container);
        }

        show(message, type = 'info', duration = 4000) {
          const toast = document.createElement('div');
          const toastId = Math.random().toString(36).substring(2);
          
          toast.style.cssText = \`
            background: \${this.getToastColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 8px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            cursor: pointer;
          \`;
          
          toast.innerHTML = \`
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1;">\${this.escapeHtml(message)}</div>
              <div style="opacity: 0.7; font-size: 18px; line-height: 1;">&times;</div>
            </div>
          \`;
          
          this.container.appendChild(toast);
          this.toasts.add(toast);
          
          // Animate in
          requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
          });
          
          // Click to dismiss
          toast.addEventListener('click', () => this.dismiss(toast));
          
          // Auto dismiss
          if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
          }
          
          return toast;
        }

        dismiss(toast) {
          if (!this.toasts.has(toast)) return;
          
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toast);
          }, 300);
        }

        getToastColor(type) {
          switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#3b82f6';
            default: return '#6b7280';
          }
        }

        escapeHtml(text) {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        destroy() {
          this.toasts.clear();
          if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
          }
        }
      }

      // Initialize toast manager
      const toast = new ToastManager();
      window.paycioToast = toast;

      // Advanced Modal System
      class ModalManager {
  constructor() {
          this.modals = new Set();
        }

        createModal(config) {
          const modal = document.createElement('div');
          modal.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483646;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.2s ease;
          \`;

          const content = document.createElement('div');
          content.style.cssText = \`
            background: white;
            border-radius: 16px;
            max-width: \${config.maxWidth || '500px'};
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            transform: scale(0.9) translateY(20px);
            transition: transform 0.2s ease;
          \`;

          content.innerHTML = config.content;
          modal.appendChild(content);
          
          this.modals.add(modal);
          document.body.appendChild(modal);

          // Animate in
          requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1) translateY(0)';
          });

          // Close on backdrop click
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              this.closeModal(modal);
            }
          });

          return modal;
        }

        closeModal(modal) {
          if (!this.modals.has(modal)) return;

          modal.style.opacity = '0';
          modal.firstChild.style.transform = 'scale(0.9) translateY(20px)';

          setTimeout(() => {
            if (modal.parentNode) {
              modal.parentNode.removeChild(modal);
            }
            this.modals.delete(modal);
          }, 200);
        }

        destroy() {
          this.modals.forEach(modal => this.closeModal(modal));
        }
      }

      const modalManager = new ModalManager();

      // WalletConnect Integration Support
      class WalletConnectManager {
        constructor() {
          this.sessions = new Map();
          this.connectedDapps = new Set();
        }

        async handleWalletConnectUri(uri) {
          try {
            toast.show('Processing WalletConnect request...', 'info');
            
            const response = await window.paycioProvider.sendToContentScript('WALLETCONNECT_HANDLE_URI', { uri });
            
            if (response && response.success) {
              this.sessions.set(response.data.sessionId, response.data.session);
              toast.show('WalletConnect session established', 'success');
              return response.data;
            }
            
            throw new Error(response?.error || 'WalletConnect connection failed');
    } catch (error) {
            toast.show(\`WalletConnect error: \${error.message}\`, 'error');
            throw error;
          }
        }

        async approveSession(sessionId, accounts, chainId) {
          const response = await window.paycioProvider.sendToContentScript('WALLETCONNECT_APPROVE_SESSION', {
            sessionId,
            accounts,
            chainId
          });
          
          if (response && response.success) {
            toast.show('WalletConnect session approved', 'success');
            this.connectedDapps.add(sessionId);
          }
          
          return response;
        }

        async rejectSession(sessionId) {
          const response = await window.paycioProvider.sendToContentScript('WALLETCONNECT_REJECT_SESSION', { sessionId });
          
          if (response && response.success) {
            this.sessions.delete(sessionId);
            toast.show('WalletConnect session rejected', 'info');
          }
          
          return response;
        }

        async disconnectSession(sessionId) {
          const response = await window.paycioProvider.sendToContentScript('WALLETCONNECT_DISCONNECT', { sessionId });
          
          if (response && response.success) {
            this.sessions.delete(sessionId);
            this.connectedDapps.delete(sessionId);
            toast.show('WalletConnect session disconnected', 'info');
          }
          
          return response;
        }
      }

      const walletConnect = new WalletConnectManager();

      // Enhanced Event Emitter with advanced features
      class EventEmitter {
        constructor() {
          this._events = {};
          this._maxListeners = 10;
          this._captureRejections = true;
        }

        setMaxListeners(n) {
          this._maxListeners = n;
          return this;
        }

        getMaxListeners() {
          return this._maxListeners;
        }

        on(event, listener) {
          if (!this._events[event]) {
            this._events[event] = [];
          }
          
          if (this._events[event].length >= this._maxListeners) {
            console.warn(\`MaxListenersExceededWarning: Possible EventEmitter memory leak detected.\`);
          }
          
          this._events[event].push(listener);
          return this;
        }

        addListener(event, listener) {
          return this.on(event, listener);
        }

        once(event, listener) {
          const onceWrapper = (...args) => {
            this.removeListener(event, onceWrapper);
            listener.apply(this, args);
          };
          onceWrapper.listener = listener;
          return this.on(event, onceWrapper);
        }

        prependListener(event, listener) {
          if (!this._events[event]) {
            this._events[event] = [];
          }
          this._events[event].unshift(listener);
          return this;
        }

        prependOnceListener(event, listener) {
          const onceWrapper = (...args) => {
            this.removeListener(event, onceWrapper);
            listener.apply(this, args);
          };
          onceWrapper.listener = listener;
          return this.prependListener(event, onceWrapper);
        }

        removeListener(event, listener) {
          if (!this._events[event]) return this;
          
          const index = this._events[event].findIndex(l => l === listener || l.listener === listener);
          if (index > -1) {
            this._events[event].splice(index, 1);
          }
          
          if (this._events[event].length === 0) {
            delete this._events[event];
          }
          
          return this;
        }

        off(event, listener) {
          return this.removeListener(event, listener);
        }

        removeAllListeners(event) {
          if (event) {
            delete this._events[event];
          } else {
            this._events = {};
          }
          return this;
        }

        listeners(event) {
          return this._events[event] ? [...this._events[event]] : [];
        }

        rawListeners(event) {
          return this.listeners(event);
        }

        listenerCount(event) {
          return this._events[event] ? this._events[event].length : 0;
        }

        eventNames() {
          return Object.keys(this._events);
        }

        emit(event, ...args) {
          if (!this._events[event]) return false;
          
          const listeners = [...this._events[event]];
          
          for (const listener of listeners) {
            try {
              listener.apply(this, args);
      } catch (error) {
              if (this._captureRejections && event !== 'error') {
                this.emit('error', error);
              } else {
                console.error('Error in event listener:', error);
              }
            }
          }
          
          return listeners.length > 0;
        }
      }

      // Advanced Connection Manager
      class ConnectionManager {
        constructor() {
          this.connections = new Map();
          this.permissions = new Map();
          this.lastActivity = Date.now();
        }

        async requestConnection(origin, methods = ['eth_accounts']) {
          const existing = this.connections.get(origin);
          if (existing && existing.approved) {
            return existing;
          }

          return new Promise((resolve, reject) => {
            const modal = modalManager.createModal({
              content: \`
                <div style="padding: 24px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMiIvPgo8L3N2Zz4=" 
                         style="width: 64px; height: 64px; border-radius: 16px;">
                  </div>
                  <h3 style="text-align: center; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                    Connect to Paycio Wallet
                  </h3>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">\${origin}</div>
                    <div style="color: #64748b; font-size: 14px;">wants to connect to your wallet</div>
                  </div>
                  <div style="margin-bottom: 20px;">
                    <div style="font-weight: 500; margin-bottom: 8px;">This will allow the app to:</div>
                    <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                      <li>View your wallet address</li>
                      <li>Request approval for transactions</li>
                      <li>View your account balance</li>
                    </ul>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <button id="reject-btn" style="
                      flex: 1;
                      padding: 12px 20px;
                      border: 1px solid #e2e8f0;
                      background: white;
                      color: #475569;
                      border-radius: 8px;
                      font-weight: 500;
                      cursor: pointer;
                    ">Reject</button>
                    <button id="connect-btn" style="
                      flex: 1;
                      padding: 12px 20px;
                      border: none;
                      background: #180CB2;
                      color: white;
                      border-radius: 8px;
                      font-weight: 500;
                      cursor: pointer;
                    ">Connect</button>
                  </div>
                </div>
              \`
            });

            const connectBtn = modal.querySelector('#connect-btn');
            const rejectBtn = modal.querySelector('#reject-btn');

            connectBtn.onclick = async () => {
              try {
                const connection = {
                  origin,
                  approved: true,
                  methods,
                  connectedAt: Date.now(),
                  permissions: ['eth_accounts']
                };

                this.connections.set(origin, connection);
                this.permissions.set(origin, methods);
                
                modalManager.closeModal(modal);
                toast.show(\`Connected to \${origin}\`, 'success');
                resolve(connection);
              } catch (error) {
                reject(error);
              }
            };

            rejectBtn.onclick = () => {
              modalManager.closeModal(modal);
              toast.show('Connection request rejected', 'info');
              reject(new Error('User rejected the request'));
            };
          });
        }

        isConnected(origin) {
          const connection = this.connections.get(origin);
          return connection && connection.approved;
        }

        disconnect(origin) {
          this.connections.delete(origin);
          this.permissions.delete(origin);
          toast.show(\`Disconnected from \${origin}\`, 'info');
        }

        hasPermission(origin, method) {
          const permissions = this.permissions.get(origin);
          return permissions && permissions.includes(method);
        }
      }

      const connectionManager = new ConnectionManager();

      // Advanced Paycio Ethereum Provider with all features
      class PaycioEthereumProvider extends EventEmitter {
        constructor() {
          super();
          
          // Provider identification
          this.isPaycio = true;
          this.isMetaMask = false;
          this.isCoinbaseWallet = false;
          this.isTrust = false;
          this.isWalletConnect = false;
          
          // Network state
          this.chainId = '0x1';
          this.selectedAddress = null;
          this.networkVersion = '1';
          
          // Connection state
          this._isConnected = false;
          this._accounts = [];
          this._initialized = false;
          this._connecting = false;
          
          // Request tracking
          this._requestId = 0;
          this._pendingRequests = new Map();
          this._requestQueue = [];
          this._processing = false;
          
          // Advanced features
          this._subscriptions = new Map();
          this._filters = new Map();
          
          this.initialize();
        }

        async initialize() {
          if (this._initialized) return;
          
          try {
            const response = await this.sendToContentScript('GET_PROVIDER_STATE');
            if (response && response.success) {
              this._isConnected = response.data?.isConnected || false;
              this._accounts = response.data?.accounts || [];
              this.selectedAddress = response.data?.selectedAddress || null;
              this.chainId = response.data?.chainId || '0x1';
              this.networkVersion = response.data?.networkVersion || '1';
            }
          } catch (error) {
            console.warn('Failed to initialize provider state:', error);
          }

          this.setupEventListeners();
          this.setupAdvancedFeatures();
          this._initialized = true;
          
          this.emit('_initialized');
          toast.show('Paycio Wallet provider ready', 'success', 2000);
        }

        setupEventListeners() {
          window.addEventListener('message', (event) => {
            if (event.source !== window || !event.data.type?.startsWith('PAYCIO_')) {
              return;
            }

            this.handleProviderEvent(event.data);
          });

          // Listen for page visibility changes
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              this.emit('page_visible');
            }
          });
        }

        setupAdvancedFeatures() {
          // Auto-refresh on network change
          this.on('chainChanged', (chainId) => {
            this.networkVersion = parseInt(chainId, 16).toString();
            toast.show(\`Network changed to \${this.getNetworkName(chainId)}\`, 'info');
          });

          // Connection status monitoring
          this.on('connect', () => {
            toast.show('Wallet connected', 'success');
          });

          this.on('disconnect', () => {
            toast.show('Wallet disconnected', 'warning');
          });

          // Account change notifications
          this.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
              toast.show('All accounts disconnected', 'warning');
            } else if (accounts[0] !== this.selectedAddress) {
              toast.show(\`Switched to account \${accounts[0].slice(0, 6)}...\${accounts[0].slice(-4)}\`, 'info');
            }
          });
        }

        getNetworkName(chainId) {
          const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x38': 'BNB Smart Chain',
            '0x89': 'Polygon',
            '0xa86a': 'Avalanche',
            '0xa4b1': 'Arbitrum One',
            '0xa': 'Optimism',
            '0xfa': 'Fantom',
            '0x19': 'Cronos'
          };
          return networks[chainId] || \`Chain \${chainId}\`;
        }

        handleProviderEvent(eventData) {
          const { type, data } = eventData;

          switch (type) {
        case 'PAYCIO_ACCOUNTS_CHANGED':
              const oldAccounts = [...this._accounts];
              this._accounts = data.accounts || [];
              this.selectedAddress = data.accounts?.[0] || null;
              
              if (JSON.stringify(oldAccounts) !== JSON.stringify(this._accounts)) {
                this.emit('accountsChanged', [...this._accounts]);
              }
          break;

        case 'PAYCIO_CHAIN_CHANGED':
              const oldChainId = this.chainId;
              this.chainId = data.chainId;
              this.networkVersion = data.networkVersion;
              
              if (oldChainId !== this.chainId) {
                this.emit('chainChanged', this.chainId);
                this.emit('networkChanged', this.networkVersion);
              }
          break;

            case 'PAYCIO_CONNECT':
              const wasConnected = this._isConnected;
              this._isConnected = true;
              this._accounts = data.accounts || [];
              this.selectedAddress = data.accounts?.[0] || null;
              
              if (!wasConnected) {
                this.emit('connect', { chainId: this.chainId });
          }
          break;

            case 'PAYCIO_DISCONNECT':
              if (this._isConnected) {
                this._isConnected = false;
                this._accounts = [];
                this.selectedAddress = null;
                this.emit('disconnect', { code: 4900, message: 'User disconnected' });
              }
              break;

            case 'PAYCIO_MESSAGE':
              this.emit('message', data);
              break;

            case 'PAYCIO_NOTIFICATION':
              if (data.type && data.message) {
                toast.show(data.message, data.type);
              }
              break;
          }
        }

        isConnected() {
          return this._isConnected;
        }

        async request(args) {
          if (!args || typeof args !== 'object') {
            throw this.createProviderError(4001, 'Invalid request arguments');
          }

          const { method, params } = args;

          if (!method || typeof method !== 'string') {
            throw this.createProviderError(4001, 'Method must be a non-empty string');
          }

          // Add request to queue for processing
          return this.processRequest(method, params);
        }

        async processRequest(method, params) {
    return new Promise((resolve, reject) => {
            this._requestQueue.push({
              method,
              params,
              resolve,
              reject,
              timestamp: Date.now()
            });

            this.processRequestQueue();
          });
        }

        async processRequestQueue() {
          if (this._processing || this._requestQueue.length === 0) {
            return;
          }

          this._processing = true;

          try {
            while (this._requestQueue.length > 0) {
              const request = this._requestQueue.shift();
              
              try {
                const result = await this.handleRequest(request.method, request.params);
                request.resolve(result);
              } catch (error) {
                request.reject(error);
              }
            }
          } finally {
            this._processing = false;
          }
        }

        async handleRequest(method, params) {
          console.log(\`Paycio provider request: \${method}\`, params);

          try {
            switch (method) {
              // Account methods
              case 'eth_requestAccounts':
                return await this.requestAccounts();

              case 'eth_accounts':
                return [...this._accounts];

              // Network methods
              case 'eth_chainId':
                return this.chainId;

              case 'net_version':
                return this.networkVersion;

              case 'web3_clientVersion':
                return 'Paycio/1.0.0';

              // Transaction methods
              case 'eth_sendTransaction':
                return await this.sendTransaction(params);

              case 'eth_signTransaction':
                return await this.signTransaction(params);

              case 'eth_sendRawTransaction':
                return await this.sendRawTransaction(params);

              // Signing methods
              case 'personal_sign':
                return await this.personalSign(params);

              case 'eth_sign':
                return await this.ethSign(params);

              case 'eth_signTypedData':
              case 'eth_signTypedData_v1':
              case 'eth_signTypedData_v3':
              case 'eth_signTypedData_v4':
                return await this.signTypedData(method, params);

              // Wallet methods
              case 'wallet_switchEthereumChain':
                return await this.switchChain(params);

              case 'wallet_addEthereumChain':
                return await this.addChain(params);

              case 'wallet_watchAsset':
                return await this.watchAsset(params);

              case 'wallet_requestPermissions':
                return await this.requestPermissions(params);

              case 'wallet_getPermissions':
                return await this.getPermissions();

              // Subscription methods
              case 'eth_subscribe':
                return await this.subscribe(params);

              case 'eth_unsubscribe':
                return await this.unsubscribe(params);

              // Filter methods
              case 'eth_newFilter':
                return await this.newFilter(params);

              case 'eth_newBlockFilter':
                return await this.newBlockFilter();

              case 'eth_newPendingTransactionFilter':
                return await this.newPendingTransactionFilter();

              case 'eth_getFilterChanges':
                return await this.getFilterChanges(params);

              case 'eth_getFilterLogs':
                return await this.getFilterLogs(params);

              case 'eth_uninstallFilter':
                return await this.uninstallFilter(params);

              // RPC proxy methods
              case 'eth_getBalance':
              case 'eth_getTransactionCount':
              case 'eth_getCode':
              case 'eth_getStorageAt':
              case 'eth_gasPrice':
              case 'eth_estimateGas':
              case 'eth_feeHistory':
              case 'eth_maxPriorityFeePerGas':
              case 'eth_blockNumber':
              case 'eth_getBlockByNumber':
              case 'eth_getBlockByHash':
              case 'eth_getTransactionByHash':
              case 'eth_getTransactionReceipt':
              case 'eth_call':
              case 'eth_getLogs':
              case 'eth_getProof':
                return await this.proxyRpcCall(method, params);

              default:
                return await this.proxyRpcCall(method, params);
            }
          } catch (error) {
            console.error(\`Error processing \${method}:\`, error);
            if (error.code) {
              throw error;
            }
            throw this.createProviderError(4001, error.message || 'Request failed');
          }
        }

        async requestAccounts() {
          if (this._connecting) {
            throw this.createProviderError(4001, 'Connection already in progress');
          }

          try {
            this._connecting = true;
            
            // Check if already connected to this origin
            const origin = window.location.origin;
            if (!connectionManager.isConnected(origin)) {
              await connectionManager.requestConnection(origin, ['eth_accounts']);
            }
            
            const response = await this.sendToContentScript('ETH_REQUEST_ACCOUNTS');
            
            if (response && response.success) {
              this._accounts = response.data || [];
              this.selectedAddress = this._accounts[0] || null;
              this._isConnected = this._accounts.length > 0;
              
              if (this._isConnected) {
                this.emit('connect', { chainId: this.chainId });
                this.emit('accountsChanged', [...this._accounts]);
              }
              
              return [...this._accounts];
            }
            
            if (response && response.error) {
              if (response.error === 'WALLET_UNLOCK_REQUIRED') {
                throw this.createProviderError(4100, 'Wallet is locked. Please unlock your Paycio wallet.');
              }
              throw this.createProviderError(4001, response.error);
            }
            
            throw this.createProviderError(4001, 'Failed to connect accounts');
            
          } finally {
            this._connecting = false;
          }
        }

        async sendTransaction(params) {
          if (!this._isConnected) {
            throw this.createProviderError(4100, 'Unauthorized - no accounts connected');
          }

          if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid transaction parameters');
          }

          const txParams = params[0];
          
          // Show transaction confirmation
          toast.show('Transaction confirmation required', 'info');

          const response = await this.sendToContentScript('ETH_SEND_TRANSACTION', { params });
          
          if (response && response.success) {
            toast.show('Transaction sent successfully', 'success');
            return response.data;
          }
          
          toast.show('Transaction failed', 'error');
          throw new Error(response?.error || 'Transaction failed');
        }

        async signTransaction(params) {
          if (!this._isConnected) {
            throw this.createProviderError(4100, 'Unauthorized');
          }

          toast.show('Transaction signature required', 'info');

          const response = await this.sendToContentScript('ETH_SIGN_TRANSACTION', { params });
          
          if (response && response.success) {
            toast.show('Transaction signed successfully', 'success');
            return response.data;
          }
          
          throw new Error(response?.error || 'Transaction signing failed');
        }

        async sendRawTransaction(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid raw transaction parameters');
          }

          return await this.proxyRpcCall('eth_sendRawTransaction', params);
        }

        async personalSign(params) {
          if (!this._isConnected) {
            throw this.createProviderError(4100, 'Unauthorized');
          }

          if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid personal_sign parameters');
          }

          toast.show('Message signature required', 'info');

          const response = await this.sendToContentScript('PERSONAL_SIGN', { params });
          
          if (response && response.success) {
            toast.show('Message signed successfully', 'success');
            return response.data;
          }
          
          throw new Error(response?.error || 'Message signing failed');
        }

        async ethSign(params) {
          if (!this._isConnected) {
            throw this.createProviderError(4100, 'Unauthorized');
          }

          console.warn('eth_sign is deprecated and dangerous. Use personal_sign instead.');
          toast.show('Warning: eth_sign is deprecated', 'warning');

          const response = await this.sendToContentScript('ETH_SIGN', { params });
          
          if (response && response.success) {
            return response.data;
          }
          
          throw new Error(response?.error || 'eth_sign failed');
        }

        async signTypedData(method, params) {
          if (!this._isConnected) {
            throw this.createProviderError(4100, 'Unauthorized');
          }

          if (!params || !Array.isArray(params) || params.length < 2) {
            throw this.createProviderError(4001, 'Invalid signTypedData parameters');
          }

          toast.show('Typed data signature required', 'info');

          const response = await this.sendToContentScript('ETH_SIGN_TYPED_DATA', { method, params });
          
          if (response && response.success) {
            toast.show('Typed data signed successfully', 'success');
            return response.data;
          }
          
          throw new Error(response?.error || 'Typed data signing failed');
        }

        async switchChain(params) {
          if (!params || !Array.isArray(params) || !params[0]) {
            throw this.createProviderError(4001, 'Invalid switchEthereumChain parameters');
          }

          const { chainId } = params[0];
          
          if (!chainId || typeof chainId !== 'string') {
            throw this.createProviderError(4001, 'chainId must be a non-empty string');
          }

          const response = await this.sendToContentScript('WALLET_SWITCH_ETHEREUM_CHAIN', { chainId });
          
          if (response && response.success) {
            const oldChainId = this.chainId;
            this.chainId = chainId;
            this.networkVersion = parseInt(chainId, 16).toString();
            
            if (oldChainId !== chainId) {
              this.emit('chainChanged', chainId);
            }
            
            return null;
          } else {
            const errorCode = response?.error?.includes('Unrecognized') ? 4902 : 4001;
            throw this.createProviderError(errorCode, response?.error || 'Chain switch failed');
          }
        }

        async addChain(params) {
          if (!params || !Array.isArray(params) || !params[0]) {
            throw this.createProviderError(4001, 'Invalid addEthereumChain parameters');
          }

          const chainConfig = params[0];
          
          if (!chainConfig.chainId || !chainConfig.chainName || !chainConfig.rpcUrls) {
            throw this.createProviderError(4001, 'Missing required chain configuration');
          }

          const response = await this.sendToContentScript('WALLET_ADD_ETHEREUM_CHAIN', { params });
          
          if (response && response.success) {
            toast.show(\`Added \${chainConfig.chainName} network\`, 'success');
            return null;
          }
          
          throw this.createProviderError(4001, response?.error || 'User rejected the request');
        }

        async watchAsset(params) {
          if (!params || !Array.isArray(params) || !params[0]) {
            throw this.createProviderError(4001, 'Invalid watchAsset parameters');
          }

          const response = await this.sendToContentScript('WALLET_WATCH_ASSET', { params });
          
          if (response && response.success) {
            toast.show('Asset added to wallet', 'success');
            return response.data;
          }
          
          return false;
        }

        async requestPermissions(params) {
          const response = await this.sendToContentScript('WALLET_REQUEST_PERMISSIONS', { params });
          
          if (response && response.success) {
            return response.data;
          }
          
          return [];
        }

        async getPermissions() {
          const response = await this.sendToContentScript('WALLET_GET_PERMISSIONS');
          
          if (response && response.success) {
            return response.data;
          }
          
          return [];
        }

        // Advanced subscription methods
        async subscribe(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            throw this.createProviderError(4001, 'Invalid subscription parameters');
          }

          const subscriptionType = params[0];
          const subscriptionId = 'sub_' + Math.random().toString(36).substring(2);
          
          this._subscriptions.set(subscriptionId, {
            type: subscriptionType,
            params: params.slice(1),
            active: true
          });

          const response = await this.sendToContentScript('ETH_SUBSCRIBE', { 
            subscriptionId,
            type: subscriptionType,
            params: params.slice(1)
          });
          
          if (response && response.success) {
            return subscriptionId;
          }
          
          this._subscriptions.delete(subscriptionId);
          throw new Error(response?.error || 'Subscription failed');
        }

        async unsubscribe(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            return false;
          }

          const subscriptionId = params[0];
          const subscription = this._subscriptions.get(subscriptionId);
          
          if (!subscription) {
            return false;
          }

          subscription.active = false;
          this._subscriptions.delete(subscriptionId);

          const response = await this.sendToContentScript('ETH_UNSUBSCRIBE', { subscriptionId });
          return response?.success || false;
        }

        // Filter methods
        async newFilter(params) {
          const filterId = 'filter_' + Math.random().toString(36).substring(2);
          
          this._filters.set(filterId, {
            type: 'logs',
            params,
            created: Date.now()
          });

          const response = await this.sendToContentScript('ETH_NEW_FILTER', { filterId, params });
          return response?.success ? filterId : null;
        }

        async newBlockFilter() {
          const filterId = 'filter_' + Math.random().toString(36).substring(2);
          
          this._filters.set(filterId, {
            type: 'newHeads',
            created: Date.now()
          });

          const response = await this.sendToContentScript('ETH_NEW_BLOCK_FILTER', { filterId });
          return response?.success ? filterId : null;
        }

        async newPendingTransactionFilter() {
          const filterId = 'filter_' + Math.random().toString(36).substring(2);
          
          this._filters.set(filterId, {
            type: 'newPendingTransactions',
            created: Date.now()
          });

          const response = await this.sendToContentScript('ETH_NEW_PENDING_TX_FILTER', { filterId });
          return response?.success ? filterId : null;
        }

        async getFilterChanges(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            return [];
          }

          const filterId = params[0];
          if (!this._filters.has(filterId)) {
            return [];
          }

          const response = await this.sendToContentScript('ETH_GET_FILTER_CHANGES', { filterId });
          return response?.success ? response.data : [];
        }

        async getFilterLogs(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            return [];
          }

          const filterId = params[0];
          if (!this._filters.has(filterId)) {
            return [];
          }

          const response = await this.sendToContentScript('ETH_GET_FILTER_LOGS', { filterId });
          return response?.success ? response.data : [];
        }

        async uninstallFilter(params) {
          if (!params || !Array.isArray(params) || params.length === 0) {
            return false;
          }

          const filterId = params[0];
          const deleted = this._filters.delete(filterId);

          if (deleted) {
            const response = await this.sendToContentScript('ETH_UNINSTALL_FILTER', { filterId });
            return response?.success || false;
          }

          return false;
        }

        async proxyRpcCall(method, params) {
          const response = await this.sendToContentScript('PROXY_RPC_CALL', { method, params });
          
          if (response && response.success) {
            return response.data;
          }
          
          throw new Error(response?.error || \`RPC call \${method} failed\`);
        }

        async sendToContentScript(method, params = {}) {
          return new Promise((resolve, reject) => {
            const requestId = 'req_' + (++this._requestId).toString(36) + '_' + Math.random().toString(36).substring(2);
            
      const timeout = setTimeout(() => {
              this._pendingRequests.delete(requestId);
              reject(new Error(\`Request timeout: \${method}\`));
      }, 30000);

            const messageListener = (event) => {
              if (event.source === window && 
                  event.data.type === 'PAYCIO_RESPONSE' && 
                  event.data.requestId === requestId) {
                
                window.removeEventListener('message', messageListener);
        clearTimeout(timeout);
                this._pendingRequests.delete(requestId);
                
                resolve(event.data);
              }
            };

            this._pendingRequests.set(requestId, { method, params, resolve, reject, timeout });
            window.addEventListener('message', messageListener);

            window.postMessage({
              type: 'PAYCIO_REQUEST',
        method,
        params,
        requestId
            }, '*');
          });
        }

        createProviderError(code, message) {
          const error = new Error(message);
          error.code = code;
          
          switch (code) {
            case 4001:
              error.name = 'UserRejectedRequestError';
              break;
            case 4100:
              error.name = 'UnauthorizedError';
              break;
            case 4200:
              error.name = 'UnsupportedMethodError';
              break;
            case 4900:
              error.name = 'DisconnectedError';
              break;
            case 4901:
              error.name = 'ChainDisconnectedError';
              break;
            case 4902:
              error.name = 'UnrecognizedChainError';
              break;
          }
          
          return error;
        }

        // Legacy support methods
        async enable() {
          console.warn('ethereum.enable() is deprecated. Use ethereum.request({ method: "eth_requestAccounts" }) instead.');
          return await this.requestAccounts();
        }

        async send(method, params = []) {
          console.warn('ethereum.send() is deprecated. Use ethereum.request() instead.');
          return await this.request({ method, params });
        }

        sendAsync(payload, callback) {
          console.warn('ethereum.sendAsync() is deprecated. Use ethereum.request() instead.');
          
          if (!callback || typeof callback !== 'function') {
            throw new Error('Callback is required for sendAsync');
          }

          if (Array.isArray(payload)) {
            Promise.all(payload.map(item => this.request(item)))
              .then(results => {
                const responses = results.map((result, index) => ({
                  id: payload[index].id || null,
                  jsonrpc: '2.0',
                  result
                }));
                callback(null, responses);
              })
              .catch(error => callback(error));
          } else {
            this.request(payload)
              .then(result => {
                callback(null, { 
                  id: payload.id || null, 
                  jsonrpc: '2.0', 
                  result 
                });
              })
              .catch(error => callback(error));
          }
        }

        // Advanced connection methods
        async connectWalletConnect(uri) {
          return await walletConnect.handleWalletConnectUri(uri);
        }

        async getConnectedDapps() {
          return Array.from(connectionManager.connections.keys());
        }

        async disconnectDapp(origin) {
          connectionManager.disconnect(origin);
          this.emit('dapp_disconnected', { origin });
        }

        // Utility methods
        isValidAddress(address) {
          return /^0x[a-fA-F0-9]{40}$/.test(address);
        }

        isValidChainId(chainId) {
          return /^0x[a-fA-F0-9]+$/.test(chainId);
        }

        // Cleanup method
        destroy() {
          this.removeAllListeners();
          this._pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
          this._pendingRequests.clear();
          this._subscriptions.clear();
          this._filters.clear();
          this._isConnected = false;
          this._accounts = [];
          this.selectedAddress = null;
        }
      }

      // Enhanced Multi-chain providers with advanced features
      const multiChainProvider = {
        // Bitcoin provider with advanced features
        bitcoin: {
          isConnected: false,
          address: null,
          network: 'mainnet',

          async connect(options = {}) {
            try {
              toast.show('Connecting to Bitcoin wallet...', 'info');
              
              const response = await window.paycioProvider.sendToContentScript('BITCOIN_CONNECT', options);
              
              if (response && response.success) {
                this.isConnected = true;
                this.address = response.data.address;
                this.network = response.data.network || 'mainnet';
                
                toast.show('Bitcoin wallet connected', 'success');
                return response.data;
              }
              
              throw new Error(response?.error || 'Bitcoin connection failed');
            } catch (error) {
              toast.show(\`Bitcoin connection failed: \${error.message}\`, 'error');
              throw error;
            }
          },

          async disconnect() {
            this.isConnected = false;
            this.address = null;
            toast.show('Bitcoin wallet disconnected', 'info');
          },

          async getBalance(address = null) {
            const targetAddress = address || this.address;
            if (!targetAddress) throw new Error('No address provided');

            const response = await window.paycioProvider.sendToContentScript('BITCOIN_GET_BALANCE', { address: targetAddress });
            return response?.success ? response.data.balance : '0';
          },

          async getUtxos(address = null) {
            const targetAddress = address || this.address;
            if (!targetAddress) throw new Error('No address provided');

            const response = await window.paycioProvider.sendToContentScript('BITCOIN_GET_UTXOS', { address: targetAddress });
            return response?.success ? response.data.utxos : [];
          },

          async signTransaction(tx) {
            if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

            toast.show('Bitcoin transaction signature required', 'info');
            
            const response = await window.paycioProvider.sendToContentScript('BITCOIN_SIGN_TRANSACTION', { transaction: tx });
            
            if (response?.success) {
              toast.show('Bitcoin transaction signed', 'success');
              return response.data.signedTransaction;
            }
            
            throw new Error(response?.error || 'Bitcoin signing failed');
          },

          async sendTransaction(tx) {
            if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('BITCOIN_SEND_TRANSACTION', { transaction: tx });
            
            if (response?.success) {
              toast.show('Bitcoin transaction sent', 'success');
              return response.data.txHash;
            }
            
            throw new Error(response?.error || 'Bitcoin transaction failed');
          },

          async signMessage(message) {
            if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('BITCOIN_SIGN_MESSAGE', { message });
            return response?.success ? response.data.signature : Promise.reject(new Error(response?.error || 'Bitcoin message signing failed'));
          }
        },

        // Solana provider with advanced features
        solana: {
          publicKey: null,
          isConnected: false,
          cluster: 'mainnet-beta',

          async connect(options = {}) {
            try {
              toast.show('Connecting to Solana wallet...', 'info');
              
              const response = await window.paycioProvider.sendToContentScript('SOLANA_CONNECT', options);
              
              if (response && response.success) {
                this.publicKey = response.data.publicKey;
                this.isConnected = true;
                this.cluster = response.data.cluster || 'mainnet-beta';
                
                toast.show('Solana wallet connected', 'success');
                return response.data;
              }
              
              throw new Error(response?.error || 'Solana connection failed');
            } catch (error) {
              toast.show(\`Solana connection failed: \${error.message}\`, 'error');
              throw error;
            }
          },

          async disconnect() {
            this.publicKey = null;
            this.isConnected = false;
            toast.show('Solana wallet disconnected', 'info');
          },

          async getBalance() {
            if (!this.isConnected || !this.publicKey) throw new Error('Solana wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('SOLANA_GET_BALANCE', { publicKey: this.publicKey });
            return response?.success ? response.data.balance : 0;
          },

          async signTransaction(tx) {
            if (!this.isConnected) throw new Error('Solana wallet not connected');

            toast.show('Solana transaction signature required', 'info');

            const response = await window.paycioProvider.sendToContentScript('SOLANA_SIGN_TRANSACTION', { transaction: tx });
            
            if (response?.success) {
              toast.show('Solana transaction signed', 'success');
              return response.data.signedTransaction;
            }
            
            throw new Error(response?.error || 'Solana signing failed');
          },

          async signAndSendTransaction(tx) {
            if (!this.isConnected) throw new Error('Solana wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('SOLANA_SEND_TRANSACTION', { transaction: tx });
            
            if (response?.success) {
              toast.show('Solana transaction sent', 'success');
              return { signature: response.data.signature };
            }
            
            throw new Error(response?.error || 'Solana transaction failed');
          },

          async signMessage(message) {
            if (!this.isConnected) throw new Error('Solana wallet not connected');

            const messageArray = message instanceof Uint8Array ? Array.from(message) : message;
            const response = await window.paycioProvider.sendToContentScript('SOLANA_SIGN_MESSAGE', { message: messageArray });
            
            if (response?.success) {
              return new Uint8Array(response.data.signature);
            }
            
            throw new Error(response?.error || 'Solana message signing failed');
          },

          async signAllTransactions(txs) {
            if (!this.isConnected) throw new Error('Solana wallet not connected');

            const promises = txs.map(tx => this.signTransaction(tx));
            return await Promise.all(promises);
          }
        },

        // TRON provider
        tron: {
          isConnected: false,
          address: null,

          async connect() {
            toast.show('Connecting to TRON wallet...', 'info');
            
            const response = await window.paycioProvider.sendToContentScript('TRON_CONNECT');
            
            if (response && response.success) {
              this.isConnected = true;
              this.address = response.data.address;
              toast.show('TRON wallet connected', 'success');
              return response.data;
            }
            
            throw new Error(response?.error || 'TRON connection failed');
          },

          async disconnect() {
            this.isConnected = false;
            this.address = null;
            toast.show('TRON wallet disconnected', 'info');
          },

          async signTransaction(tx) {
            if (!this.isConnected) throw new Error('TRON wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('TRON_SIGN_TRANSACTION', { transaction: tx });
            return response?.success ? response.data.signedTransaction : Promise.reject(new Error(response?.error || 'TRON signing failed'));
          }
        },

        // TON provider
        ton: {
          isConnected: false,
          address: null,

          async connect() {
            toast.show('Connecting to TON wallet...', 'info');
            
            const response = await window.paycioProvider.sendToContentScript('TON_CONNECT');
            
            if (response && response.success) {
              this.isConnected = true;
              this.address = response.data.address;
              toast.show('TON wallet connected', 'success');
              return response.data;
            }
            
            throw new Error(response?.error || 'TON connection failed');
          },

          async disconnect() {
            this.isConnected = false;
            this.address = null;
            toast.show('TON wallet disconnected', 'info');
          },

          async signTransaction(tx) {
            if (!this.isConnected) throw new Error('TON wallet not connected');

            const response = await window.paycioProvider.sendToContentScript('TON_SIGN_TRANSACTION', { transaction: tx });
            return response?.success ? response.data.signedTransaction : Promise.reject(new Error(response?.error || 'TON signing failed'));
          }
        }
      };

      // Create and inject providers
      const ethereumProvider = new PaycioEthereumProvider();
      window.paycioProvider = ethereumProvider;

      // Inject Ethereum provider
      Object.defineProperty(window, 'ethereum', {
        value: ethereumProvider,
        writable: false,
        configurable: false
      });

      // Inject multi-chain provider
      Object.defineProperty(window, 'paycio', {
        value: {
          ...multiChainProvider,
          walletConnect,
          connectionManager,
          toast,
          modalManager,
          
          // Utility methods
          utils: {
            isValidEthereumAddress: (address) => /^0x[a-fA-F0-9]{40}$/.test(address),
            isValidBitcoinAddress: (address) => /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address),
            formatAddress: (address, length = 6) => \`\${address.slice(0, length)}...\${address.slice(-4)}\`,
            wei2eth: (wei) => (parseInt(wei, 16) / Math.pow(10, 18)).toString(),
            eth2wei: (eth) => '0x' + (parseFloat(eth) * Math.pow(10, 18)).toString(16)
          }
        },
        writable: false,
        configurable: false
      });

      // Legacy web3 support
      if (!window.web3) {
        Object.defineProperty(window, 'web3', {
          value: {
            currentProvider: ethereumProvider,
            eth: {
              get defaultAccount() {
                return ethereumProvider.selectedAddress;
              }
            },
            version: { api: '0.20.7' }
          },
          writable: false,
          configurable: true
        });
      }

      // Enhanced provider announcement with EIP-6963
      const announceProviders = () => {
        // Standard Ethereum provider events
        window.dispatchEvent(new Event('ethereum#initialized'));
        
        // EIP-6963: Multi Injected Provider Discovery
        const providerInfo = {
          uuid: 'f4b4f4b4-f4b4-f4b4-f4b4-f4b4f4b4f4b4',
          name: 'Paycio',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMiIvPgo8L3N2Zz4=',
          rdns: 'io.paycio.wallet'
        };

        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
          detail: Object.freeze({ info: providerInfo, provider: ethereumProvider })
        }));

        // Custom Paycio events
        window.dispatchEvent(new CustomEvent('paycio#initialized', {
          detail: {
            isPaycio: true,
            version: '1.0.0',
            supportedNetworks: [
              'ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism',
              'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
            ],
            features: [
              'eth_accounts', 'eth_sendTransaction', 'personal_sign', 
              'eth_signTypedData_v4', 'wallet_switchEthereumChain',
              'wallet_addEthereumChain', 'multichain', 'walletconnect',
              'subscriptions', 'filters', 'advanced_ui'
            ]
          }
        }));
      };

      // Announce immediately and on EIP-6963 request
      announceProviders();
      window.addEventListener('eip6963:requestProvider', announceProviders);

      // Global error handling
      window.addEventListener('error', (event) => {
        if (event.error && event.error.message && event.error.message.includes('Paycio')) {
          console.error('Paycio Provider Error:', event.error);
          toast.show('Provider error occurred', 'error');
        }
      });

      // Handle page navigation and cleanup
      let isNavigating = false;
      
      window.addEventListener('beforeunload', () => {
        isNavigating = true;
        
        if (ethereumProvider && typeof ethereumProvider.destroy === 'function') {
          ethereumProvider.destroy();
        }
        
        if (toast && typeof toast.destroy === 'function') {
          toast.destroy();
        }
        
        if (modalManager && typeof modalManager.destroy === 'function') {
          modalManager.destroy();
        }
      });

      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('Paycio: Page hidden, pausing provider');
      } else {
          console.log('Paycio: Page visible, resuming provider');
          if (!isNavigating && ethereumProvider && !ethereumProvider._initialized) {
            ethereumProvider.initialize();
          }
        }
      });

      // Context validation
      function validateExtensionContext() {
        try {
          return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        } catch (error) {
          toast.show('Extension context invalidated - Please refresh', 'error');
          return false;
        }
      }

      // Periodic context validation
      setInterval(validateExtensionContext, 30000);

      console.log('Paycio: Advanced wallet providers with all features injected successfully');
      
      // Debug information for development
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        console.log('Paycio Debug Info:', {
          ethereum: !!window.ethereum,
          paycio: !!window.paycio,
          web3: !!window.web3,
          provider: {
            isPaycio: window.ethereum?.isPaycio,
            chainId: window.ethereum?.chainId,
            isConnected: window.ethereum?.isConnected(),
            features: ['toast', 'modal', 'walletconnect', 'multichain', 'subscriptions', 'filters']
          },
          multichain: {
            bitcoin: !!window.paycio?.bitcoin,
            solana: !!window.paycio?.solana,
            tron: !!window.paycio?.tron,
            ton: !!window.paycio?.ton
          }
        });
      }

    })();
  `;

  // Inject the script into the page
  try {
    const target = document.head || document.documentElement;
    target.insertBefore(script, target.children[0]);
    console.log('Paycio: Advanced provider script injected successfully');
    script.remove();
  } catch (error) {
    console.error('Paycio: Failed to inject provider script:', error);
    
    // Fallback injection method
    try {
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      console.log('Paycio: Provider script injected via fallback method');
    } catch (fallbackError) {
      console.error('Paycio: All injection methods failed:', fallbackError);
    }
  }

  // Enhanced content script message handling - bridge between injected script and background
  const handlePageMessage = async (event: MessageEvent) => {
    // Only handle messages from the same window (injected script)
    if (event.source !== window || event.data.type !== 'PAYCIO_REQUEST') {
      return;
    }

    const { method, params, requestId } = event.data;

    // Validate message structure
    if (!method || !requestId) {
      console.warn('Paycio: Invalid message structure:', event.data);
      return;
    }

    console.log(`Paycio Content Script: Forwarding ${method} to background`);

    try {
      // Forward request to background script with comprehensive error handling
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Background script timeout for ${method}`));
        }, 45000); // Increased timeout for complex operations

        // Enhanced message structure for background script
        const backgroundMessage = {
          type: 'PAYCIO_DAPP_REQUEST',
          method,
          params,
          requestId,
          origin: window.location.origin,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        };

        browserAPI.runtime.sendMessage(backgroundMessage, (response) => {
          clearTimeout(timeout);
          
          if (browserAPI.runtime.lastError) {
            console.error('Paycio: Runtime error:', browserAPI.runtime.lastError);
            
            // Handle specific Chrome extension errors
            if (browserAPI.runtime.lastError.message?.includes('Extension context invalidated')) {
              reject(new Error('EXTENSION_CONTEXT_INVALIDATED'));
            } else {
              reject(new Error(browserAPI.runtime.lastError.message || 'Runtime error'));
            }
            return;
          }
          
          if (!response) {
            reject(new Error('No response from background script'));
            return;
          }
          
          resolve(response);
        });
      });

      // Enhanced response with additional metadata
    window.postMessage({
        type: 'PAYCIO_RESPONSE',
      requestId,
        success: response.success !== false,
      data: response.data,
        error: response.error,
        metadata: {
          processedAt: Date.now(),
          method,
          origin: window.location.origin
        }
      }, '*');

    } catch (error) {
      console.error(`Paycio: Error processing ${method}:`, error);
      
      // Handle extension context invalidation
      if (error.message === 'EXTENSION_CONTEXT_INVALIDATED') {
        // Notify injected script about context invalidation
    window.postMessage({
          type: 'PAYCIO_CONTEXT_INVALIDATED',
          requestId,
          error: 'Extension context was invalidated. Please refresh the page.',
          recovery: {
            action: 'refresh',
            message: 'Please refresh the page to restore wallet functionality'
          }
    }, '*');
        return;
  }

      // Send error response back to injected script
    window.postMessage({
        type: 'PAYCIO_RESPONSE',
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        errorType: error.name || 'UnknownError',
        metadata: {
          processedAt: Date.now(),
          method,
          failed: true
      }
    }, '*');
  }
  };

  // Add message listener with enhanced error handling
  window.addEventListener('message', handlePageMessage, { passive: true });

  // Enhanced background message handler
  const handleBackgroundMessage = (message: any, sender: any, sendResponse: (response?: any) => void) => {
    if (!message.type?.startsWith('PAYCIO_')) {
      return false;
    }

    console.log('Paycio Content Script: Received background message:', message.type);

    try {
      // Forward background messages to injected script with error handling
      window.postMessage({
        ...message,
        forwarded: true,
        timestamp: Date.now()
    }, '*');
      
      // Send acknowledgment back to background script
      sendResponse({ received: true, timestamp: Date.now() });
    } catch (error) {
      console.error('Paycio: Error forwarding background message:', error);
      sendResponse({ received: false, error: error.message });
    }
    
    return true; // Keep message channel open
  };

  browserAPI.runtime.onMessage.addListener(handleBackgroundMessage);

  // Enhanced context invalidation handling
  const handleContextInvalidation = () => {
    console.warn('Paycio: Extension context invalidated, initiating cleanup...');
    
    // Remove listeners
    window.removeEventListener('message', handlePageMessage);
    
    // Notify injected script with recovery options
    window.postMessage({
      type: 'PAYCIO_CONTEXT_INVALIDATED',
      data: { 
        reason: 'Extension context invalidated',
        timestamp: Date.now(),
        recovery: {
          actions: ['refresh', 'reconnect'],
          message: 'Extension connection lost. Please refresh the page to restore functionality.'
        }
      }
    }, '*');

    // Show user notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
    `;
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">Paycio Wallet Disconnected</div>
      <div style="font-size: 12px; opacity: 0.9;">Click to refresh and restore connection</div>
    `;
    
    notification.onclick = () => window.location.reload();
    document.body.appendChild(notification);

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  };

  // Listen for extension context invalidation
  let contextValidationInterval: number;

  const startContextValidation = () => {
    contextValidationInterval = window.setInterval(() => {
      try {
        if (!browserAPI.runtime || !(browserAPI.runtime as any).id) {
          throw new Error('Extension context lost');
        }
        
        // Test connection with a lightweight message
        browserAPI.runtime.sendMessage({
          type: 'PAYCIO_CONTEXT_CHECK',
          timestamp: Date.now()
        }, (response) => {
          if (browserAPI.runtime.lastError) {
            console.warn('Paycio: Context validation failed:', browserAPI.runtime.lastError);
            handleContextInvalidation();
            clearInterval(contextValidationInterval);
          }
        });
      } catch (error) {
        console.warn('Paycio: Context validation error:', error);
        handleContextInvalidation();
        clearInterval(contextValidationInterval);
      }
    }, 30000); // Check every 30 seconds
  };

  startContextValidation();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    console.log('Paycio: Content script cleanup on page unload');
    
    // Clear intervals
    if (contextValidationInterval) {
      clearInterval(contextValidationInterval);
    }
    
    // Remove listeners
    window.removeEventListener('message', handlePageMessage);
    
    // Notify background script of page unload
    try {
      browserAPI.runtime.sendMessage({
        type: 'PAYCIO_PAGE_UNLOAD',
        origin: window.location.origin,
        timestamp: Date.now()
      });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  // Enhanced heartbeat system
  let heartbeatInterval: number | null = null;
  let heartbeatFailures = 0;
  const MAX_HEARTBEAT_FAILURES = 3;
  
  const startHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = window.setInterval(() => {
      try {
        browserAPI.runtime.sendMessage({
          type: 'PAYCIO_HEARTBEAT',
          timestamp: Date.now(),
          origin: window.location.origin,
          url: window.location.href,
          userAgent: navigator.userAgent
        }, (response) => {
          if (browserAPI.runtime.lastError) {
            heartbeatFailures++;
            console.warn(`Paycio: Heartbeat failed (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, browserAPI.runtime.lastError);
            
            if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
              console.error('Paycio: Maximum heartbeat failures reached, context may be invalidated');
              handleContextInvalidation();
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
            }
          } else {
            // Reset failure counter on successful heartbeat
            heartbeatFailures = 0;
            
            if (response?.status === 'ok') {
              console.log('Paycio: Heartbeat successful');
            }
          }
        });
      } catch (error) {
        heartbeatFailures++;
        console.warn(`Paycio: Heartbeat error (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, error);
        
        if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
          handleContextInvalidation();
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }
    }, 25000); // 25 second heartbeat
  };

  startHeartbeat();

  // Performance monitoring
  const performanceMonitor = {
    startTime: Date.now(),
    messageCount: 0,
    errorCount: 0,
    
    logMessage() {
      this.messageCount++;
    },
    
    logError() {
      this.errorCount++;
    },
    
    getStats() {
      const uptime = Date.now() - this.startTime;
      return {
        uptime,
        messageCount: this.messageCount,
        errorCount: this.errorCount,
        errorRate: this.errorCount / Math.max(this.messageCount, 1),
        messagesPerMinute: (this.messageCount / uptime) * 60000
      };
    }
  };

  // Enhanced logging for development and debugging
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('.local');

  if (isDevelopment) {
    console.log('Paycio Development Mode: Enhanced logging and debugging enabled');
    
    // Log all provider events in development
    window.addEventListener('message', (event) => {
      if (event.data.type?.startsWith('PAYCIO_')) {
        console.log('Paycio Dev Log:', {
          type: event.data.type,
          data: event.data,
          timestamp: new Date().toISOString(),
          performance: performanceMonitor.getStats()
        });
        performanceMonitor.logMessage();
      }
    });

    // Add debugging utilities to window
    (window as any).paycioDebug = {
      getPerformanceStats: () => performanceMonitor.getStats(),
      triggerContextCheck: () => startContextValidation(),
      testHeartbeat: () => startHeartbeat(),
      getExtensionInfo: () => ({
        id: (browserAPI.runtime as any)?.id,
        version: (browserAPI.runtime as any)?.getManifest?.()?.version,
        contextValid: !!(browserAPI.runtime as any)?.id
      })
    };

    console.log('Paycio: Debug utilities available at window.paycioDebug');
  }

  // Feature detection and compatibility checks
  const compatibilityCheck = () => {
    const features = {
      postMessage: typeof window.postMessage === 'function',
      addEventListener: typeof window.addEventListener === 'function',
      Promise: typeof Promise !== 'undefined',
      chrome: typeof chrome !== 'undefined',
      browser: typeof browser !== 'undefined',
      runtime: !!(browserAPI.runtime),
      sendMessage: !!(browserAPI.runtime?.sendMessage),
      onMessage: !!(browserAPI.runtime?.onMessage)
    };

    const missingFeatures = Object.entries(features)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature);

    if (missingFeatures.length > 0) {
      console.error('Paycio: Missing required browser features:', missingFeatures);
      return false;
    }

    console.log('Paycio: All required browser features available');
    return true;
  };

  // Initialize only if compatible
  if (compatibilityCheck()) {
    // Final initialization message
    console.log('Paycio: Enhanced content script initialized successfully with features:', {
      toastNotifications: true,
      modalSystem: true,
      walletConnect: true,
      multiChain: true,
      subscriptions: true,
      filters: true,
      contextValidation: true,
      heartbeat: true,
      performanceMonitoring: true,
      enhancedErrorHandling: true,
      developmentDebugging: isDevelopment
    });

    console.log('Paycio: Ready for advanced DApp interactions');

    // Send initialization complete message to background
    try {
      browserAPI.runtime.sendMessage({
        type: 'PAYCIO_CONTENT_SCRIPT_READY',
        origin: window.location.origin,
        url: window.location.href,
        timestamp: Date.now(),
        features: ['advanced-provider', 'toast', 'modal', 'walletconnect', 'multichain']
      });
    } catch (error) {
      console.warn('Paycio: Failed to notify background script of initialization:', error);
    }
  } else {
    console.error('Paycio: Content script initialization failed due to missing browser features');
  }
}