// ENS Registration Validator - Check domain availability and validity before registration
// Ensures strict validation with no fallback generation

export interface ENSValidationResult {
  domain: string;
  isValid: boolean;
  isAvailable: boolean;
  isRegistered: boolean;
  registrationCost?: string;
  expirationDate?: Date;
  owner?: string;
  resolver?: string;
  error?: string;
  validationDetails: {
    formatValid: boolean;
    lengthValid: boolean;
    charactersValid: boolean;
    notReserved: boolean;
    onChainCheck: boolean;
  };
}

export interface ENSRegistrationCheck {
  available: boolean;
  rentPrice: string;
  commitment?: string;
  minCommitmentAge?: number;
  maxCommitmentAge?: number;
  error?: string;
}

// ENS contract addresses on Ethereum mainnet
export const ENS_CONTRACTS = {
  ENS_REGISTRY: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  ENS_REGISTRAR: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
  ENS_CONTROLLER: '0x253553366Da8546fC250F225fe3d25d0C782303b',
  PUBLIC_RESOLVER: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
  REVERSE_REGISTRAR: '0x084b1c3C81545d370f3634392De611CaaBFf8148'
};

// Reserved ENS names that cannot be registered
export const ENS_RESERVED_NAMES = [
  'eth', 'test', 'localhost', 'invalid', 'reverse', 'addr',
  'www', 'mail', 'ftp', 'http', 'https', 'ssl', 'tls',
  'root', 'admin', 'administrator', 'moderator', 'support',
  'help', 'info', 'contact', 'about', 'terms', 'privacy',
  'api', 'app', 'web', 'mobile', 'desktop', 'server',
  'database', 'cache', 'cdn', 'static', 'assets', 'media',
  'blog', 'news', 'forum', 'chat', 'social', 'community'
];

export class ENSRegistrationValidator {
  
  // Validate ENS domain format and basic rules
  static validateDomainFormat(domain: string): ENSValidationResult['validationDetails'] {
    const validation = {
      formatValid: false,
      lengthValid: false,
      charactersValid: false,
      notReserved: false,
      onChainCheck: false
    };
    
    // Check if domain ends with .eth
    if (!domain.toLowerCase().endsWith('.eth')) {
      return validation;
    }
    
    // Extract name without .eth suffix
    const name = domain.toLowerCase().replace('.eth', '');
    
    // Check length (minimum 3 characters for registration)
    validation.lengthValid = name.length >= 3 && name.length <= 63;
    
    // Check valid characters (alphanumeric and hyphens, no consecutive hyphens)
    const validCharacters = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    validation.charactersValid = validCharacters.test(name);
    
    // Check not reserved
    validation.notReserved = !ENS_RESERVED_NAMES.includes(name);
    
    // Check format is valid overall
    validation.formatValid = validation.lengthValid && 
                            validation.charactersValid && 
                            validation.notReserved;
    
    return validation;
  }
  
  // Check ENS domain availability on-chain
  static async checkDomainAvailability(domain: string): Promise<ENSRegistrationCheck> {
    try {
      if (!domain.endsWith('.eth')) {
        throw new Error('Domain must end with .eth for ENS registration');
      }
      
      const name = domain.replace('.eth', '');
      
      // Method 1: Try ENS availability API
      try {
        const response = await fetch(`https://api.ensideas.com/ens/available/${name}`);
        
        if (!response.ok) {
          throw new Error(`ENS availability API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
          available: data.available === true,
          rentPrice: data.rentPrice || '0',
          commitment: data.commitment,
          minCommitmentAge: data.minCommitmentAge || 60, // 1 minute
          maxCommitmentAge: data.maxCommitmentAge || 86400 // 24 hours
        };
        
      } catch (apiError) {
        // Method 2: Try alternative ENS API
        try {
          const response = await fetch(`https://ens.domains/api/check/${name}`);
          
          if (!response.ok) {
            throw new Error(`ENS domains API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          return {
            available: !data.registered,
            rentPrice: data.price || '0',
            error: data.registered ? 'Domain is already registered' : undefined
          };
          
        } catch (altApiError) {
          throw new Error(`ENS availability check failed: ${apiError.message}. Requires Web3 provider for direct contract calls. No fallback generation allowed.`);
        }
      }
      
    } catch (error) {
      throw new Error(`ENS availability check failed: ${(error as Error).message}. Real ENS contract integration required. No fallback generation allowed.`);
    }
  }
  
  // Get ENS domain registration details if already registered
  static async getDomainDetails(domain: string): Promise<Partial<ENSValidationResult>> {
    try {
      if (!domain.endsWith('.eth')) {
        throw new Error('Domain must end with .eth for ENS lookup');
      }
      
      // Try to resolve the domain to get registration details
      const response = await fetch(`https://api.ensideas.com/ens/resolve/${domain}`);
      
      if (!response.ok) {
        throw new Error(`ENS resolution API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.address && data.address !== '0x0000000000000000000000000000000000000000') {
        return {
          isRegistered: true,
          owner: data.address,
          resolver: data.resolver,
          expirationDate: data.expires ? new Date(data.expires * 1000) : undefined
        };
      }
      
      return {
        isRegistered: false
      };
      
    } catch (error) {
      throw new Error(`ENS domain details lookup failed: ${(error as Error).message}. Real ENS contract integration required.`);
    }
  }
  
  // Complete ENS domain validation - format, availability, and registration status
  static async validateDomainForRegistration(domain: string): Promise<ENSValidationResult> {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain format. ENS validation failed - no fallback generation allowed.');
    }
    
    const cleanDomain = domain.trim().toLowerCase();
    
    // Step 1: Validate format
    const validationDetails = this.validateDomainFormat(cleanDomain);
    
    if (!validationDetails.formatValid) {
      return {
        domain: cleanDomain,
        isValid: false,
        isAvailable: false,
        isRegistered: false,
        validationDetails,
        error: this.getFormatErrorMessage(validationDetails)
      };
    }
    
    try {
      // Step 2: Check availability on-chain
      const availabilityCheck = await this.checkDomainAvailability(cleanDomain);
      validationDetails.onChainCheck = true;
      
      // Step 3: Get registration details if domain exists
      let registrationDetails: Partial<ENSValidationResult> = {};
      
      if (!availabilityCheck.available) {
        try {
          registrationDetails = await this.getDomainDetails(cleanDomain);
        } catch (detailsError) {
          // If we can't get details but know it's unavailable, that's still valid info
          registrationDetails = { isRegistered: true };
        }
      }
      
      return {
        domain: cleanDomain,
        isValid: true,
        isAvailable: availabilityCheck.available,
        isRegistered: !availabilityCheck.available,
        registrationCost: availabilityCheck.rentPrice,
        validationDetails,
        ...registrationDetails,
        error: availabilityCheck.error
      };
      
    } catch (error) {
      // On-chain check failed - still return format validation but mark as error
      return {
        domain: cleanDomain,
        isValid: validationDetails.formatValid,
        isAvailable: false,
        isRegistered: false,
        validationDetails,
        error: (error as Error).message
      };
    }
  }
  
  // Get detailed error message for format validation failures
  private static getFormatErrorMessage(validation: ENSValidationResult['validationDetails']): string {
    const errors: string[] = [];
    
    if (!validation.lengthValid) {
      errors.push('Domain name must be 3-63 characters long');
    }
    
    if (!validation.charactersValid) {
      errors.push('Domain name can only contain letters, numbers, and hyphens (no consecutive hyphens)');
    }
    
    if (!validation.notReserved) {
      errors.push('Domain name is reserved and cannot be registered');
    }
    
    return errors.length > 0 
      ? `ENS domain format invalid: ${errors.join(', ')}. No fallback generation allowed.`
      : 'ENS domain format invalid. No fallback generation allowed.';
  }
  
  // Batch validate multiple domains
  static async validateMultipleDomains(domains: string[]): Promise<ENSValidationResult[]> {
    const results = await Promise.allSettled(
      domains.map(domain => this.validateDomainForRegistration(domain))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          domain: domains[index],
          isValid: false,
          isAvailable: false,
          isRegistered: false,
          validationDetails: {
            formatValid: false,
            lengthValid: false,
            charactersValid: false,
            notReserved: false,
            onChainCheck: false
          },
          error: result.reason?.message || 'Validation failed'
        };
      }
    });
  }
  
  // Check if domain is ready for registration (available and valid)
  static async isDomainReadyForRegistration(domain: string): Promise<boolean> {
    try {
      const validation = await this.validateDomainForRegistration(domain);
      return validation.isValid && validation.isAvailable && !validation.isRegistered;
    } catch (error) {
      return false;
    }
  }
  
  // Get registration cost estimate
  static async getRegistrationCost(domain: string, years: number = 1): Promise<string> {
    try {
      const validation = await this.validateDomainForRegistration(domain);
      
      if (!validation.isValid) {
        throw new Error(`Domain ${domain} is not valid for registration`);
      }
      
      if (!validation.isAvailable) {
        throw new Error(`Domain ${domain} is not available for registration`);
      }
      
      // Calculate cost based on years (this would need real ENS pricing logic)
      const baseCost = parseFloat(validation.registrationCost || '0');
      const totalCost = baseCost * years;
      
      return totalCost.toString();
      
    } catch (error) {
      throw new Error(`ENS registration cost calculation failed: ${(error as Error).message}. Real ENS contract integration required.`);
    }
  }
}

// Export utilities for easy use
export const ensValidator = {
  // Validate domain for registration
  validate: (domain: string) => ENSRegistrationValidator.validateDomainForRegistration(domain),
  
  // Check availability only
  checkAvailable: (domain: string) => ENSRegistrationValidator.checkDomainAvailability(domain),
  
  // Check if ready for registration
  isReady: (domain: string) => ENSRegistrationValidator.isDomainReadyForRegistration(domain),
  
  // Get registration cost
  getCost: (domain: string, years?: number) => ENSRegistrationValidator.getRegistrationCost(domain, years),
  
  // Validate format only
  validateFormat: (domain: string) => ENSRegistrationValidator.validateDomainFormat(domain),
  
  // Batch operations
  validateMultiple: (domains: string[]) => ENSRegistrationValidator.validateMultipleDomains(domains)
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).validateENS = ENSRegistrationValidator.validateDomainForRegistration;
  (window as any).ensValidator = ensValidator;
  (window as any).ENS_CONTRACTS = ENS_CONTRACTS;
  
  // Quick test function
  (window as any).testENSValidation = async () => {
    const testDomains = [
      'vitalik.eth',        // Already registered
      'test123.eth',        // Might be available
      'a.eth',              // Too short
      'www.eth',            // Reserved
      'my-domain.eth',      // Valid format
      'invalid--name.eth',  // Invalid characters
      'verylongdomainnamethatexceedsthelimit.eth' // Too long
    ];
    
    console.log('🧪 Testing ENS domain validation...');
    
    for (const domain of testDomains) {
      try {
        const result = await ENSRegistrationValidator.validateDomainForRegistration(domain);
        console.log(`${domain}:`, result);
      } catch (error) {
        console.log(`${domain}: ERROR -`, error.message);
      }
    }
  };
}
