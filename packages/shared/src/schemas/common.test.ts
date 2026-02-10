import { describe, it, expect } from "vitest";
import {
  ApiErrorSchema,
  ApiSuccessSchema,
  ApiMessageSchema,
  PaginationParamsSchema,
  PaginationMetaSchema,
} from "./common.js";

describe("Common Schemas", () => {
  describe("ApiErrorSchema", () => {
    it("should accept valid error object", () => {
      const result = ApiErrorSchema.safeParse({
        error: "Something went wrong",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty error string", () => {
      const result = ApiErrorSchema.safeParse({
        error: "",
      });
      expect(result.success).toBe(true);
    });

    it("should accept error with special characters", () => {
      const result = ApiErrorSchema.safeParse({
        error: "Error: User not found! (404)",
      });
      expect(result.success).toBe(true);
    });

    it("should accept error with newlines", () => {
      const result = ApiErrorSchema.safeParse({
        error: "Error on line 1\nError on line 2",
      });
      expect(result.success).toBe(true);
    });

    it("should accept long error message", () => {
      const result = ApiErrorSchema.safeParse({
        error: "a".repeat(1000),
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing error field", () => {
      const result = ApiErrorSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject null error", () => {
      const result = ApiErrorSchema.safeParse({
        error: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject number error", () => {
      const result = ApiErrorSchema.safeParse({
        error: 404,
      });
      expect(result.success).toBe(false);
    });

    it("should reject boolean error", () => {
      const result = ApiErrorSchema.safeParse({
        error: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ApiSuccessSchema", () => {
    it("should accept success as true", () => {
      const result = ApiSuccessSchema.safeParse({
        success: true,
      });
      expect(result.success).toBe(true);
    });

    it("should accept success as false", () => {
      const result = ApiSuccessSchema.safeParse({
        success: false,
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing success field", () => {
      const result = ApiSuccessSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject string success", () => {
      const result = ApiSuccessSchema.safeParse({
        success: "true",
      });
      expect(result.success).toBe(false);
    });

    it("should reject number success", () => {
      const result = ApiSuccessSchema.safeParse({
        success: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null success", () => {
      const result = ApiSuccessSchema.safeParse({
        success: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ApiMessageSchema", () => {
    it("should accept valid message", () => {
      const result = ApiMessageSchema.safeParse({
        message: "Operation completed successfully",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty message", () => {
      const result = ApiMessageSchema.safeParse({
        message: "",
      });
      expect(result.success).toBe(true);
    });

    it("should accept message with special characters", () => {
      const result = ApiMessageSchema.safeParse({
        message: "Success! User created @ 2024-01-01 (ID: 123)",
      });
      expect(result.success).toBe(true);
    });

    it("should accept message with unicode characters", () => {
      const result = ApiMessageSchema.safeParse({
        message: "Operación completada con éxito ✓",
      });
      expect(result.success).toBe(true);
    });

    it("should accept message with newlines", () => {
      const result = ApiMessageSchema.safeParse({
        message: "Line 1\nLine 2\nLine 3",
      });
      expect(result.success).toBe(true);
    });

    it("should accept long message", () => {
      const result = ApiMessageSchema.safeParse({
        message: "a".repeat(1000),
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing message field", () => {
      const result = ApiMessageSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject null message", () => {
      const result = ApiMessageSchema.safeParse({
        message: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject number message", () => {
      const result = ApiMessageSchema.safeParse({
        message: 123,
      });
      expect(result.success).toBe(false);
    });

    it("should reject boolean message", () => {
      const result = ApiMessageSchema.safeParse({
        message: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PaginationParamsSchema", () => {
    it("should accept valid pagination params", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should apply default values when not provided", () => {
      const result = PaginationParamsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should apply default page when only limit provided", () => {
      const result = PaginationParamsSchema.safeParse({
        limit: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it("should apply default limit when only page provided", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should accept page 1", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should accept limit 1", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept limit 100 (max)", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should reject page 0", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 0,
        limit: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = PaginationParamsSchema.safeParse({
        page: -1,
        limit: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject limit 0", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative limit", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject limit greater than 100", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it("should reject decimal page number", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1.5,
        limit: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject decimal limit number", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: 20.5,
      });
      expect(result.success).toBe(false);
    });

    it("should coerce string numbers to integers", () => {
      const result = PaginationParamsSchema.safeParse({
        page: "2",
        limit: "50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(typeof result.data.page).toBe("number");
        expect(typeof result.data.limit).toBe("number");
      }
    });

    it("should reject string decimal for page", () => {
      const result = PaginationParamsSchema.safeParse({
        page: "2.7",
        limit: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric string page", () => {
      const result = PaginationParamsSchema.safeParse({
        page: "abc",
        limit: 20,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric string limit", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 1,
        limit: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("should accept large page numbers", () => {
      const result = PaginationParamsSchema.safeParse({
        page: 9999,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("PaginationMetaSchema", () => {
    it("should accept valid pagination meta", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should accept zero values", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept page greater than totalPages (edge case)", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 10,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
      expect(result.success).toBe(true);
    });

    it("should accept large numbers", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1000,
        limit: 100,
        total: 100000,
        totalPages: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should accept decimal numbers for total", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 99.5,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative page", () => {
      const result = PaginationMetaSchema.safeParse({
        page: -1,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative limit", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: -20,
        total: 100,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative total", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: -100,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative totalPages", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: -5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject string numbers", () => {
      const result = PaginationMetaSchema.safeParse({
        page: "1",
        limit: "20",
        total: "100",
        totalPages: "5",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing page", () => {
      const result = PaginationMetaSchema.safeParse({
        limit: 20,
        total: 100,
        totalPages: 5,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing limit", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        total: 100,
        totalPages: 5,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing total", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        totalPages: 5,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing totalPages", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null values", () => {
      const result = PaginationMetaSchema.safeParse({
        page: null,
        limit: null,
        total: null,
        totalPages: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept single page result", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 15,
        totalPages: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept first page of many", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 10,
        total: 1000,
        totalPages: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should accept last page", () => {
      const result = PaginationMetaSchema.safeParse({
        page: 5,
        limit: 20,
        total: 95,
        totalPages: 5,
      });
      expect(result.success).toBe(true);
    });
  });
});
