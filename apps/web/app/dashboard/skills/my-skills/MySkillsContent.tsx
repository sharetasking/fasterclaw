"use client";

import { useState } from "react";
import type { UserSkill } from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import { removeUserSkill } from "@/actions/skills.actions";
import { useRouter } from "next/navigation";

type MySkillsContentProps = {
  userSkills: UserSkill[];
};

const MySkillsContent = ({ userSkills: initialUserSkills }: MySkillsContentProps) => {
  const router = useRouter();
  const [search, setSearch] = useState<string>("");
  const [loadingSkills, setLoadingSkills] = useState<Set<string>>(new Set());

  const filteredSkills = initialUserSkills.filter((userSkill) =>
    userSkill.skill.name.toLowerCase().includes(search.toLowerCase()) ||
    userSkill.skill.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm("Are you sure you want to remove this skill?")) {
      return;
    }

    setLoadingSkills((prev) => new Set(prev).add(skillId));
    try {
      const result = await removeUserSkill(skillId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to remove skill");
    } finally {
      setLoadingSkills((prev) => {
        const next = new Set(prev);
        next.delete(skillId);
        return next;
      });
    }
  };

  return (
    <Layout hideRightSidebar>
      <div className="p-10 md:pt-5 md:px-6 md:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-3">
          <div>
            <div className="h3 leading-[4rem] md:mb-1 md:h3">
              My Skills
            </div>
            <div className="body1 text-n-4 md:body1S">
              Skills you've added to your library
            </div>
          </div>
          <a
            href="/dashboard/skills"
            className="btn-blue shrink-0 ml-6"
          >
            <Icon name="plus" />
            <span>Browse Marketplace</span>
          </a>
        </div>

        {/* Search */}
        {initialUserSkills.length > 0 && (
          <form
            className="mb-8"
            action=""
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="relative">
              <button
                className="group absolute top-5 left-5 outline-none"
                type="submit"
              >
                <Icon
                  className="fill-n-4 transition-colors group-hover:fill-n-7"
                  name="search"
                />
              </button>
              <input
                className="w-full h-16 pl-13 pr-6 bg-n-2 border-2 border-transparent rounded-xl outline-none base1 text-n-7 transition-colors placeholder:text-n-4 focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                type="text"
                name="search"
                placeholder="Search your skills"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </form>
        )}

        {/* Skills List */}
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center">
              <Icon className="fill-n-4" name="folder" />
            </div>
            <div className="h5 mb-2">
              {initialUserSkills.length === 0 ? "No skills yet" : "No skills found"}
            </div>
            <div className="body2 text-n-4 mb-8">
              {initialUserSkills.length === 0
                ? "Add skills from the marketplace to get started"
                : "Try adjusting your search terms"}
            </div>
            {initialUserSkills.length === 0 && (
              <a href="/dashboard/skills" className="btn-blue">
                <Icon name="plus" />
                <span>Browse Skills</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSkills.map((userSkill) => {
              const { skill } = userSkill;
              const isLoading = loadingSkills.has(skill.id);

              return (
                <div
                  key={userSkill.id}
                  className="p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 hover:border-primary-1 transition-colors"
                >
                  <div className="flex items-start justify-between gap-6">
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
                        <div className="mb-4 p-3 rounded-lg bg-n-3/50 dark:bg-n-6/50">
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

                      <div className="caption2 text-n-4">
                        Added on {new Date(userSkill.addedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      disabled={isLoading}
                      className="btn-stroke-red shrink-0"
                    >
                      <Icon name="close" />
                      <span>{isLoading ? "Removing..." : "Remove"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MySkillsContent;
