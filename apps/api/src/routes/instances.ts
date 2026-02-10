import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
} from "../services/fly.js";
import {
  CreateInstanceRequestSchema,
  InstanceSchema,
  InstanceListSchema,
  ApiErrorSchema,
  ApiSuccessSchema,
} from "@fasterclaw/shared";

export function instanceRoutes(fastify: FastifyInstance): void {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /instances - Create a new instance
  app.post(
    "/instances",
    {
      schema: {
        tags: ["Instances"],
        summary: "Create a new OpenClaw instance",
        body: CreateInstanceRequestSchema,
        response: {
          201: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { name, region } = request.body;

      // Generate unique Fly app name
      const flyAppName = `openclaw-${userId.slice(0, 8)}-${String(Date.now())}`.toLowerCase();

      try {
        // Create instance record first
        const instance = await prisma.instance.create({
          data: {
            userId,
            name,
            flyAppName,
            region,
            status: "CREATING",
          },
        });

        // Create Fly app and machine in background
        void (async () => {
          try {
            await createApp(flyAppName);
            const machine = await createMachine(flyAppName, {
              region,
              config: {
                image: "ghcr.io/openclaw/openclaw:latest",
                services: [
                  {
                    ports: [
                      {
                        port: 80,
                        handlers: ["http"],
                      },
                      {
                        port: 443,
                        handlers: ["tls", "http"],
                      },
                    ],
                    protocol: "tcp",
                    internal_port: 8080,
                  },
                ],
              },
            });

            await prisma.instance.update({
              where: { id: instance.id },
              data: {
                flyMachineId: machine.id,
                ipAddress: machine.private_ip,
                status: "RUNNING",
              },
            });
          } catch (error: unknown) {
            app.log.error(error, "Failed to create Fly machine");
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: "FAILED" },
            });
          }
        })();

        return await reply.code(201).send({
          ...instance,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: "Failed to create instance" });
      }
    }
  );

  // GET /instances - List user's instances
  app.get(
    "/instances",
    {
      schema: {
        tags: ["Instances"],
        summary: "List all instances for the authenticated user",
        response: {
          200: InstanceListSchema,
          401: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const instances = await prisma.instance.findMany({
        where: {
          userId,
          status: { not: "DELETED" },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(
        instances.map((instance) => ({
          ...instance,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        }))
      );
    }
  );

  // GET /instances/:id - Get instance by ID
  app.get(
    "/instances/:id",
    {
      schema: {
        tags: ["Instances"],
        summary: "Get an instance by ID",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      return reply.send({
        ...instance,
        createdAt: instance.createdAt.toISOString(),
        updatedAt: instance.updatedAt.toISOString(),
      });
    }
  );

  // POST /instances/:id/start - Start an instance
  app.post(
    "/instances/:id/start",
    {
      schema: {
        tags: ["Instances"],
        summary: "Start a stopped instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      if (instance.status !== "STOPPED") {
        return reply.code(400).send({ error: "Instance is not stopped" });
      }

      if (
        instance.flyMachineId === null ||
        instance.flyMachineId === "" ||
        instance.flyAppName === null ||
        instance.flyAppName === ""
      ) {
        return reply.code(400).send({ error: "No machine ID or app name found" });
      }

      try {
        await startMachine(instance.flyAppName, instance.flyMachineId);

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "RUNNING" },
        });

        return await reply.send({
          ...updatedInstance,
          createdAt: updatedInstance.createdAt.toISOString(),
          updatedAt: updatedInstance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: "Failed to start instance" });
      }
    }
  );

  // POST /instances/:id/stop - Stop an instance
  app.post(
    "/instances/:id/stop",
    {
      schema: {
        tags: ["Instances"],
        summary: "Stop a running instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      if (instance.status !== "RUNNING") {
        return reply.code(400).send({ error: "Instance is not running" });
      }

      if (
        instance.flyMachineId === null ||
        instance.flyMachineId === "" ||
        instance.flyAppName === null ||
        instance.flyAppName === ""
      ) {
        return reply.code(400).send({ error: "No machine ID or app name found" });
      }

      try {
        await stopMachine(instance.flyAppName, instance.flyMachineId);

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "STOPPED" },
        });

        return await reply.send({
          ...updatedInstance,
          createdAt: updatedInstance.createdAt.toISOString(),
          updatedAt: updatedInstance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: "Failed to stop instance" });
      }
    }
  );

  // DELETE /instances/:id - Delete an instance
  app.delete(
    "/instances/:id",
    {
      schema: {
        tags: ["Instances"],
        summary: "Delete an instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: ApiSuccessSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      try {
        // Delete Fly machine and app if they exist
        if (instance.flyAppName !== null && instance.flyAppName !== "") {
          if (instance.flyMachineId !== null && instance.flyMachineId !== "") {
            await deleteMachine(instance.flyAppName, instance.flyMachineId);
          }
          await deleteApp(instance.flyAppName);
        }

        // Mark instance as deleted
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "DELETED" },
        });

        return await reply.send({ success: true });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: "Failed to delete instance" });
      }
    }
  );
}

export default instanceRoutes;
