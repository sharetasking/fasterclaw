/**
 * Google OAuth Provider
 *
 * Implements OAuth 2.0 for Google Workspace (Gmail, Calendar, Drive)
 * Documentation: https://developers.google.com/identity/protocols/oauth2
 */

import type { OAuthProvider, OAuthTokens, AccountInfo } from "../types.js";

// Google OAuth API response types
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email?: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "Google OAuth credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET"
  );
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const googleProvider: OAuthProvider = {
  getAuthorizationUrl(scopes: string[], state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      access_type: "offline", // Request refresh token
      prompt: "consent", // Force consent screen to get refresh token
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh failed: ${error}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't return new refresh token
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google userinfo failed: ${error}`);
    }

    const data = (await response.json()) as GoogleUserInfo;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      username: data.email?.split("@")[0],
    };
  },
};
