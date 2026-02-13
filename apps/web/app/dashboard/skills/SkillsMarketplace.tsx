"use client";

import { useState } from "react";
import type { Skill, UserSkill } from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import { addUserSkill, removeUserSkill } from "@/actions/skills.actions";
import { useRouter } from "next/navigation";

type SkillsMarketplaceProps = {
  allSkills: Skill[];
  userSkills: UserSkill[];
};

const CATEGORIES = [
  "All",
  "productivity",
  "development",
  "communication",
];

const SkillsMarketplace = ({ allSkills, userSkills }: SkillsMarketplaceProps) => {
  const router = useRouter();
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("All");
  const [loadingSkills, setLoadingSkills] = useState<Set<string>>(new Set());

  const userSkillIds = new Set(userSkills.map((us) => us.skillId));

  const filteredSkills = allSkills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(search.toLowerCase()) ||
                         skill.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || skill.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAddSkill = async (skillId: string) => {
    setLoadingSkills((prev) => new Set(prev).add(skillId));
    try {
      const result = await addUserSkill({ skillId });
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to add skill");
    } finally {
      setLoadingSkills((prev) => {
        const next = new Set(prev);
        next.delete(skillId);
        return next;
      });
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
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
              Skills Marketplace
            </div>
            <div className="body1 text-n-4 md:body1S">
              Add skills to teach your AI agents domain-specific knowledge
            </div>
          </div>
          <a
            href="/dashboard/skills/my-skills"
            className="btn-stroke shrink-0 ml-6"
          >
            <Icon name="folder" />
            <span>My Skills ({userSkills.length})</span>
          </a>
        </div>

        {/* Search */}
        <form
          className="mb-6"
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
              placeholder="Search skills by name or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                category === cat
                  ? "bg-primary-1 text-n-1"
                  : "bg-n-2 text-n-4 hover:bg-n-3 dark:bg-n-7 dark:hover:bg-n-6"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center">
              <Icon className="fill-n-4" name="search" />
            </div>
            <div className="h5 mb-2">No skills found</div>
            <div className="body2 text-n-4">
              {search || category !== "All"
                ? "Try adjusting your search or filters"
                : "No skills available"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => {
              const isAdded = userSkillIds.has(skill.id);
              const isLoading = loadingSkills.has(skill.id);

              return (
                <div
                  key={skill.id}
                  className="p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 hover:border-primary-1 transition-colors"
                >
                  {/* Skill Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="h6 mb-1">{skill.name}</h3>
                      <div className="caption1 text-n-4">
                        {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
                      </div>
                    </div>
                    {skill.isOfficial && (
                      <div className="px-2 py-1 rounded bg-primary-1/10 text-primary-1 text-xs font-medium">
                        Official
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="body2 text-n-4 mb-4 line-clamp-3">
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

                  {/* Action Button */}
                  <button
                    onClick={() => isAdded ? handleRemoveSkill(skill.id) : handleAddSkill(skill.id)}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isAdded
                        ? "bg-n-3 text-n-5 hover:bg-n-4 dark:bg-n-6 dark:text-n-3 dark:hover:bg-n-5"
                        : "bg-primary-1 text-n-1 hover:bg-primary-1/90"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? "Loading..." : isAdded ? "Remove from My Skills" : "Add to My Skills"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SkillsMarketplace;
