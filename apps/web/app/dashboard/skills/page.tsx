import type { NextPage } from "next";
import { getSkills, getUserSkills } from "@/actions/skills.actions";
import SkillsMarketplace from "./SkillsMarketplace";

const SkillsPage: NextPage = async () => {
  const [allSkills, userSkills] = await Promise.all([
    getSkills(),
    getUserSkills(),
  ]);

  return <SkillsMarketplace allSkills={allSkills} userSkills={userSkills} />;
};

export default SkillsPage;
