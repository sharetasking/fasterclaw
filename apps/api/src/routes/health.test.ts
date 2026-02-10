import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { healthRoutes } from "./health.js";

describe("Health Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(healthRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("should return health check status with 200", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("status", "ok");
      expect(body).toHaveProperty("timestamp");
      expect(typeof body.timestamp).toBe("string");
      expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    });

    it("should return valid ISO timestamp", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      const body = JSON.parse(response.body);
      const timestamp = new Date(body.timestamp);
      const now = new Date();

      // Timestamp should be within 1 second of now
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(1000);
    });

    it("should have correct content type", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });
});
