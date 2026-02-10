import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export function healthRoutes(fastify: FastifyInstance): void {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check endpoint",
        response: {
          200: z.object({
            status: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    }
  );
}

export default healthRoutes;
