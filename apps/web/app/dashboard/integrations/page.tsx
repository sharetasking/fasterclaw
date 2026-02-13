import type { NextPage } from "next";
import { Suspense } from "react";
import { getIntegrations, getUserIntegrations } from "@/actions/integrations.actions";
import IntegrationsContent from "./IntegrationsContent";

const IntegrationsPage: NextPage = async () => {
  const [allIntegrations, userIntegrations] = await Promise.all([
    getIntegrations(),
    getUserIntegrations(),
  ]);

  return (
    <Suspense fallback={<div className="p-10">Loading...</div>}>
      <IntegrationsContent
        allIntegrations={allIntegrations}
        userIntegrations={userIntegrations}
      />
    </Suspense>
  );
};

export default IntegrationsPage;
