"use client";

import { useState } from "react";
import type { UserIntegration, InstanceIntegration } from "@fasterclaw/api-client";
import Icon from "@/components/Icon";
import {
  enableInstanceIntegration,
  disableInstanceIntegration,
} from "@/actions/integrations.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

type IntegrationsTabProps = {
  instanceId: string;
  userIntegrations: UserIntegration[];
  instanceIntegrations: InstanceIntegration[];
};

const IntegrationsTab = ({
  instanceId,
  userIntegrations,
  instanceIntegrations,
}: IntegrationsTabProps) => {
  const router = useRouter();
  const [loadingIntegrations, setLoadingIntegrations] = useState<Set<string>>(new Set());

  const enabledIntegrationIds = new Set(
    instanceIntegrations.map((ii) => ii.userIntegration.integrationId)
  );

  const handleToggleIntegration = async (
    userIntegrationId: string,
    integrationId: string,
    isEnabled: boolean
  ) => {
    setLoadingIntegrations((prev) => new Set(prev).add(integrationId));

    try {
      if (isEnabled) {
        // Disable integration
        const result = await disableInstanceIntegration(instanceId, integrationId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      } else {
        // Enable integration
        const result = await enableInstanceIntegration(instanceId, { userIntegrationId });
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      }
    } catch (error) {
      alert("Failed to update integration");
    } finally {
      setLoadingIntegrations((prev) => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "google";
      case "slack":
        return "slack";
      case "github":
        return "github";
      default:
        return "link";
    }
  };

  if (userIntegrations.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center mx-auto">
          <Icon className="fill-n-4" name="link" />
        </div>
        <div className="h5 mb-2">No Integrations Connected</div>
        <div className="body2 text-n-4 mb-8">
          Connect integrations to enable them for this instance
        </div>
        <Link href="/dashboard/integrations" className="btn-blue inline-flex">
          <Icon name="link" />
          <span>Connect Integrations</span>
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
            Enable integrations for this instance
          </div>
          <div className="caption1 text-n-4">
            Integrations provide OAuth tokens to your AI agent. Changes require a restart to take
            effect.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="px-4 py-3 rounded-lg bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6">
          <div className="caption1 text-n-4 mb-1">Enabled Integrations</div>
          <div className="h5">{instanceIntegrations.length}</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6">
          <div className="caption1 text-n-4 mb-1">Available Integrations</div>
          <div className="h5">{userIntegrations.length}</div>
        </div>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {userIntegrations.map((userIntegration) => {
          const { integration } = userIntegration;
          const isEnabled = enabledIntegrationIds.has(integration.id);
          const isLoading = loadingIntegrations.has(integration.id);

          return (
            <div
              key={userIntegration.id}
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
                      onChange={() =>
                        handleToggleIntegration(
                          userIntegration.id,
                          integration.id,
                          isEnabled
                        )
                      }
                      className="w-5 h-5 rounded border-2 border-n-4 checked:border-primary-1 checked:bg-primary-1 transition-colors cursor-pointer disabled:opacity-50"
                    />
                  </label>
                </div>

                {/* Integration Icon */}
                <div className="w-12 h-12 rounded-lg bg-n-1 dark:bg-n-6 flex items-center justify-center shrink-0">
                  <Icon name={getProviderIcon(integration.provider)} className="w-6 h-6" />
                </div>

                {/* Integration Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="h6">{integration.name}</h3>
                    {integration.isOfficial && (
                      <div className="px-2 py-1 rounded bg-primary-1/10 text-primary-1 text-xs font-medium">
                        Official
                      </div>
                    )}
                    <div className="px-2 py-1 rounded bg-n-3 dark:bg-n-6 text-n-5 dark:text-n-3 text-xs font-medium">
                      {integration.category.charAt(0).toUpperCase() +
                        integration.category.slice(1)}
                    </div>
                  </div>

                  <p className="body2 text-n-4 mb-4">{integration.description}</p>

                  {/* Connection Info */}
                  <div className="p-3 rounded-lg bg-n-3/50 dark:bg-n-6/50">
                    <div className="caption2 text-n-4 mb-1">
                      <span className="font-medium">Account:</span>{" "}
                      {userIntegration.accountIdentifier || "Connected"}
                    </div>
                    <div className="caption2 text-n-4 mb-1">
                      <span className="font-medium">Connected:</span>{" "}
                      {new Date(userIntegration.connectedAt).toLocaleDateString()}
                    </div>
                    {userIntegration.tokenExpiresAt && (
                      <div className="caption2 text-n-4">
                        <span className="font-medium">Token expires:</span>{" "}
                        {new Date(userIntegration.tokenExpiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {isLoading && (
                    <div className="caption2 text-primary-1 mt-3">Updating...</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to add more integrations */}
      <div className="mt-8 p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 text-center">
        <div className="body2 text-n-4 mb-4">Want to connect more integrations?</div>
        <Link href="/dashboard/integrations" className="btn-stroke inline-flex">
          <Icon name="link" />
          <span>Manage Integrations</span>
        </Link>
      </div>
    </div>
  );
};

export default IntegrationsTab;
