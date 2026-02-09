import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export interface CorsPluginOptions {
  origin?: string | string[] | ((origin: string | undefined) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}

/**
 * Check if an origin is allowed for CORS
 * Allows:
 * - Main frontend URL (from env)
 * - fasterclaw.com subdomains (*.fasterclaw.com)
 * - Localhost only in development mode
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  // Remove trailing slash for comparison
  const normalizedOrigin = origin.replace(/\/$/, '');

  // Get frontend URL from env (remove trailing slash)
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';

  // Allow the main frontend URL
  if (frontendUrl && normalizedOrigin === frontendUrl) return true;

  // Allow localhost only in development mode
  if (process.env.NODE_ENV !== 'production' && normalizedOrigin.startsWith('http://localhost:')) return true;

  // Allow fasterclaw.com subdomains
  // Pattern: https://*.fasterclaw.com
  const fasterclawPattern = /^https:\/\/[a-z0-9-]+\.fasterclaw\.com$/;
  if (fasterclawPattern.test(normalizedOrigin)) return true;

  // Allow main domain
  if (normalizedOrigin === 'https://fasterclaw.com') return true;

  return false;
}

export const corsPlugin = fp(async (fastify: FastifyInstance, opts: CorsPluginOptions = {}) => {
  // Use custom origin function if not explicitly provided
  const originOption = opts.origin ?? ((origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
    callback(null, isAllowedOrigin(origin));
  });

  await fastify.register(cors, {
    origin: originOption,
    credentials: opts.credentials ?? true,
    methods: opts.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: opts.allowedHeaders ?? ['Content-Type', 'Authorization'],
  });
});

export default corsPlugin;
