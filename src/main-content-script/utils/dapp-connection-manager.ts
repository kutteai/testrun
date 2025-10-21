import { getBrowser } from '../../utils/browser';
import { ExtensionMessage, ExtensionResponse } from '../../types/content-script';
import { PaycioEthereumProvider } from './ethereum-provider';

interface ConnectedDApp {
  origin: string;
  name?: string;
  icon?: string;
}
