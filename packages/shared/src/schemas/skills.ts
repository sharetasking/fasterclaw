import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Skill Schemas
// ============================================================================

export const SkillSchema = z
  .object({
    id: z.string().cuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    iconUrl: z.string().nullable(),
    markdownContent: z.string(),
    requiresBins: z.array(z.string()),
    requiresEnvVars: z.array(z.string()),
    compatibleOs: z.array(z.string()),
    isOfficial: z.boolean(),
    version: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Skill");

export const UserSkillSchema = z
  .object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    skillId: z.string().cuid(),
    skill: SkillSchema,
    addedAt: z.string().datetime(),
  })
  .openapi("UserSkill");

export const InstanceSkillSchema = z
  .object({
    id: z.string().cuid(),
    instanceId: z.string().cuid(),
    skillId: z.string().cuid(),
    skill: SkillSchema,
    enabledAt: z.string().datetime(),
  })
  .openapi("InstanceSkill");

// ============================================================================
// Request Schemas
// ============================================================================

export const AddUserSkillRequestSchema = z
  .object({
    skillId: z.string().cuid(),
  })
  .openapi("AddUserSkillRequest");

export const EnableInstanceSkillRequestSchema = z
  .object({
    skillId: z.string().cuid(),
  })
  .openapi("EnableInstanceSkillRequest");

export const SkillIdParamSchema = z
  .object({
    skillId: z.string().cuid(),
  })
  .openapi("SkillIdParam");

// ============================================================================
// Response Schemas
// ============================================================================

export const SkillListSchema = z.array(SkillSchema).openapi("SkillList");

export const UserSkillListSchema = z
  .array(UserSkillSchema)
  .openapi("UserSkillList");

export const InstanceSkillListSchema = z
  .array(InstanceSkillSchema)
  .openapi("InstanceSkillList");

// ============================================================================
// Type Exports
// ============================================================================

export type Skill = z.infer<typeof SkillSchema>;
export type UserSkill = z.infer<typeof UserSkillSchema>;
export type InstanceSkill = z.infer<typeof InstanceSkillSchema>;
export type AddUserSkillRequest = z.infer<typeof AddUserSkillRequestSchema>;
export type EnableInstanceSkillRequest = z.infer<
  typeof EnableInstanceSkillRequestSchema
>;
export type SkillIdParam = z.infer<typeof SkillIdParamSchema>;
export type SkillList = z.infer<typeof SkillListSchema>;
export type UserSkillList = z.infer<typeof UserSkillListSchema>;
export type InstanceSkillList = z.infer<typeof InstanceSkillListSchema>;
