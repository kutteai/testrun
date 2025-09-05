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
    
    // Declare module for image files
    declare module '*.png' {
      const src: string;
      export default src;
    }
    
    declare module '*.jpg' {
      const src: string;
      export default src;
    }
    
    declare module '*.jpeg' {
      const src: string;
      export default src;
    }
    
    declare module '*.svg' {
      const src: string;
      export default src;
    }
  }
  
  export {};