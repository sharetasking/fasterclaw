import type { NextPage } from "next";
import { getUserSkills } from "@/actions/skills.actions";
import MySkillsContent from "./MySkillsContent";

const MySkillsPage: NextPage = async () => {
  const userSkills = await getUserSkills();

  return <MySkillsContent userSkills={userSkills} />;
};

export default MySkillsPage;
