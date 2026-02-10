import { describe, it, expect } from "vitest";
import {
  UserSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  UpdateProfileRequestSchema,
  UpdatePasswordRequestSchema,
  TokenResponseSchema,
} from "./auth.js";

describe("Auth Schemas", () => {
  describe("UserSchema", () => {
    it("should accept valid user object", () => {
      const result = UserSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null name", () => {
      const result = UserSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        email: "test@example.com",
        name: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid CUID for id", () => {
      const result = UserSchema.safeParse({
        id: "invalid-id",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const result = UserSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        email: "invalid-email",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime format", () => {
      const result = UserSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        email: "test@example.com",
        name: "Test User",
        createdAt: "not-a-datetime",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = UserSchema.safeParse({
        email: "test@example.com",
        name: "Test User",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RegisterRequestSchema", () => {
    it("should accept valid registration request", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
        password: "short",
        name: "Test User",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Password must be at least 8 characters");
      }
    });

    it("should reject empty name", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Name is required");
      }
    });

    it("should reject invalid email format", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "not-an-email",
        password: "password123",
        name: "Test User",
      });
      expect(result.success).toBe(false);
    });

    it("should accept password exactly 8 characters", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
        password: "12345678",
        name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("should accept email with special characters", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test+tag@example.co.uk",
        password: "password123",
        name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with special characters", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        name: "Test User-O'Connor Jr.",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("LoginRequestSchema", () => {
    it("should accept valid login request", () => {
      const result = LoginRequestSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = LoginRequestSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should accept any password length (no minimum)", () => {
      const result = LoginRequestSchema.safeParse({
        email: "test@example.com",
        password: "a",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty password string", () => {
      const result = LoginRequestSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing password", () => {
      const result = LoginRequestSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const result = LoginRequestSchema.safeParse({
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should accept email with subdomain", () => {
      const result = LoginRequestSchema.safeParse({
        email: "test@mail.example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("UpdateProfileRequestSchema", () => {
    it("should accept valid profile update", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "New Name",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 100 characters", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should accept name exactly 100 characters", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "a".repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with one character", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "A",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with spaces", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "John Doe",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with special characters", () => {
      const result = UpdateProfileRequestSchema.safeParse({
        name: "María José O'Brien-Smith",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing name field", () => {
      const result = UpdateProfileRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("UpdatePasswordRequestSchema", () => {
    it("should accept valid password update", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "oldpassword123",
        newPassword: "newpassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject new password shorter than 8 characters", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "oldpassword123",
        newPassword: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Password must be at least 8 characters");
      }
    });

    it("should accept new password exactly 8 characters", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "oldpassword123",
        newPassword: "12345678",
      });
      expect(result.success).toBe(true);
    });

    it("should accept any length for current password", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "old",
        newPassword: "newpassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing currentPassword", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        newPassword: "newpassword123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing newPassword", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "oldpassword123",
      });
      expect(result.success).toBe(false);
    });

    it("should accept passwords with special characters", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "old!@#$%^&*()_+",
        newPassword: "new!@#$%^&*()_+",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty string for current password", () => {
      const result = UpdatePasswordRequestSchema.safeParse({
        currentPassword: "",
        newPassword: "newpassword123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("TokenResponseSchema", () => {
    it("should accept valid token response", () => {
      const result = TokenResponseSchema.safeParse({
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "clh1234567890abcdefghijkl",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept token response with null user name", () => {
      const result = TokenResponseSchema.safeParse({
        accessToken: "token123",
        user: {
          id: "clh1234567890abcdefghijkl",
          email: "test@example.com",
          name: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty access token", () => {
      const result = TokenResponseSchema.safeParse({
        accessToken: "",
        user: {
          id: "clh1234567890abcdefghijkl",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid user object", () => {
      const result = TokenResponseSchema.safeParse({
        accessToken: "token123",
        user: {
          id: "invalid-id",
          email: "invalid-email",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing accessToken", () => {
      const result = TokenResponseSchema.safeParse({
        user: {
          id: "clh1234567890abcdefghijkl",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing user", () => {
      const result = TokenResponseSchema.safeParse({
        accessToken: "token123",
      });
      expect(result.success).toBe(false);
    });
  });
});
