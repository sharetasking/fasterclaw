"use client";

import { useState } from "react";
import type {
  Instance,
  UserSkill,
  InstanceSkill,
  UserIntegration,
  InstanceIntegration,
} from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import Link from "next/link";
import OverviewTab from "./OverviewTab";
import SkillsTab from "./SkillsTab";
import IntegrationsTab from "./IntegrationsTab";

type InstanceDetailContentProps = {
  instance: Instance;
  userSkills: UserSkill[];
  instanceSkills: InstanceSkill[];
  userIntegrations: UserIntegration[];
  instanceIntegrations: InstanceIntegration[];
};

type Tab = "overview" | "skills" | "integrations" | "settings";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "skills", label: "Skills", icon: "folder" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const InstanceDetailContent = ({
  instance,
  userSkills,
  instanceSkills: initialInstanceSkills,
  userIntegrations,
  instanceIntegrations,
}: InstanceDetailContentProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "text-green-500";
      case "STOPPED":
        return "text-yellow-500";
      case "CREATING":
      case "PROVISIONING":
      case "STARTING":
        return "text-blue-500";
      case "FAILED":
        return "text-red-500";
      default:
        return "text-n-4";
    }
  };

  return (
    <Layout hideRightSidebar>
      <div className="p-10 md:pt-5 md:px-6 md:pb-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link
            href="/dashboard"
            className="text-n-4 hover:text-n-7 dark:hover:text-n-1 transition-colors"
          >
            Instances
          </Link>
          <Icon name="arrow-next" className="w-4 h-4 fill-n-4" />
          <span className="text-n-7 dark:text-n-1">{instance.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="h3">{instance.name}</h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-n-2 dark:bg-n-7 ${getStatusColor(instance.status)}`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span className="text-sm font-medium">{instance.status}</span>
              </div>
            </div>
            <div className="body1 text-n-4">
              {instance.aiModel} • {instance.region}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-n-3 dark:border-n-6 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary-1 text-n-7 dark:text-n-1"
                    : "border-transparent text-n-4 hover:text-n-7 dark:hover:text-n-1"
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab instance={instance} />}
        {activeTab === "skills" && (
          <SkillsTab
            instanceId={instance.id}
            userSkills={userSkills}
            instanceSkills={initialInstanceSkills}
          />
        )}
        {activeTab === "integrations" && (
          <IntegrationsTab
            instanceId={instance.id}
            userIntegrations={userIntegrations}
            instanceIntegrations={instanceIntegrations}
          />
        )}
        {activeTab === "settings" && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center mx-auto">
              <Icon className="fill-n-4" name="settings" />
            </div>
            <div className="h5 mb-2">Settings</div>
            <div className="body2 text-n-4">
              Advanced instance settings coming soon
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InstanceDetailContent;
