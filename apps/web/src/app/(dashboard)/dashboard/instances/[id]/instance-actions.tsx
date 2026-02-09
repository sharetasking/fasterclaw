"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Power, RefreshCw, Trash2, Play, Square } from "lucide-react";
import {
  startInstance,
  stopInstance,
  deleteInstance,
  type Instance,
} from "@/actions/instances.actions";

interface InstanceActionsProps {
  instance: Instance;
  showFullActions?: boolean;
}

export function InstanceActions({
  instance,
  showFullActions = false,
}: InstanceActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    setLoading("start");
    try {
      const success = await startInstance(instance.id);
      if (success) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading("stop");
    try {
      const success = await stopInstance(instance.id);
      if (success) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this instance?")) {
      return;
    }
    setLoading("delete");
    try {
      const success = await deleteInstance(instance.id);
      if (success) {
        router.push("/dashboard");
      }
    } finally {
      setLoading(null);
    }
  };

  // Header actions (compact)
  if (!showFullActions) {
    return (
      <div className="flex gap-2">
        {instance.status === "STOPPED" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleStart}
            disabled={loading !== null}
          >
            {loading === "start" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start
          </Button>
        )}
        {instance.status === "RUNNING" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleStop}
            disabled={loading !== null}
          >
            {loading === "stop" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Stop
          </Button>
        )}
      </div>
    );
  }

  // Sidebar actions (full)
  return (
    <div className="space-y-2">
      {instance.status === "STOPPED" && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleStart}
          disabled={loading !== null}
        >
          {loading === "start" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Instance
        </Button>
      )}
      {instance.status === "RUNNING" && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleStop}
          disabled={loading !== null}
        >
          {loading === "stop" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          Stop Instance
        </Button>
      )}
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={loading !== null}
      >
        {loading === "delete" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Delete Instance
      </Button>
    </div>
  );
}
