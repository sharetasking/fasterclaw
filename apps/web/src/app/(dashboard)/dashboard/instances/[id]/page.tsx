"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, Activity, Power, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  getInstance,
  startInstance,
  stopInstance,
  deleteInstance,
} from "@/actions/instances.actions";
import type { Instance } from "@fasterclaw/api-client";

function statusVariant(status: string) {
  switch (status.toUpperCase()) {
    case "RUNNING":
      return "default" as const;
    case "CREATING":
    case "PROVISIONING":
    case "STARTING":
      return "outline" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInstance = useCallback(async () => {
    const data = await getInstance(id);
    if (data !== null) {
      setInstance(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchInstance();
  }, [fetchInstance]);

  // Poll for status updates when instance is in a transitional state
  useEffect(() => {
    if (instance === null) {
      return undefined;
    }
    const transitional = ["CREATING", "PROVISIONING", "STARTING", "STOPPING"];
    if (!transitional.includes(instance.status.toUpperCase())) {
      return undefined;
    }

    const interval = setInterval(() => {
      void fetchInstance();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [instance, fetchInstance]);

  const handleStart = () => {
    setActionLoading("start");
    void (async () => {
      const result = await startInstance(id);
      if (result.success) {
        toast.success("Instance starting...");
        await fetchInstance();
      } else {
        toast.error(result.error);
      }
      setActionLoading(null);
    })();
  };

  const handleStop = () => {
    setActionLoading("stop");
    void (async () => {
      const result = await stopInstance(id);
      if (result.success) {
        toast.success("Instance stopped");
        await fetchInstance();
      } else {
        toast.error(result.error);
      }
      setActionLoading(null);
    })();
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this instance? This action cannot be undone.")) {
      return;
    }
    setActionLoading("delete");
    void (async () => {
      const result = await deleteInstance(id);
      if (result.success) {
        toast.success("Instance deleted");
        router.push("/dashboard");
      } else {
        toast.error(result.error);
        setActionLoading(null);
      }
    })();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instance === null) {
    return (
      <div className="p-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Instances
          </Button>
        </Link>
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Instance not found</h3>
          <p className="text-muted-foreground">This instance may have been deleted.</p>
        </div>
      </div>
    );
  }

  const isRunning = instance.status.toUpperCase() === "RUNNING";
  const isStopped = instance.status.toUpperCase() === "STOPPED";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Instances
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{instance.name}</h1>
                <Badge variant={statusVariant(instance.status)}>
                  {instance.status.toLowerCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {instance.region} &bull; {instance.aiModel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isStopped && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleStart}
                disabled={actionLoading !== null}
              >
                {actionLoading === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                Start
              </Button>
            )}
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleStop}
                disabled={actionLoading !== null}
              >
                {actionLoading === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instance Info */}
          <Card>
            <CardHeader>
              <CardTitle>Instance Information</CardTitle>
              <CardDescription>Configuration details for this instance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {instance.flyAppName !== null && (
                <div>
                  <div className="text-sm font-medium mb-1">Fly App Name</div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{instance.flyAppName}</code>
                </div>
              )}
              {instance.flyMachineId !== null && (
                <div>
                  <div className="text-sm font-medium mb-1">Machine ID</div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {instance.flyMachineId}
                  </code>
                </div>
              )}
              {instance.ipAddress !== null && (
                <div>
                  <div className="text-sm font-medium mb-1">IP Address</div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{instance.ipAddress}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics placeholder */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{instance.status.toLowerCase()}</div>
                <p className="text-xs text-muted-foreground">Current state</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Region</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{instance.region}</div>
                <p className="text-xs text-muted-foreground">Deployment region</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Instance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instance Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant(instance.status)}>
                  {instance.status.toLowerCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{instance.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{instance.aiModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(instance.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {new Date(instance.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isStopped && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleStart}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "start" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Start Instance
                </Button>
              )}
              {isRunning && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleStop}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "stop" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Stop Instance
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive"
                onClick={handleDelete}
                disabled={actionLoading !== null}
              >
                {actionLoading === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Instance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
