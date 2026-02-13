"use client";

import { useState, useEffect } from "react";
import type { Integration, UserIntegration } from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import { initiateOAuth, disconnectIntegration } from "@/actions/integrations.actions";
import { useRouter, useSearchParams } from "next/navigation";

type IntegrationsContentProps = {
  allIntegrations: Integration[];
  userIntegrations: UserIntegration[];
};

const IntegrationsContent = ({
  allIntegrations,
  userIntegrations,
}: IntegrationsContentProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingIntegrations, setLoadingIntegrations] = useState<Set<string>>(new Set());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  // Check for OAuth callback status
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setShowSuccessMessage(true);
      // Refresh to get updated data
      router.refresh();
      // Clear URL params
      router.replace("/dashboard/integrations");
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } else if (error) {
      setShowErrorMessage(true);
      router.replace("/dashboard/integrations");
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  }, [searchParams, router]);

  const connectedIntegrationIds = new Set(
    userIntegrations.map((ui) => ui.integrationId)
  );

  const handleConnect = async (integrationId: string) => {
    setLoadingIntegrations((prev) => new Set(prev).add(integrationId));

    try {
      const result = await initiateOAuth({ integrationId });
      if (result.success) {
        // Redirect to OAuth URL
        window.location.href = result.data.authorizationUrl;
      } else {
        alert(result.error);
        setLoadingIntegrations((prev) => {
          const next = new Set(prev);
          next.delete(integrationId);
          return next;
        });
      }
    } catch (error) {
      alert("Failed to initiate OAuth");
      setLoadingIntegrations((prev) => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) {
      return;
    }

    setLoadingIntegrations((prev) => new Set(prev).add(integrationId));

    try {
      const result = await disconnectIntegration(integrationId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to disconnect integration");
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

  return (
    <Layout hideRightSidebar>
      <div className="p-10 md:pt-5 md:px-6 md:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-3">
          <div>
            <div className="h3 leading-[4rem] md:mb-1 md:h3">Integrations</div>
            <div className="body1 text-n-4 md:body1S">
              Connect your accounts to enable powerful integrations
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <Icon name="check" className="w-5 h-5 fill-green-500 shrink-0" />
            <div className="body2 text-green-500 font-medium">
              Integration connected successfully!
            </div>
          </div>
        )}

        {showErrorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <Icon name="close" className="w-5 h-5 fill-red-500 shrink-0" />
            <div className="body2 text-red-500 font-medium">
              Failed to connect integration. Please try again.
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-8 flex items-start gap-3">
          <Icon name="info" className="w-5 h-5 fill-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="body2 text-blue-500 font-medium mb-1">
              Secure OAuth 2.0 Authentication
            </div>
            <div className="caption1 text-n-4">
              Your credentials are encrypted and stored securely. FasterClaw never sees your passwords.
            </div>
          </div>
        </div>

        {/* Connected Integrations */}
        {userIntegrations.length > 0 && (
          <div className="mb-12">
            <h2 className="h5 mb-4">Connected Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userIntegrations.map((userIntegration) => {
                const { integration } = userIntegration;
                const isLoading = loadingIntegrations.has(integration.id);

                return (
                  <div
                    key={userIntegration.id}
                    className="p-6 rounded-xl bg-primary-1/5 border border-primary-1/20"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-n-1 dark:bg-n-6 flex items-center justify-center shrink-0">
                        <Icon
                          name={getProviderIcon(integration.provider)}
                          className="w-6 h-6"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="h6 mb-1">{integration.name}</h3>
                        <div className="caption1 text-n-4">
                          {integration.category.charAt(0).toUpperCase() +
                            integration.category.slice(1)}
                        </div>
                      </div>
                    </div>

                    <p className="body2 text-n-4 mb-4">{integration.description}</p>

                    {/* Connection Info */}
                    <div className="mb-4 p-3 rounded-lg bg-n-2/50 dark:bg-n-7/50">
                      <div className="caption2 text-n-4 mb-1">
                        <span className="font-medium">Account:</span>{" "}
                        {userIntegration.accountIdentifier || "Connected"}
                      </div>
                      <div className="caption2 text-n-4">
                        <span className="font-medium">Connected:</span>{" "}
                        {new Date(userIntegration.connectedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/10 text-green-500">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-medium">Connected</span>
                      </div>
                      {userIntegration.tokenExpiresAt && (
                        <div className="caption2 text-n-4">
                          Expires:{" "}
                          {new Date(userIntegration.tokenExpiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={isLoading}
                      className="w-full btn-stroke-red"
                    >
                      <Icon name="close" />
                      <span>{isLoading ? "Disconnecting..." : "Disconnect"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div>
          <h2 className="h5 mb-4">
            {userIntegrations.length > 0 ? "Available Integrations" : "All Integrations"}
          </h2>

          {allIntegrations.filter((i) => !connectedIntegrationIds.has(i.id)).length ===
          0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center mx-auto">
                <Icon className="fill-n-4" name="check" />
              </div>
              <div className="h5 mb-2">All Integrations Connected</div>
              <div className="body2 text-n-4">
                You've connected all available integrations
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allIntegrations
                .filter((integration) => !connectedIntegrationIds.has(integration.id))
                .map((integration) => {
                  const isLoading = loadingIntegrations.has(integration.id);

                  return (
                    <div
                      key={integration.id}
                      className="p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 hover:border-primary-1 transition-colors"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-n-3 dark:bg-n-6 flex items-center justify-center shrink-0">
                          <Icon
                            name={getProviderIcon(integration.provider)}
                            className="w-6 h-6 fill-n-4"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="h6 mb-1">{integration.name}</h3>
                          <div className="caption1 text-n-4">
                            {integration.category.charAt(0).toUpperCase() +
                              integration.category.slice(1)}
                          </div>
                        </div>
                        {integration.isOfficial && (
                          <div className="px-2 py-1 rounded bg-primary-1/10 text-primary-1 text-xs font-medium">
                            Official
                          </div>
                        )}
                      </div>

                      <p className="body2 text-n-4 mb-4">{integration.description}</p>

                      {/* OAuth Scopes */}
                      {integration.oauthScopes.length > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-n-3/50 dark:bg-n-6/50">
                          <div className="caption2 text-n-4 mb-2 font-medium">
                            Permissions:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {integration.oauthScopes.slice(0, 3).map((scope) => (
                              <span
                                key={scope}
                                className="px-2 py-1 rounded bg-n-2 dark:bg-n-7 text-n-5 dark:text-n-3 text-xs"
                              >
                                {scope.split(".").pop()}
                              </span>
                            ))}
                            {integration.oauthScopes.length > 3 && (
                              <span className="px-2 py-1 rounded bg-n-2 dark:bg-n-7 text-n-5 dark:text-n-3 text-xs">
                                +{integration.oauthScopes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Connect Button */}
                      <button
                        onClick={() => handleConnect(integration.id)}
                        disabled={isLoading}
                        className="w-full btn-blue"
                      >
                        <Icon name="link" />
                        <span>{isLoading ? "Connecting..." : "Connect"}</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default IntegrationsContent;
