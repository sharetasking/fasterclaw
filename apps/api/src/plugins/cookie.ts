import fp from "fastify-plugin";
import fastifyCookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";

export interface CookiePluginOptions {
  secret?: string;
}

export const cookiePlugin = fp(async (fastify: FastifyInstance, opts: CookiePluginOptions) => {
  await fastify.register(fastifyCookie, {
    secret: opts.secret ?? process.env.API_JWT_SECRET,
    parseOptions: {},
  });
});

export default cookiePlugin;
