/**
 * OAuth Provider Types
 *
 * Defines the interface that all OAuth providers must implement.
 */

/**
 * OAuth tokens returned from token exchange
 */
export interface OAuthTokens {
  /** Access token for API requests */
  accessToken: string;

  /** Refresh token for renewing access (optional for some providers) */
  refreshToken?: string;

  /** Token expiration in seconds from now */
  expiresIn?: number;

  /** Calculated expiration timestamp */
  expiresAt?: Date;

  /** Granted scopes (may differ from requested) */
  scope?: string;
}

/**
 * Account information from OAuth provider
 */
export interface AccountInfo {
  /** Provider-specific user ID */
  id: string;

  /** User's email address (if available) */
  email?: string;

  /** User's display name */
  name?: string;

  /** Username or handle */
  username?: string;
}

/**
 * OAuth Provider interface
 * All OAuth providers must implement these methods
 */
export interface OAuthProvider {
  /**
   * Get the OAuth authorization URL
   * @param scopes - OAuth scopes to request
   * @param state - CSRF protection state token
   * @param redirectUri - Callback URL after authorization
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(
    scopes: string[],
    state: string,
    redirectUri: string
  ): string;

  /**
   * Exchange authorization code for access tokens
   * @param code - Authorization code from callback
   * @param redirectUri - Same redirect URI used in authorization
   * @returns OAuth tokens
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token
   * @param refreshToken - Refresh token from previous exchange
   * @returns New OAuth tokens
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get account information using access token
   * @param accessToken - Valid access token
   * @returns User account information
   */
  getAccountInfo(accessToken: string): Promise<AccountInfo>;
}
