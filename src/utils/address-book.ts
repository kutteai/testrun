import { resolveENS, lookupENS } from './ens-utils';
import { storage } from './storage-utils';

export interface Contact {
  id: string;
  name: string;
  address: string;
  ens?: string;
  domain?: string;
  network: string;
  tags: string[];
  notes?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  ens?: string;
  domain?: string;
  networks: string[];
  tags: string[];
  notes?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export class AddressBook {
  private contacts: Map<string, Contact> = new Map();
  private ensCache: Map<string, string> = new Map();
  private addressCache: Map<string, string> = new Map();

  constructor() {
    this.loadContacts();
  }

  // Add new contact
  async addContact(
    name: string,
    address: string,
    network: string,
    tags: string[] = [],
    notes?: string
  ): Promise<Contact> {
    // Validate address format
    if (!this.isValidAddress(address, network)) {
      throw new Error(`Invalid ${network} address format`);
    }

    // Check if contact already exists
    const existingContact = this.findContactByAddress(address, network);
    if (existingContact) {
      throw new Error('Contact already exists');
    }

    // Try to resolve ENS name
    let ens: string | undefined;
    if (network === 'ethereum') {
      ens = await this.resolveENS(address);
    }

    // Try to resolve domain
    let domain: string | undefined;
    if (network === 'ethereum') {
      domain = await this.resolveDomain(address);
    }

    const contact: Contact = {
      id: `${network}-${address}-${Date.now()}`,
      name,
      address: address.toLowerCase(),
      ens,
      domain,
      network,
      tags,
      notes,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.contacts.set(contact.id, contact);
    this.saveContacts();

    return contact;
  }

  // Update contact
  async updateContact(
    id: string,
    updates: Partial<Omit<Contact, 'id' | 'address' | 'network' | 'createdAt'>>
  ): Promise<Contact> {
    const contact = this.contacts.get(id);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const updatedContact: Contact = {
      ...contact,
      ...updates,
      updatedAt: Date.now()
    };

    this.contacts.set(id, updatedContact);
    this.saveContacts();

    return updatedContact;
  }

  // Remove contact
  removeContact(id: string): boolean {
    const deleted = this.contacts.delete(id);
    if (deleted) {
      this.saveContacts();
    }
    return deleted;
  }

  // Get contact by ID
  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  // Get all contacts
  getAllContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  // Get contacts by network
  getContactsByNetwork(network: string): Contact[] {
    return this.getAllContacts().filter(contact => contact.network === network);
  }

  // Get favorite contacts
  getFavoriteContacts(): Contact[] {
    return this.getAllContacts().filter(contact => contact.isFavorite);
  }

  // Get contacts by tag
  getContactsByTag(tag: string): Contact[] {
    return this.getAllContacts().filter(contact => contact.tags.includes(tag));
  }

  // Search contacts
  searchContacts(query: string): Contact[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllContacts().filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.address.toLowerCase().includes(lowerQuery) ||
      contact.ens?.toLowerCase().includes(lowerQuery) ||
      contact.domain?.toLowerCase().includes(lowerQuery) ||
      contact.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      contact.notes?.toLowerCase().includes(lowerQuery)
    );
  }

  // Find contact by address
  findContactByAddress(address: string, network: string): Contact | undefined {
    const normalizedAddress = address.toLowerCase();
    return this.getAllContacts().find(contact => 
      contact.address === normalizedAddress && contact.network === network
    );
  }

  // Find contact by ENS name
  async findContactByENS(ensName: string): Promise<Contact | undefined> {
    const address = await resolveENS(ensName);
    if (!address) return undefined;

    return this.findContactByAddress(address, 'ethereum');
  }

  // Toggle favorite status
  toggleFavorite(id: string): Contact {
    const contact = this.contacts.get(id);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const updatedContact: Contact = {
      ...contact,
      isFavorite: !contact.isFavorite,
      updatedAt: Date.now()
    };

    this.contacts.set(id, updatedContact);
    this.saveContacts();

    return updatedContact;
  }

  // Add tag to contact
  addTag(id: string, tag: string): Contact {
    const contact = this.contacts.get(id);
    if (!contact) {
      throw new Error('Contact not found');
    }

    if (contact.tags.includes(tag)) {
      throw new Error('Tag already exists');
    }

    const updatedContact: Contact = {
      ...contact,
      tags: [...contact.tags, tag],
      updatedAt: Date.now()
    };

    this.contacts.set(id, updatedContact);
    this.saveContacts();

    return updatedContact;
  }

  // Remove tag from contact
  removeTag(id: string, tag: string): Contact {
    const contact = this.contacts.get(id);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const updatedContact: Contact = {
      ...contact,
      tags: contact.tags.filter(t => t !== tag),
      updatedAt: Date.now()
    };

    this.contacts.set(id, updatedContact);
    this.saveContacts();

    return updatedContact;
  }

  // Get all tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.getAllContacts().forEach(contact => {
      contact.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  // Resolve ENS name to address
  private async resolveENS(address: string): Promise<string | undefined> {
    // Check cache first
    if (this.ensCache.has(address)) {
      return this.ensCache.get(address);
    }

    try {
      const ensName = await lookupENS(address);
      if (ensName) {
        this.ensCache.set(address, ensName);
        return ensName;
      }
    } catch (error) {
      console.warn('ENS lookup failed:', error);
    }

    return undefined;
  }

  // Resolve domain (Unstoppable Domains, etc.)
  private async resolveDomain(address: string): Promise<string | undefined> {
    // Check cache first
    if (this.addressCache.has(address)) {
      return this.addressCache.get(address);
    }

    try {
      // Try to resolve Unstoppable Domains (.crypto, .nft, .x, etc.)
      const response = await fetch(`https://api.unstoppabledomains.com/resolve/${address}`);
      if (response.ok) {
        const data = await response.json();
        const domain = data.meta.domain;
        if (domain) {
          this.addressCache.set(address, domain);
          return domain;
        }
      }
    } catch (error) {
      console.warn('Domain resolution failed:', error);
    }

    return undefined;
  }

  // Validate address format
  private isValidAddress(address: string, network: string): boolean {
    switch (network) {
      case 'ethereum':
      case 'polygon':
      case 'bsc':
      case 'avalanche':
      case 'arbitrum':
      case 'optimism':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'bitcoin':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
               /^bc1[a-z0-9]{39,59}$/.test(address);
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case 'tron':
        return /^T[A-Za-z1-9]{33}$/.test(address);
      case 'xrp':
        return /^r[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
      default:
        return true; // Allow unknown networks
    }
  }

  // Load contacts from storage
  private async loadContacts(): Promise<void> {
    try {
      const result = await storage.get(['addressBook']);
      if (result.addressBook) {
        const contacts = JSON.parse(result.addressBook);
        contacts.forEach((contact: Contact) => {
          this.contacts.set(contact.id, contact);
        });
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
    }
  }

  // Save contacts to storage
  private async saveContacts(): Promise<void> {
    const contacts = this.getAllContacts();
    try {
      await storage.set({ addressBook: JSON.stringify(contacts) });
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  // Export contacts
  exportContacts(): string {
    return JSON.stringify(this.getAllContacts(), null, 2);
  }

  // Import contacts
  importContacts(jsonData: string): Contact[] {
    try {
      const contacts = JSON.parse(jsonData);
      const imported: Contact[] = [];

      contacts.forEach((contact: any) => {
        if (this.isValidContact(contact)) {
          const newContact: Contact = {
            ...contact,
            id: `${contact.network}-${contact.address}-${Date.now()}`,
            updatedAt: Date.now()
          };
          this.contacts.set(newContact.id, newContact);
          imported.push(newContact);
        }
      });

      this.saveContacts();
      return imported;
    } catch (error) {
      throw new Error('Invalid contact data format');
    }
  }

  // Validate contact data
  private isValidContact(contact: any): contact is Contact {
    return (
      typeof contact.name === 'string' &&
      typeof contact.address === 'string' &&
      typeof contact.network === 'string' &&
      Array.isArray(contact.tags) &&
      typeof contact.isFavorite === 'boolean' &&
      typeof contact.createdAt === 'number'
    );
  }

  // Clear all contacts
  clearAllContacts(): void {
    this.contacts.clear();
    this.saveContacts();
  }

  // Get contact statistics
  getStatistics(): {
    total: number;
    byNetwork: Record<string, number>;
    favorites: number;
    withENS: number;
    withDomain: number;
  } {
    const contacts = this.getAllContacts();
    const byNetwork: Record<string, number> = {};
    
    contacts.forEach(contact => {
      byNetwork[contact.network] = (byNetwork[contact.network] || 0) + 1;
    });

    return {
      total: contacts.length,
      byNetwork,
      favorites: contacts.filter(c => c.isFavorite).length,
      withENS: contacts.filter(c => c.ens).length,
      withDomain: contacts.filter(c => c.domain).length
    };
  }
}

// Export singleton instance
export const addressBook = new AddressBook(); 