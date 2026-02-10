import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface JwtPluginOptions {
  secret?: string;
}

export const jwtPlugin = fp(async (fastify: FastifyInstance, opts: JwtPluginOptions) => {
  const secret = opts.secret ?? process.env.API_JWT_SECRET;

  if (secret === undefined || secret === "") {
    throw new Error("API_JWT_SECRET environment variable is required");
  }

  await fastify.register(fastifyJwt, {
    secret,
  });

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      // Map JWT payload to user object
      const payload = request.user as unknown as {
        sub: string;
        email: string;
        name: string | null;
      };
      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch {
      void reply.code(401).send({ error: "Unauthorized" });
    }
  });
});

export default jwtPlugin;
