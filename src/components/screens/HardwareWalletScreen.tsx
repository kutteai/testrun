import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Usb, QrCode, Loader, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { HardwareWalletManager } from '../../utils/hardware-wallet';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface WalletOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  selected: boolean;
  supported: boolean;
  detected: boolean;
  connecting: boolean;
  connected: boolean;
}

interface DeviceInfo {
  name: string;
  model: string;
  firmware: string;
  status: string;
  deviceType: string;
  connected: boolean;
}

const HardwareWalletScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { addHardwareWallet } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState('ledger');
  const [hardwareWalletManager] = useState(() => new HardwareWalletManager());
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Initialize hardware wallet support check
  useEffect(() => {
    const initializeHardwareWallets = async () => {
      try {
        // Check hardware wallet support
        await hardwareWalletManager.checkSupport();
        
        // Get available wallet types
        const availableTypes = hardwareWalletManager.getAvailableWalletTypes();
        
        // Update wallet options with real support status
        const updatedOptions: WalletOption[] = [
          {
            id: 'ledger',
            name: 'Ledger',
            icon: <Shield className="w-5 h-5" />,
            selected: selectedWallet === 'ledger',
            supported: availableTypes.find(t => t.type === 'ledger')?.supported || false,
            detected: availableTypes.find(t => t.type === 'ledger')?.detected || false,
            connecting: false,
            connected: false
          },
          {
            id: 'trezor',
            name: 'Trezor',
            icon: <Shield className="w-5 h-5" />,
            selected: selectedWallet === 'trezor',
            supported: availableTypes.find(t => t.type === 'trezor')?.supported || false,
            detected: availableTypes.find(t => t.type === 'trezor')?.detected || false,
            connecting: false,
            connected: false
          },
          {
            id: 'lattice',
            name: 'Lattice',
            icon: <Shield className="w-5 h-5" />,
            selected: selectedWallet === 'lattice',
            supported: false, // Lattice not yet implemented
            detected: false,
            connecting: false,
            connected: false
          },
          {
            id: 'qr',
            name: 'QR-based',
            icon: <QrCode className="w-5 h-5" />,
            selected: selectedWallet === 'qr',
            supported: false, // QR not yet implemented
            detected: false,
            connecting: false,
            connected: false
          }
        ];
        
        setWalletOptions(updatedOptions);
      } catch (error) {
        console.error('Failed to initialize hardware wallets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('WebUSB')) {
          toast.error('WebUSB not supported. Please use Chrome or Edge browser for hardware wallet support.');
        } else if (errorMessage.includes('secure context')) {
          toast.error('Hardware wallets require HTTPS or chrome-extension context for security.');
        } else if (errorMessage.includes('USB permissions') || errorMessage.includes('usb permission')) {
          toast.error('USB permissions not available. Chrome extensions can use WebUSB without explicit permissions.');
        } else {
          toast.error(`Failed to initialize hardware wallet support: ${errorMessage}`);
        }
      }
    };

    initializeHardwareWallets();
  }, [hardwareWalletManager]);

  // Update wallet options when selection changes
  useEffect(() => {
    setWalletOptions(prev => prev.map(option => ({
      ...option,
      selected: option.id === selectedWallet
    })));
  }, [selectedWallet]);

  // Real-time device status monitoring
  useEffect(() => {
    const monitorDeviceStatus = async () => {
      if (hardwareWalletManager.isSupported) {
        try {
          // Check for newly connected/disconnected devices
          const availableTypes = hardwareWalletManager.getAvailableWalletTypes();
          
          setWalletOptions(prev => prev.map(option => ({
            ...option,
            detected: availableTypes.find(t => t.type === option.id)?.detected || false
          })));
        } catch (error) {
          console.error('Device status monitoring failed:', error);
        }
      }
    };

    // Monitor device status every 2 seconds
    const interval = setInterval(monitorDeviceStatus, 2000);
    
    return () => clearInterval(interval);
  }, [hardwareWalletManager]);

  // Refresh device detection
  const refreshDeviceDetection = async () => {
    try {
      setConnectionStatus('connecting');
      await hardwareWalletManager.refreshDeviceDetection();
      
      // Update wallet options with fresh detection status
      const availableTypes = hardwareWalletManager.getAvailableWalletTypes();
      setWalletOptions(prev => prev.map(option => ({
        ...option,
        detected: availableTypes.find(t => t.type === option.id)?.detected || false
      })));
      
      setConnectionStatus('idle');
      toast.success('Device detection refreshed');
    } catch (error) {
      console.error('Failed to refresh device detection:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to refresh device detection');
      toast.error('Failed to refresh device detection');
    }
  };

  // Connect to selected hardware wallet
  const connectToHardwareWallet = async () => {
    const selectedOption = walletOptions.find(option => option.id === selectedWallet);
    
    if (!selectedOption || !selectedOption.supported) {
      toast.error(`${selectedOption?.name || 'Selected wallet'} is not supported`);
      return;
    }

    try {
      setConnectionStatus('connecting');
      setErrorMessage('');
      
      // Update connecting state for selected wallet
      setWalletOptions(prev => prev.map(option => ({
        ...option,
        connecting: option.id === selectedWallet
      })));

      console.log(`Attempting to connect to ${selectedWallet}...`);
      
      // First, try to detect already connected devices
      const connectedDevices = await hardwareWalletManager.detectConnectedDevices();
      
      if (connectedDevices.length === 0) {
        // No devices detected, request USB permissions
        toast.loading('Requesting USB device access...');
        
        try {
          const permissionResult = await hardwareWalletManager.requestUSBPermissions();
          
          if (!permissionResult.success) {
            throw new Error(permissionResult.error || 'Failed to get USB device access');
          }
          
          toast.dismiss();
          toast.success('USB device access granted!');
        } catch (permissionError) {
          toast.dismiss();
          // Provide specific guidance for USB permission issues
          if (permissionError.message.includes('NotFoundError') || permissionError.message.includes('No device selected')) {
            throw new Error('No hardware wallet device selected. Please select your device when prompted.');
          } else if (permissionError.message.includes('SecurityError') || permissionError.message.includes('Permission denied')) {
            throw new Error('USB device access denied. Please allow access to your hardware wallet device when prompted.');
          } else {
            throw new Error(`USB device access failed: ${permissionError.message}`);
          }
        }
      }
      
      // Connect to the device
      await hardwareWalletManager.connectToDevice(selectedWallet as 'ledger' | 'trezor');
      
      console.log('Device connected successfully, getting device info...');
      
      // Get device info and map it to our interface
      const info = await hardwareWalletManager.getDeviceInfo();
      const mappedDeviceInfo: DeviceInfo = {
        name: info.name || 'Unknown Device',
        model: info.model || 'Unknown Model',
        firmware: info.version || 'Unknown Version',
        status: info.connected ? 'Connected' : 'Disconnected',
        deviceType: info.deviceType || 'Unknown',
        connected: info.connected || false
      };
      setDeviceInfo(mappedDeviceInfo);
      
      console.log('Getting wallet addresses...');
      
      // Get wallet addresses
      const addresses = await hardwareWalletManager.getHardwareWalletAddresses(
        hardwareWalletManager.derivationPath
      );
      
      if (addresses.length > 0) {
        console.log(`Found ${addresses.length} addresses, adding to wallet...`);
        
        // Add hardware wallet to the wallet context
        await addHardwareWallet(
          selectedWallet as 'ledger' | 'trezor',
          addresses[0],
          hardwareWalletManager.derivationPath
        );
        
        setConnectionStatus('connected');
        
        // Update connected state for selected wallet
        setWalletOptions(prev => prev.map(option => ({
          ...option,
          connecting: false,
          connected: option.id === selectedWallet
        })));
        
        toast.success(`Successfully connected to ${selectedOption.name}`);
        
        // Navigate to UCPI creation after successful connection
        setTimeout(() => {
          onNavigate('create-ucpi');
        }, 1500);
      } else {
        throw new Error('No addresses derived from hardware wallet');
      }
    } catch (error) {
      console.error(`Failed to connect to ${selectedWallet}:`, error);
      setConnectionStatus('error');
      
      // Provide specific error messages based on error type
      let userErrorMessage = 'Connection failed';
      if (error instanceof Error) {
        if (error.message.includes('WebUSB')) {
          userErrorMessage = 'WebUSB not supported. Please use Chrome or Edge browser.';
        } else if (error.message.includes('Permission denied') || error.message.includes('SecurityError')) {
          userErrorMessage = 'USB device access denied. Please allow access to your hardware wallet device when prompted.';
        } else if (error.message.includes('No device selected') || error.message.includes('NotFoundError')) {
          userErrorMessage = 'No hardware wallet device selected. Please select your device when prompted.';
        } else if (error.message.includes('not connected')) {
          userErrorMessage = 'Device not connected. Please ensure your hardware wallet is plugged in and unlocked.';
        } else if (error.message.includes('USB permissions') || error.message.includes('usb permission')) {
          userErrorMessage = 'USB device access required. Chrome extensions can use WebUSB without explicit permissions.';
        } else if (error.message.includes('not responding')) {
          userErrorMessage = 'Device not responding. Please check if the Ethereum app is open on your device.';
        } else if (error.message.includes('access denied')) {
          userErrorMessage = 'Access denied. Please check if another application is using the device.';
        } else if (error.message.includes('timeout')) {
          userErrorMessage = 'Connection timeout. Please try again and ensure your device is ready.';
        } else if (error.message.includes('Security error')) {
          userErrorMessage = 'Security error: WebUSB requires user interaction. Please try again.';
        } else {
          userErrorMessage = error.message;
        }
      }
      
      setErrorMessage(userErrorMessage);
      
      // Reset connecting state
      setWalletOptions(prev => prev.map(option => ({
        ...option,
        connecting: false
      })));
      
      toast.error(`Failed to connect to ${selectedOption.name}: ${userErrorMessage}`);
    }
  };

  const getConnectionInstruction = () => {
    const selectedOption = walletOptions.find(option => option.id === selectedWallet);
    
    if (!selectedOption) return 'Select a hardware wallet to connect';
    
    if (selectedOption.connecting) {
      return `Connecting to ${selectedOption.name}...`;
    }
    
    if (selectedOption.connected) {
      return `${selectedOption.name} connected successfully!`;
    }
    
    if (!selectedOption.supported) {
      return `${selectedOption.name} is not yet supported`;
    }
    
    switch (selectedWallet) {
      case 'ledger':
        return 'Plug your Ledger directly into your computer, unlock it, and open the Ethereum app.';
      case 'trezor':
        return 'Plug your Trezor directly into your computer, unlock it, and ensure it\'s ready.';
      case 'lattice':
        return 'Lattice hardware wallet support is coming soon.';
      case 'qr':
        return 'QR-based hardware wallet support is coming soon.';
      default:
        return 'Connect your hardware wallet';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Usb className="w-8 h-8 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'bg-blue-100';
      case 'connected':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const isContinueDisabled = () => {
    const selectedOption = walletOptions.find(option => option.id === selectedWallet);
    return !selectedOption?.supported || selectedOption?.connecting || connectionStatus === 'connecting';
  };

  // Test hardware wallet connection (real implementation)
  const testConnection = async () => {
    const selectedOption = walletOptions.find(option => option.id === selectedWallet);
    
    if (!selectedOption || !selectedOption.supported) {
      toast.error(`${selectedOption?.name || 'Selected wallet'} is not supported`);
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // Test basic connectivity
      await hardwareWalletManager.connectToDevice(selectedWallet as 'ledger' | 'trezor');
      
      // Test address derivation
      const testAddress = await hardwareWalletManager.deriveAddressFromPath(
        hardwareWalletManager.derivationPath,
        selectedWallet as 'ledger' | 'trezor'
      );
      
      if (testAddress) {
        toast.success(`Connection test successful! Address: ${testAddress.substring(0, 10)}...`);
        setConnectionStatus('connected');
      } else {
        throw new Error('Failed to derive test address');
      }
      
      // Disconnect after test
      await hardwareWalletManager.disconnectHardwareWallet();
      setConnectionStatus('idle');
      
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Test failed');
      toast.error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white dashboard-typography"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="flex-1 text-center text-xl font-bold">
            Connect Hardware Wallet
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        {/* Wallet Selection Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => setSelectedWallet(wallet.id)}
                disabled={!wallet.supported}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors ${
                  wallet.selected
                    ? 'bg-[#180CB2] text-white'
                    : wallet.supported
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {wallet.icon}
                <span className="font-medium">{wallet.name}</span>
                {wallet.detected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                {wallet.connecting && (
                  <Loader className="w-3 h-3 animate-spin" />
                )}
                {wallet.connected && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
            <button
              onClick={refreshDeviceDetection}
              disabled={connectionStatus === 'connecting'}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>

        {/* Connection Illustration */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className={`w-32 h-32 ${getConnectionStatusColor()} rounded-full flex items-center justify-center`}>
            {getConnectionStatusIcon()}
          </div>
        </motion.div>

        {/* Connection Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mb-8"
        >
          <p className="text-gray-700 text-lg">
            {getConnectionInstruction()}
          </p>
          
          {/* Request Device Access Button */}
          {connectionStatus === 'idle' && !walletOptions.find(w => w.id === selectedWallet)?.detected && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    setConnectionStatus('connecting');
                    const result = await hardwareWalletManager.requestDeviceAccess();
                    if (result.success) {
                      toast.success('Device access granted! You can now connect.');
                      await refreshDeviceDetection();
                    }
                  } catch (error) {
                    console.error('Failed to request device access:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    toast.error(`Failed to request device access: ${errorMessage}`);
                  } finally {
                    setConnectionStatus('idle');
                  }
                }}
                className="px-6 py-3 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#1409a0] transition-colors"
              >
                Request Device Access
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Click this if your device is connected but not detected
              </p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}
        </motion.div>

        {/* Device Info */}
        {deviceInfo && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8"
          >
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Device Information</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Name: {deviceInfo.name}</div>
                <div>Model: {deviceInfo.model}</div>
                <div>Firmware: {deviceInfo.firmware}</div>
                <div>Status: {deviceInfo.status}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8 space-y-3"
        >
          {/* Test Connection Button */}
          <button
            onClick={testConnection}
            disabled={isContinueDisabled() || connectionStatus === 'connecting'}
            className={`w-full py-3 px-6 font-medium rounded-lg transition-colors border ${
              isContinueDisabled() || connectionStatus === 'connecting'
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-[#180CB2] border-[#180CB2] hover:bg-[#180CB2] hover:text-white'
            }`}
          >
            Test Connection
          </button>

          {/* Connect Hardware Wallet Button */}
          <button
            onClick={connectToHardwareWallet}
            disabled={isContinueDisabled()}
            className={`w-full py-4 px-6 font-semibold rounded-lg transition-colors ${
              isContinueDisabled()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
            }`}
          >
            {connectionStatus === 'connecting' ? (
              <>
                <Loader className="w-5 h-5 animate-spin inline mr-2" />
                Connecting...
              </>
            ) : connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Connected Successfully!
              </>
            ) : (
              'Connect Hardware Wallet'
            )}
          </button>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center"
        >
          <p className="text-xs text-gray-500 leading-relaxed">
            Hardware wallet integrations use secure USB connections and never expose your private keys. 
            Your keys remain secure on the hardware device at all times.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HardwareWalletScreen; 