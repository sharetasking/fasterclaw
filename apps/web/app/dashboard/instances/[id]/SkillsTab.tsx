"use client";

import { useState } from "react";
import type { UserSkill, InstanceSkill } from "@fasterclaw/api-client";
import Icon from "@/components/Icon";
import { enableInstanceSkill, disableInstanceSkill } from "@/actions/skills.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SkillsTabProps = {
  instanceId: string;
  userSkills: UserSkill[];
  instanceSkills: InstanceSkill[];
};

const SkillsTab = ({ instanceId, userSkills, instanceSkills }: SkillsTabProps) => {
  const router = useRouter();
  const [loadingSkills, setLoadingSkills] = useState<Set<string>>(new Set());

  const enabledSkillIds = new Set(instanceSkills.map((is) => is.skillId));

  const handleToggleSkill = async (skillId: string, isEnabled: boolean) => {
    setLoadingSkills((prev) => new Set(prev).add(skillId));

    try {
      if (isEnabled) {
        // Disable skill
        const result = await disableInstanceSkill(instanceId, skillId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      } else {
        // Enable skill
        const result = await enableInstanceSkill(instanceId, { skillId });
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      }
    } catch (error) {
      alert("Failed to update skill");
    } finally {
      setLoadingSkills((prev) => {
        const next = new Set(prev);
        next.delete(skillId);
        return next;
      });
    }
  };

  if (userSkills.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center mx-auto">
          <Icon className="fill-n-4" name="folder" />
        </div>
        <div className="h5 mb-2">No Skills in Your Library</div>
        <div className="body2 text-n-4 mb-8">
          Add skills from the marketplace to enable them for this instance
        </div>
        <Link href="/dashboard/skills" className="btn-blue inline-flex">
          <Icon name="plus" />
          <span>Browse Skills</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-8 flex items-start gap-3">
        <Icon name="info" className="w-5 h-5 fill-blue-500 shrink-0 mt-0.5" />
        <div>
          <div className="body2 text-blue-500 font-medium mb-1">
            Skills teach your AI agent domain-specific knowledge
          </div>
          <div className="caption1 text-n-4">
            Enable skills to make them available to this instance. Changes require a restart to take effect.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="px-4 py-3 rounded-lg bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6">
          <div className="caption1 text-n-4 mb-1">Enabled Skills</div>
          <div className="h5">{instanceSkills.length}</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6">
          <div className="caption1 text-n-4 mb-1">Available Skills</div>
          <div className="h5">{userSkills.length}</div>
        </div>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        {userSkills.map((userSkill) => {
          const { skill } = userSkill;
          const isEnabled = enabledSkillIds.has(skill.id);
          const isLoading = loadingSkills.has(skill.id);

          return (
            <div
              key={userSkill.id}
              className={`p-6 rounded-xl border transition-colors ${
                isEnabled
                  ? "bg-primary-1/5 border-primary-1/20"
                  : "bg-n-2 dark:bg-n-7 border-n-3 dark:border-n-6"
              }`}
            >
              <div className="flex items-start gap-6">
                {/* Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={isLoading}
                      onChange={() => handleToggleSkill(skill.id, isEnabled)}
                      className="w-5 h-5 rounded border-2 border-n-4 checked:border-primary-1 checked:bg-primary-1 transition-colors cursor-pointer disabled:opacity-50"
                    />
                  </label>
                </div>

                {/* Skill Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="h6">{skill.name}</h3>
                    {skill.isOfficial && (
                      <div className="px-2 py-1 rounded bg-primary-1/10 text-primary-1 text-xs font-medium">
                        Official
                      </div>
                    )}
                    <div className="px-2 py-1 rounded bg-n-3 dark:bg-n-6 text-n-5 dark:text-n-3 text-xs font-medium">
                      {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
                    </div>
                  </div>

                  <p className="body2 text-n-4 mb-4">
                    {skill.description}
                  </p>

                  {/* Requirements */}
                  {(skill.requiresBins.length > 0 || skill.requiresEnvVars.length > 0) && (
                    <div className="p-3 rounded-lg bg-n-3/50 dark:bg-n-6/50">
                      {skill.requiresBins.length > 0 && (
                        <div className="caption2 text-n-4 mb-1">
                          <span className="font-medium">Requires:</span> {skill.requiresBins.join(", ")}
                        </div>
                      )}
                      {skill.requiresEnvVars.length > 0 && (
                        <div className="caption2 text-n-4">
                          <span className="font-medium">Env vars:</span> {skill.requiresEnvVars.join(", ")}
                        </div>
                      )}
                    </div>
                  )}

                  {isLoading && (
                    <div className="caption2 text-primary-1 mt-3">
                      Updating...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to add more skills */}
      <div className="mt-8 p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 text-center">
        <div className="body2 text-n-4 mb-4">
          Want to add more skills?
        </div>
        <Link href="/dashboard/skills" className="btn-stroke inline-flex">
          <Icon name="plus" />
          <span>Browse Skills Marketplace</span>
        </Link>
      </div>
    </div>
  );
};

export default SkillsTab;
