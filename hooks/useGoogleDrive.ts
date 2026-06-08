import { useState, useEffect, useCallback, useRef } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'google-drive' });
const TOKEN_KEY = '@gd_access_token';
const EXPIRY_KEY = '@gd_token_expiry';
const REFRESH_KEY = '@gd_refresh_token';

let cachedToken: string | null = storage.getString(TOKEN_KEY) || null;

export function useGoogleDrive(clientId?: string) {
  const [isConnected, setIsConnected] = useState(!!cachedToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(cachedToken);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId || '',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { accessToken, refreshToken } = response.params;
      if (accessToken) {
        cachedToken = accessToken;
        tokenRef.current = accessToken;
        storage.set(TOKEN_KEY, accessToken);
        if (refreshToken) {
          storage.set(REFRESH_KEY, refreshToken);
        }
        const expiry = Date.now() + 3600 * 1000;
        storage.set(EXPIRY_KEY, String(expiry));
        setIsConnected(true);
        setError(null);
      }
    } else if (response?.type === 'error') {
      setError(response.params?.error || 'Authentication failed');
    }
  }, [response]);

  useEffect(() => {
    setIsConnected(!!cachedToken);
  }, []);

  const signIn = useCallback(async () => {
    if (!clientId) {
      setError('Google Drive client ID not configured. Add it in Settings > Backup & Restore.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') {
        setError('Sign in was cancelled or failed.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }, [clientId, promptAsync]);

  const signOut = useCallback(() => {
    cachedToken = null;
    tokenRef.current = null;
    storage.delete(TOKEN_KEY);
    storage.delete(EXPIRY_KEY);
    storage.delete(REFRESH_KEY);
    setIsConnected(false);
    setError(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = storage.getString(REFRESH_KEY);
    if (!refreshToken || !clientId) return null;
    try {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        { clientId, code: refreshToken, redirectUri, extraParams: {} },
        { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
      );
      if (tokenResult.accessToken) {
        cachedToken = tokenResult.accessToken;
        tokenRef.current = tokenResult.accessToken;
        storage.set(TOKEN_KEY, tokenResult.accessToken);
        const expiry = Date.now() + (tokenResult.expiresIn || 3600) * 1000;
        storage.set(EXPIRY_KEY, String(expiry));
        return tokenResult.accessToken;
      }
    } catch (e) {
      console.warn('[useGoogleDrive] Token refresh failed:', e);
    }
    return null;
  }, [clientId, redirectUri]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const expiryStr = storage.getString(EXPIRY_KEY);
    if (expiryStr && Date.now() > parseInt(expiryStr, 10)) {
      const refreshToken = storage.getString(REFRESH_KEY);
      if (refreshToken) {
        return await refreshAccessToken();
      }
      signOut();
      return null;
    }
    return tokenRef.current;
  }, [signOut, refreshAccessToken]);

  return {
    isConnected,
    loading,
    error,
    request,
    signIn,
    signOut,
    promptAsync,
    getAccessToken,
  };
}
