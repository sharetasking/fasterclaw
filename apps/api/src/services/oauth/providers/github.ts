/**
 * GitHub OAuth Provider
 *
 * Implements OAuth 2.0 for GitHub
 * Documentation: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */

import type { OAuthProvider, OAuthTokens, AccountInfo } from "../types.js";

// GitHub OAuth API response types
interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

const GITHUB_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.warn(
    "GitHub OAuth credentials not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET"
  );
}

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export const githubProvider: OAuthProvider = {
  getAuthorizationUrl(scopes: string[], state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state,
    });

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID!,
        client_secret: GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub token exchange failed: ${error}`);
    }

    const data = (await response.json()) as GitHubTokenResponse & {
      error?: string;
      error_description?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (data.error) {
      throw new Error(`GitHub token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // GitHub may provide refresh token
      expiresIn: data.expires_in,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID!,
        client_secret: GITHUB_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub token refresh failed: ${error}`);
    }

    const data = (await response.json()) as GitHubTokenResponse & {
      error?: string;
      error_description?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (data.error) {
      throw new Error(`GitHub token refresh failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope,
    };
  },

  async getAccountInfo(accessToken: string): Promise<AccountInfo> {
    const response = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub userinfo failed: ${error}`);
    }

    const data = (await response.json()) as GitHubUserInfo;

    return {
      id: String(data.id),
      email: data.email,
      name: data.name || data.login,
      username: data.login,
    };
  },
};
