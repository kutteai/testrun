// PayCio Wallet - Secure Password Verification Function
// This function helps verify passwords without exposing sensitive data

exports.handler = async (event, context) => {
  // Enable CORS for Chrome extension
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, password, encryptedData, storedHash, testData } = JSON.parse(event.body);
    
    if (!action || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Action and password are required'
        })
      };
    }

    let result = {};

    switch (action) {
      case 'hash':
        // Generate password hash (for comparison)
        result = await generatePasswordHash(password);
        break;
        
      case 'verify':
        // Verify password against stored hash
        if (!storedHash) {
          throw new Error('Stored hash required for verification');
        }
        result = await verifyPasswordHash(password, storedHash);
        break;
        
      case 'test_decrypt':
        // Test if password can decrypt data (without actually decrypting)
        if (!encryptedData) {
          throw new Error('Encrypted data required for test');
        }
        result = await testDecryption(password, encryptedData);
        break;
        
      case 'diagnose':
        // Comprehensive password diagnosis
        result = await diagnosePassword(password, { storedHash, encryptedData, testData });
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Password verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Generate password hash using Web Crypto API
async function generatePasswordHash(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    hash: hashHex,
    algorithm: 'SHA-256',
    length: hashHex.length
  };
}

// Verify password against stored hash
async function verifyPasswordHash(password, storedHash) {
  const generated = await generatePasswordHash(password);
  const matches = generated.hash === storedHash;
  
  return {
    matches,
    generatedHash: generated.hash.substring(0, 20) + '...',
    storedHash: storedHash.substring(0, 20) + '...',
    algorithm: generated.algorithm
  };
}

// Test if password can decrypt data (simulation)
async function testDecryption(password, encryptedData) {
  try {
    // We can't actually decrypt here (no access to crypto libraries)
    // But we can validate the password format and encrypted data format
    
    const isValidPassword = password && password.length >= 8;
    const isValidEncryptedData = encryptedData && encryptedData.length > 0;
    
    // Basic format validation
    const hasValidFormat = isValidPassword && isValidEncryptedData;
    
    return {
      canProceed: hasValidFormat,
      passwordLength: password.length,
      encryptedDataLength: encryptedData.length,
      passwordValid: isValidPassword,
      encryptedDataValid: isValidEncryptedData,
      note: 'Actual decryption must be done locally for security'
    };
  } catch (error) {
    return {
      canProceed: false,
      error: error.message
    };
  }
}

// Comprehensive password diagnosis
async function diagnosePassword(password, data) {
  const diagnosis = {
    password: {
      provided: !!password,
      length: password?.length || 0,
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || ''),
      hasNumbers: /\d/.test(password || ''),
      hasUppercase: /[A-Z]/.test(password || ''),
      hasLowercase: /[a-z]/.test(password || '')
    },
    storage: {
      hasStoredHash: !!data.storedHash,
      storedHashLength: data.storedHash?.length || 0,
      hasEncryptedData: !!data.encryptedData,
      encryptedDataLength: data.encryptedData?.length || 0
    },
    recommendations: []
  };

  // Add recommendations
  if (!diagnosis.password.provided) {
    diagnosis.recommendations.push('Password is missing');
  }
  if (diagnosis.password.length < 8) {
    diagnosis.recommendations.push('Password should be at least 8 characters');
  }
  if (!diagnosis.storage.hasStoredHash) {
    diagnosis.recommendations.push('Password hash is missing from storage');
  }
  if (!diagnosis.storage.hasEncryptedData) {
    diagnosis.recommendations.push('Encrypted data is missing from storage');
  }

  // Test hash generation if password provided
  if (password) {
    const hashTest = await generatePasswordHash(password);
    diagnosis.hashTest = {
      generated: hashTest.hash.substring(0, 20) + '...',
      algorithm: hashTest.algorithm,
      length: hashTest.length
    };

    // Compare with stored hash if available
    if (data.storedHash) {
      const verification = await verifyPasswordHash(password, data.storedHash);
      diagnosis.verification = verification;
    }
  }

  return diagnosis;
}
