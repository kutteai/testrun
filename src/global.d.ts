declare global {
    var global: typeof globalThis;
    
    namespace NodeJS {
      interface ProcessVersions {
        node: string;
      }
      
      interface Process {
        env: Record<string, string | undefined>;
        versions: ProcessVersions;
        browser: boolean;
      }
    }
    
    var process: NodeJS.Process;
    var Buffer: typeof import('buffer').Buffer;
  }
  
  // Extend Window interface for browser extension APIs
  declare global {
    interface Window {
      chrome: typeof chrome;
    }
  }
  
  export {};