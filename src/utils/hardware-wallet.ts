// Hardware Wallet Utilities - Compatibility Layer
// This file provides the interface that the UI components expect

import { HardwareWalletManager as SDKHardwareWalletManager, HardwareWalletType, ConnectionStatus } from './hardware-wallet-sdk';

export { HardwareWalletType, ConnectionStatus };

export class HardwareWalletManager {
  private manager: any;

  constructor() {
    this.manager = new SDKHardwareWalletManager();
  }

  // Device detection and support
  async checkSupport(): Promise<{ ledger: boolean; trezor: boolean }> {
    return {
      ledger: true, // Assume support for now
      trezor: true
    };
  }

  getAvailableWalletTypes(): Array<{ type: string; supported: boolean; detected: boolean }> {
    return [
      { type: 'ledger', supported: true, detected: false },
      { type: 'trezor', supported: true, detected: false }
    ];
  }

  isSupported(type: string): boolean {
    return ['ledger', 'trezor'].includes(type);
  }

  // Device management
  async refreshDeviceDetection(): Promise<void> {
    // Implementation would refresh device detection
  }

  async detectConnectedDevices(): Promise<any[]> {
    const devices = this.manager.getConnectedDevices();
    return devices.map((device: any) => ({
      type: device.type || 'unknown',
      detected: true,
      supported: true
    }));
  }

  async requestUSBPermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      // Request USB permissions
      if (navigator.usb) {
        await navigator.usb.requestDevice({ filters: [] });
        return { success: true };
      }
      return { success: false, error: 'USB API not available' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async requestDeviceAccess(): Promise<{ success: boolean; error?: string }> {
    return this.requestUSBPermissions();
  }

  // Connection management
  async connectToDevice(type: 'ledger' | 'trezor'): Promise<any> {
    if (type === 'ledger') {
      return this.manager.connectLedger();
    } else if (type === 'trezor') {
      return this.manager.connectTrezor();
    }
    throw new Error(`Unsupported device type: ${type}`);
  }

  async getDeviceInfo(deviceId?: string): Promise<any> {
    if (deviceId) {
      const device = this.manager.getDevice(deviceId);
      return device ? device.getDeviceInfo() : null;
    }
    return null;
  }

  // Address derivation
  async getHardwareWalletAddresses(deviceId: string, count: number = 5): Promise<string[]> {
    const addresses: string[] = [];
    for (let i = 0; i < count; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const result = await this.manager.getAddress(deviceId, path);
      if (result.success) {
        addresses.push(result.address);
      }
    }
    return addresses;
  }

  async deriveAddressFromPath(deviceId: string, path: string): Promise<string> {
    const result = await this.manager.getAddress(deviceId, path);
    if (result.success) {
      return result.address;
    }
    throw new Error('Failed to derive address');
  }

  // Public key export
  async exportPublicKeyLedger(deviceId?: string, path?: string): Promise<string> {
    // Return empty string for now - implement if needed
    return '';
  }

  async exportPublicKeyTrezor(deviceId?: string, path?: string): Promise<string> {
    // Return empty string for now - implement if needed
    return '';
  }

  // Disconnection
  async disconnectHardwareWallet(deviceId?: string): Promise<void> {
    if (deviceId) {
      await this.manager.disconnectDevice(deviceId);
    }
  }

  // Properties for compatibility
  get derivationPath(): string {
    return "m/44'/60'/0'/0/0"; // Default Ethereum path
  }

  set derivationPath(path: string) {
    // Store derivation path if needed
  }
}

export const hardwareWalletManager = new HardwareWalletManager();
