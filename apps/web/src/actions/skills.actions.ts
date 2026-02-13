"use server";

import {
  getSkills as getSkillsApi,
  getSkillsBySkillId,
  getSkillsUser,
  postSkillsUser,
  deleteSkillsUserBySkillId,
  getInstancesByInstanceIdSkills,
  postInstancesByInstanceIdSkills,
  deleteInstancesByInstanceIdSkillsBySkillId,
  type Skill,
  type UserSkill,
  type InstanceSkill,
  type AddUserSkillRequest,
  type EnableInstanceSkillRequest,
} from "@fasterclaw/api-client";
import { createAuthenticatedClient } from "@/lib/api-client";

// NOTE: Types are NOT re-exported from Server Actions files.
// Import types directly from @fasterclaw/api-client instead.

/**
 * Result type for actions that may fail.
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object" && "error" in error) {
    return String((error as { error: unknown }).error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Get all available skills from the marketplace
 */
export async function getSkills(): Promise<Skill[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getSkillsApi({ client });

    if (error !== undefined) {
      console.error("Get skills error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get skills error:", error);
    return [];
  }
}

/**
 * Get a specific skill by ID
 */
export async function getSkill(skillId: string): Promise<Skill | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getSkillsBySkillId({
      client,
      path: { skillId },
    });

    if (error !== undefined) {
      console.error("Get skill error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Get skill error:", error);
    return null;
  }
}

/**
 * Get user's added skills
 */
export async function getUserSkills(): Promise<UserSkill[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getSkillsUser({ client });

    if (error !== undefined) {
      console.error("Get user skills error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get user skills error:", error);
    return [];
  }
}

/**
 * Add a skill to user's library
 */
export async function addUserSkill(
  input: AddUserSkillRequest
): Promise<ActionResult<UserSkill>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postSkillsUser({
      client,
      body: input,
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Add user skill error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Remove a skill from user's library
 */
export async function removeUserSkill(skillId: string): Promise<ActionResult<void>> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteSkillsUserBySkillId({
      client,
      path: { skillId },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Remove user skill error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Get skills enabled for a specific instance
 */
export async function getInstanceSkills(instanceId: string): Promise<InstanceSkill[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getInstancesByInstanceIdSkills({
      client,
      path: { instanceId },
    });

    if (error !== undefined) {
      console.error("Get instance skills error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get instance skills error:", error);
    return [];
  }
}

/**
 * Enable a skill for an instance
 */
export async function enableInstanceSkill(
  instanceId: string,
  input: EnableInstanceSkillRequest
): Promise<ActionResult<InstanceSkill>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesByInstanceIdSkills({
      client,
      path: { instanceId },
      body: input,
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Enable instance skill error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Disable a skill for an instance
 */
export async function disableInstanceSkill(
  instanceId: string,
  skillId: string
): Promise<ActionResult<void>> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteInstancesByInstanceIdSkillsBySkillId({
      client,
      path: { instanceId, skillId },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Disable instance skill error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
