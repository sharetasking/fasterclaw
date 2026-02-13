import type { NextPage } from "next";
import { notFound } from "next/navigation";
import { getInstance } from "@/actions/instances.actions";
import { getUserSkills, getInstanceSkills } from "@/actions/skills.actions";
import { getUserIntegrations, getInstanceIntegrations } from "@/actions/integrations.actions";
import InstanceDetailContent from "./InstanceDetailContent";

type InstanceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const InstanceDetailPage: NextPage<InstanceDetailPageProps> = async ({ params }) => {
  const { id } = await params;

  const [instance, userSkills, instanceSkills, userIntegrations, instanceIntegrations] =
    await Promise.all([
      getInstance(id),
      getUserSkills(),
      getInstanceSkills(id),
      getUserIntegrations(),
      getInstanceIntegrations(id),
    ]);

  if (!instance) {
    notFound();
  }

  return (
    <InstanceDetailContent
      instance={instance}
      userSkills={userSkills}
      instanceSkills={instanceSkills}
      userIntegrations={userIntegrations}
      instanceIntegrations={instanceIntegrations}
    />
  );
};

export default InstanceDetailPage;
