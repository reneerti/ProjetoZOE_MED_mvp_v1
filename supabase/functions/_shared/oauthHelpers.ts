import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { encryptToken, decryptToken } from './tokenEncryption.ts';

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Refreshes an OAuth token and rotates the refresh token (OAuth 2.1)
 */
export async function refreshAndRotateToken(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  encryptedRefreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  
  // Decrypt the current refresh token
  const refreshToken = await decryptToken(encryptedRefreshToken);
  
  // Request new tokens from Google
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh OAuth token');
  }

  const tokens: TokenRefreshResponse = await tokenResponse.json();
  
  // OAuth 2.1: Google may or may not return a new refresh token
  // If no new refresh token, reuse the existing one
  const newRefreshToken = tokens.refresh_token || refreshToken;
  
  // Encrypt both tokens
  const encryptedAccessToken = await encryptToken(tokens.access_token);
  const encryptedNewRefreshToken = await encryptToken(newRefreshToken);
  
  // Update stored tokens with rotation tracking
  const { error: updateError } = await supabase
    .from('wearable_connections')
    .update({
      access_token: encryptedAccessToken,
      refresh_token: encryptedNewRefreshToken,
      token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      last_token_rotation: new Date().toISOString(),
      rotation_count: supabase.rpc('increment_rotation_count', { 
        connection_user_id: userId,
        connection_provider: provider 
      }),
      tokens_encrypted: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (updateError) {
    console.error('Failed to update rotated tokens:', updateError);
    throw new Error('Failed to store rotated tokens');
  }

  // Audit log the rotation
  await supabase.from('oauth_token_audit').insert({
    user_id: userId,
    provider: provider,
    action: 'token_rotated',
    metadata: {
      new_refresh_token_issued: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    }
  });

  console.log(`✅ Token rotated for user ${userId} (${provider})`);
  
  return {
    accessToken: tokens.access_token,
    refreshToken: newRefreshToken,
    expiresIn: tokens.expires_in
  };
}

/**
 * Revokes an OAuth token with the provider
 */
export async function revokeToken(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  encryptedToken: string
): Promise<void> {
  try {
    // Decrypt the token
    const token = await decryptToken(encryptedToken);
    
    // Revoke with Google
    const revokeResponse = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    if (!revokeResponse.ok) {
      console.warn('Token revocation failed with Google:', await revokeResponse.text());
      // Don't throw - still delete from our database
    }

    // Delete from database
    await supabase
      .from('wearable_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    // Audit log the revocation
    await supabase.from('oauth_token_audit').insert({
      user_id: userId,
      provider: provider,
      action: 'token_revoked'
    });

    console.log(`✅ Token revoked for user ${userId} (${provider})`);
  } catch (error) {
    console.error('Token revocation error:', error);
    throw error;
  }
}

/**
 * Logs token access for audit trail
 */
export async function auditTokenAccess(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  action: 'token_accessed' | 'token_stored'
): Promise<void> {
  await supabase.from('oauth_token_audit').insert({
    user_id: userId,
    provider: provider,
    action: action
  });
}
