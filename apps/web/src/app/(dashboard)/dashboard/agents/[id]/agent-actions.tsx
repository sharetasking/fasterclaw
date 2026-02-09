"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Trash2 } from "lucide-react";
import { startInstance, stopInstance, deleteInstance } from "@/actions/instances.actions";
import toast from "react-hot-toast";

type AgentActionsProps = {
  agentId: string;
  status: string;
};

export function AgentActions({ agentId, status }: AgentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading("start");
    const success = await startInstance(agentId);
    if (success) {
      toast.success("Agent started!");
      router.refresh();
    } else {
      toast.error("Failed to start agent");
    }
    setLoading(null);
  };

  const handleStop = async () => {
    setLoading("stop");
    const success = await stopInstance(agentId);
    if (success) {
      toast.success("Agent paused");
      router.refresh();
    } else {
      toast.error("Failed to pause agent");
    }
    setLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      return;
    }
    setLoading("delete");
    const success = await deleteInstance(agentId);
    if (success) {
      toast.success("Agent deleted");
      router.push("/dashboard");
    } else {
      toast.error("Failed to delete agent");
    }
    setLoading(null);
  };

  const isRunning = status === "RUNNING";
  const canControl = status === "RUNNING" || status === "STOPPED";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {canControl && (
          <>
            {isRunning ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleStop}
                disabled={loading !== null}
              >
                <Square className="h-4 w-4" />
                {loading === "stop" ? "Pausing..." : "Pause Agent"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleStart}
                disabled={loading !== null}
              >
                <Play className="h-4 w-4" />
                {loading === "start" ? "Starting..." : "Start Agent"}
              </Button>
            )}
          </>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={loading !== null}
        >
          <Trash2 className="h-4 w-4" />
          {loading === "delete" ? "Deleting..." : "Delete Agent"}
        </Button>
      </CardContent>
    </Card>
  );
}
