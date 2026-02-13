"use client";

import type { Instance } from "@fasterclaw/api-client";
import Icon from "@/components/Icon";
import { useState } from "react";
import { startInstance, stopInstance, deleteInstance } from "@/actions/instances.actions";
import { useRouter } from "next/navigation";

type OverviewTabProps = {
  instance: Instance;
};

const OverviewTab = ({ instance }: OverviewTabProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await startInstance(instance.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to start instance");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const result = await stopInstance(instance.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to stop instance");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this instance? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteInstance(instance.id);
      if (result.success) {
        router.push("/dashboard");
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to delete instance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Actions */}
      <div className="flex gap-3 mb-8">
        {instance.status === "STOPPED" && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-blue"
          >
            <Icon name="play" />
            <span>{loading ? "Starting..." : "Start Instance"}</span>
          </button>
        )}
        {instance.status === "RUNNING" && (
          <button
            onClick={handleStop}
            disabled={loading}
            className="btn-stroke"
          >
            <Icon name="pause" />
            <span>{loading ? "Stopping..." : "Stop Instance"}</span>
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={loading}
          className="btn-stroke-red ml-auto"
        >
          <Icon name="trash" />
          <span>{loading ? "Deleting..." : "Delete Instance"}</span>
        </button>
      </div>

      {/* Instance Details */}
      <div className="p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6 mb-6">
        <h3 className="h6 mb-6">Instance Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="caption1 text-n-4 mb-2">Instance ID</div>
            <div className="body2 font-mono">{instance.id}</div>
          </div>

          <div>
            <div className="caption1 text-n-4 mb-2">Status</div>
            <div className="body2">{instance.status}</div>
          </div>

          <div>
            <div className="caption1 text-n-4 mb-2">Region</div>
            <div className="body2">{instance.region}</div>
          </div>

          <div>
            <div className="caption1 text-n-4 mb-2">Provider</div>
            <div className="body2 capitalize">{instance.provider}</div>
          </div>

          <div>
            <div className="caption1 text-n-4 mb-2">AI Model</div>
            <div className="body2">{instance.aiModel}</div>
          </div>

          {instance.ipAddress && (
            <div>
              <div className="caption1 text-n-4 mb-2">IP Address</div>
              <div className="body2 font-mono">{instance.ipAddress}</div>
            </div>
          )}

          <div>
            <div className="caption1 text-n-4 mb-2">Created</div>
            <div className="body2">{new Date(instance.createdAt).toLocaleString()}</div>
          </div>

          <div>
            <div className="caption1 text-n-4 mb-2">Last Updated</div>
            <div className="body2">{new Date(instance.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Telegram Configuration */}
      <div className="p-6 rounded-xl bg-n-2 dark:bg-n-7 border border-n-3 dark:border-n-6">
        <h3 className="h6 mb-6">Telegram Bot</h3>

        <div>
          <div className="caption1 text-n-4 mb-2">Bot Token</div>
          <div className="body2 font-mono">{instance.telegramBotToken}</div>
          <div className="caption2 text-n-4 mt-2">
            Token is masked for security. Use @BotFather on Telegram to regenerate if needed.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
