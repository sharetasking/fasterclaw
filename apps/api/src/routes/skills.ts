/**
 * Skills API Routes
 *
 * Endpoints for managing skills - the instruction documents that teach
 * OpenClaw agents domain-specific knowledge.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import {
  SkillSchema,
  SkillListSchema,
  UserSkillListSchema,
  InstanceSkillListSchema,
  AddUserSkillRequestSchema,
  EnableInstanceSkillRequestSchema,
  SkillIdParamSchema,
  ApiErrorSchema,
  ApiSuccessSchema,
} from "@fasterclaw/shared";

export async function skillsRoutes(app: FastifyInstance) {
  // ============================================================================
  // GET /skills - List all available skills (marketplace)
  // ============================================================================

  app.get(
    "/skills",
    {
      schema: {
        tags: ["Skills"],
        summary: "List all available skills",
        description: "Get all skills available in the marketplace",
        response: {
          200: SkillListSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        const skills = await prisma.skill.findMany({
          orderBy: [{ isOfficial: "desc" }, { name: "asc" }],
        });

        // Convert Date objects to ISO strings for Zod validation
        return skills.map((skill) => ({
          ...skill,
          createdAt: skill.createdAt.toISOString(),
          updatedAt: skill.updatedAt.toISOString(),
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch skills",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /skills/:skillId - Get skill details
  // ============================================================================

  app.get(
    "/skills/:skillId",
    {
      schema: {
        tags: ["Skills"],
        summary: "Get skill details",
        description: "Get detailed information about a specific skill",
        params: SkillIdParamSchema,
        response: {
          200: SkillSchema,
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { skillId } = request.params as { skillId: string };

        const skill = await prisma.skill.findUnique({
          where: { id: skillId },
        });

        if (!skill) {
          return reply.status(404).send({
            error: "Skill not found",
            message: `No skill found with ID: ${skillId}`,
          });
        }

        return {
          ...skill,
          createdAt: skill.createdAt.toISOString(),
          updatedAt: skill.updatedAt.toISOString(),
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /skills/user - List user's added skills
  // ============================================================================

  app.get(
    "/skills/user",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills"],
        summary: "List user's skills",
        description: "Get all skills the current user has added to their library",
        response: {
          200: UserSkillListSchema,
          401: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        // Get user ID from JWT (set by auth middleware)
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const userSkills = await prisma.userSkill.findMany({
          where: { userId },
          include: { skill: true },
          orderBy: { addedAt: "desc" },
        });

        return userSkills.map((us) => ({
          ...us,
          addedAt: us.addedAt.toISOString(),
          skill: {
            ...us.skill,
            createdAt: us.skill.createdAt.toISOString(),
            updatedAt: us.skill.updatedAt.toISOString(),
          },
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch user skills",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // POST /skills/user - Add skill to user's library
  // ============================================================================

  app.post(
    "/skills/user",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills"],
        summary: "Add skill to user library",
        description: "Add a skill to the current user's library",
        body: AddUserSkillRequestSchema,
        response: {
          201: ApiSuccessSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
          409: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const { skillId } = request.body as { skillId: string };

        // Check if skill exists
        const skill = await prisma.skill.findUnique({
          where: { id: skillId },
        });

        if (!skill) {
          return reply.status(404).send({
            error: "Skill not found",
            message: `No skill found with ID: ${skillId}`,
          });
        }

        // Check if already added
        const existing = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId,
              skillId,
            },
          },
        });

        if (existing) {
          return reply.status(409).send({
            error: "Skill already added",
            message: "This skill is already in your library",
          });
        }

        // Add skill to user's library
        await prisma.userSkill.create({
          data: {
            userId,
            skillId,
          },
        });

        return reply.status(201).send({
          success: true,
          message: `Added ${skill.name} to your library`,
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to add skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // DELETE /skills/user/:skillId - Remove skill from user's library
  // ============================================================================

  app.delete(
    "/skills/user/:skillId",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills"],
        summary: "Remove skill from user library",
        description: "Remove a skill from the current user's library",
        params: SkillIdParamSchema,
        response: {
          200: ApiSuccessSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const { skillId } = request.params as { skillId: string };

        // Check if user has this skill
        const userSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId,
              skillId,
            },
          },
          include: { skill: true },
        });

        if (!userSkill) {
          return reply.status(404).send({
            error: "Skill not found",
            message: "This skill is not in your library",
          });
        }

        // Delete the user skill
        await prisma.userSkill.delete({
          where: {
            userId_skillId: {
              userId,
              skillId,
            },
          },
        });

        return {
          success: true,
          message: `Removed ${userSkill.skill.name} from your library`,
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to remove skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /instances/:instanceId/skills - List instance's enabled skills
  // ============================================================================

  app.get(
    "/instances/:instanceId/skills",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills", "Instances"],
        summary: "List instance skills",
        description: "Get all skills enabled for a specific instance",
        params: z.object({ instanceId: z.string().cuid() }),
        response: {
          200: InstanceSkillListSchema,
          401: ApiErrorSchema,
          403: ApiErrorSchema,
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const { instanceId } = request.params as { instanceId: string };

        // Check if instance exists and belongs to user
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
        });

        if (!instance) {
          return reply.status(404).send({
            error: "Instance not found",
            message: `No instance found with ID: ${instanceId}`,
          });
        }

        if (instance.userId !== userId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You don't have access to this instance",
          });
        }

        // Get instance skills
        const instanceSkills = await prisma.instanceSkill.findMany({
          where: { instanceId },
          include: { skill: true },
          orderBy: { enabledAt: "desc" },
        });

        return instanceSkills.map((is) => ({
          ...is,
          enabledAt: is.enabledAt.toISOString(),
          skill: {
            ...is.skill,
            createdAt: is.skill.createdAt.toISOString(),
            updatedAt: is.skill.updatedAt.toISOString(),
          },
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch instance skills",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // POST /instances/:instanceId/skills - Enable skill for instance
  // ============================================================================

  app.post(
    "/instances/:instanceId/skills",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills", "Instances"],
        summary: "Enable skill for instance",
        description: "Enable a skill for a specific instance",
        params: z.object({ instanceId: z.string().cuid() }),
        body: EnableInstanceSkillRequestSchema,
        response: {
          201: ApiSuccessSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          403: ApiErrorSchema,
          404: ApiErrorSchema,
          409: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const { instanceId } = request.params as { instanceId: string };
        const { skillId } = request.body as { skillId: string };

        // Check if instance exists and belongs to user
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
        });

        if (!instance) {
          return reply.status(404).send({
            error: "Instance not found",
            message: `No instance found with ID: ${instanceId}`,
          });
        }

        if (instance.userId !== userId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You don't have access to this instance",
          });
        }

        // Check if user has this skill in their library
        const userSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId,
              skillId,
            },
          },
          include: { skill: true },
        });

        if (!userSkill) {
          return reply.status(404).send({
            error: "Skill not found",
            message: "Add this skill to your library first",
          });
        }

        // Check if already enabled for instance
        const existing = await prisma.instanceSkill.findUnique({
          where: {
            instanceId_skillId: {
              instanceId,
              skillId,
            },
          },
        });

        if (existing) {
          return reply.status(409).send({
            error: "Skill already enabled",
            message: "This skill is already enabled for this instance",
          });
        }

        // Enable skill for instance
        await prisma.instanceSkill.create({
          data: {
            instanceId,
            skillId,
          },
        });

        return reply.status(201).send({
          success: true,
          message: `Enabled ${userSkill.skill.name} for instance. Restart instance to apply changes.`,
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to enable skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // DELETE /instances/:instanceId/skills/:skillId - Disable skill for instance
  // ============================================================================

  app.delete(
    "/instances/:instanceId/skills/:skillId",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Skills", "Instances"],
        summary: "Disable skill for instance",
        description: "Disable a skill for a specific instance",
        params: z.object({
          instanceId: z.string().cuid(),
          skillId: z.string().cuid(),
        }),
        response: {
          200: ApiSuccessSchema,
          401: ApiErrorSchema,
          403: ApiErrorSchema,
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        const { instanceId, skillId } = request.params as {
          instanceId: string;
          skillId: string;
        };

        // Check if instance exists and belongs to user
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
        });

        if (!instance) {
          return reply.status(404).send({
            error: "Instance not found",
            message: `No instance found with ID: ${instanceId}`,
          });
        }

        if (instance.userId !== userId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You don't have access to this instance",
          });
        }

        // Check if skill is enabled for instance
        const instanceSkill = await prisma.instanceSkill.findUnique({
          where: {
            instanceId_skillId: {
              instanceId,
              skillId,
            },
          },
          include: { skill: true },
        });

        if (!instanceSkill) {
          return reply.status(404).send({
            error: "Skill not found",
            message: "This skill is not enabled for this instance",
          });
        }

        // Disable skill
        await prisma.instanceSkill.delete({
          where: {
            instanceId_skillId: {
              instanceId,
              skillId,
            },
          },
        });

        return {
          success: true,
          message: `Disabled ${instanceSkill.skill.name} for instance. Restart instance to apply changes.`,
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to disable skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
