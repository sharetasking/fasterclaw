/**
 * Test setup file
 * Configures global test utilities and mocks
 */

import { vi, beforeEach, afterEach } from "vitest";

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.API_JWT_SECRET = "test-jwt-secret-for-testing-only";
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";
process.env.STRIPE_PRICE_ID_STARTER = "price_starter_test";
process.env.STRIPE_PRICE_ID_PRO = "price_pro_test";
process.env.STRIPE_PRICE_ID_ENTERPRISE = "price_enterprise_test";
process.env.FLY_API_TOKEN = "fly_test_token";
process.env.FLY_ORG_SLUG = "test-org";
process.env.FRONTEND_URL = "http://localhost:3000";
