/**
 * Slack OAuth Provider
 *
 * Implements OAuth 2.0 for Slack workspace integration
 * Documentation: https://api.slack.com/authentication/oauth-v2
 */

import type { OAuthProvider, OAuthTokens, AccountInfo } from "../types.js";

// Slack OAuth API response types
interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
  team?: { id: string; name: string };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

// Response from auth.test endpoint
interface SlackAuthTestResponse {
  ok: boolean;
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
  bot_id?: string;
  is_enterprise_install?: boolean;
  error?: string;
}

const SLACK_CLIENT_ID = process.env.SLACK_OAUTH_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_OAUTH_CLIENT_SECRET;

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
  console.warn(
    "Slack OAuth credentials not configured. Set SLACK_OAUTH_CLIENT_ID and SLACK_OAUTH_CLIENT_SECRET"
  );
}

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
// Use auth.test instead of users.identity - works with bot tokens
const SLACK_AUTH_TEST_URL = "https://slack.com/api/auth.test";

export const slackProvider: OAuthProvider = {
  getAuthorizationUrl(scopes: string[], state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: scopes.join(","),
      state,
      // user_scope can be added here if needed for user-level permissions
    });

    return `${SLACK_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: SLACK_CLIENT_ID!,
        client_secret: SLACK_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack token exchange failed: ${error}`);
    }

    const data = (await response.json()) as SlackTokenResponse;

    if (!data.ok) {
      throw new Error(`Slack token exchange failed: ${data.error}`);
    }

    // Slack returns bot token and user token (if user scopes requested)
    // We primarily use bot token for posting messages
    const accessToken = data.access_token || data.authed_user?.access_token;

    if (!accessToken) {
      throw new Error("Slack did not return an access token");
    }

    return {
      accessToken,
      refreshToken: data.refresh_token, // Slack may provide refresh token
      expiresIn: data.expires_in,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID!,
        client_secret: SLACK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack token refresh failed: ${error}`);
    }

    const data = (await response.json()) as SlackTokenResponse;

    if (!data.ok) {
      throw new Error(`Slack token refresh failed: ${data.error}`);
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
    // Use auth.test endpoint which works with bot tokens
    const response = await fetch(SLACK_AUTH_TEST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack auth.test failed: ${error}`);
    }

    const data = (await response.json()) as SlackAuthTestResponse;

    if (!data.ok) {
      throw new Error(`Slack auth.test failed: ${data.error}`);
    }

    return {
      id: data.user_id || data.bot_id || data.team_id || "unknown",
      name: data.team || data.user,
      username: data.user,
    };
  },
};
