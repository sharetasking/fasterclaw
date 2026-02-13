import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyRawBody from "fastify-raw-body";

import { corsPlugin, type CorsPluginOptions } from "./plugins/cors.js";
import { cookiePlugin, type CookiePluginOptions } from "./plugins/cookie.js";
import { jwtPlugin, type JwtPluginOptions } from "./plugins/jwt.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { googleAuthRoutes } from "./routes/google-auth.js";
import { slackAuthRoutes } from "./routes/slack-auth.js";
import { instanceRoutes } from "./routes/instances.js";
import { billingRoutes } from "./routes/billing.js";
import { skillsRoutes } from "./routes/skills.js";
import { integrationsRoutes } from "./routes/integrations.js";
import { proxyRoutes } from "./routes/proxy.js";
import { mcpServersRoutes } from "./routes/mcp-servers.js";
import { proxyV2Routes } from "./routes/proxy-v2.js";

export interface CreateAppOptions {
  /** Fastify server options */
  fastify?: FastifyServerOptions;
  /** CORS plugin options */
  cors?: CorsPluginOptions;
  /** Cookie plugin options */
  cookie?: CookiePluginOptions;
  /** JWT plugin options */
  jwt?: JwtPluginOptions;
}

/**
 * Create a configured Fastify app with core plugins and routes.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const defaultFastifyOptions: FastifyServerOptions = {
    logger:
      process.env.NODE_ENV === "development"
        ? {
            level: process.env.LOG_LEVEL ?? "info",
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            },
          }
        : {
            level: process.env.LOG_LEVEL ?? "info",
          },
  };

  const app = Fastify({
    ...defaultFastifyOptions,
    ...options.fastify,
  });

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register Swagger
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "FasterClaw API",
        description: "API for FasterClaw - Deploy OpenClaw instances on Fly.io",
        version: "0.1.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  // Register plugins
  await app.register(corsPlugin, options.cors ?? {});
  await app.register(cookiePlugin, options.cookie ?? {});
  await app.register(jwtPlugin, options.jwt ?? {});

  // Register raw body plugin for Stripe webhook signature verification
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false, // Only enable for routes that explicitly request it
    encoding: false, // Return buffer instead of string
    runFirst: true, // Run before other content type parsers
  });

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  if (
    process.env.GOOGLE_CLIENT_ID !== undefined &&
    process.env.GOOGLE_CLIENT_ID !== "" &&
    process.env.GOOGLE_CLIENT_SECRET !== undefined &&
    process.env.GOOGLE_CLIENT_SECRET !== ""
  ) {
    await app.register(googleAuthRoutes);
  }
  // Slack OAuth for "Sign in with Slack"
  if (
    process.env.SLACK_OAUTH_CLIENT_ID !== undefined &&
    process.env.SLACK_OAUTH_CLIENT_ID !== "" &&
    process.env.SLACK_OAUTH_CLIENT_SECRET !== undefined &&
    process.env.SLACK_OAUTH_CLIENT_SECRET !== ""
  ) {
    await app.register(slackAuthRoutes);
  }
  await app.register(instanceRoutes);
  await app.register(billingRoutes);
  await app.register(skillsRoutes);
  await app.register(integrationsRoutes);
  await app.register(proxyRoutes);
  await app.register(mcpServersRoutes);
  await app.register(proxyV2Routes);

  return app;
}

export default createApp;
