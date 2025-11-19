/**
 * OAuth Token Encryption Utilities
 * Implements AES-256-GCM encryption for OAuth tokens at application level
 */

// Generate encryption key from environment variable
function getEncryptionKey(): Uint8Array {
  const keyString = Deno.env.get('OAUTH_ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('OAUTH_ENCRYPTION_KEY not configured');
  }
  
  // Convert base64 key to bytes
  const binaryString = atob(keyString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts an OAuth token using AES-256-GCM
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const key = getEncryptionKey();
    
    // Generate random IV (96 bits for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt the token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts an encrypted OAuth token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = getEncryptionKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encryptedData
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Validates that encryption is properly configured
 */
export function validateEncryptionSetup(): boolean {
  const key = Deno.env.get('OAUTH_ENCRYPTION_KEY');
  if (!key) {
    console.error('OAUTH_ENCRYPTION_KEY not configured');
    return false;
  }
  
  // Validate key is valid base64 and correct length (32 bytes for AES-256)
  try {
    const decoded = atob(key);
    if (decoded.length !== 32) {
      console.error('OAUTH_ENCRYPTION_KEY must be 32 bytes (256 bits)');
      return false;
    }
    return true;
  } catch {
    console.error('OAUTH_ENCRYPTION_KEY is not valid base64');
    return false;
  }
}
