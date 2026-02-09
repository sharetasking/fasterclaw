import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, Globe, Copy, ExternalLink } from "lucide-react";
import { getInstance } from "@/actions/instances.actions";
import { InstanceActions } from "./instance-actions";

const statusConfig = {
  RUNNING: {
    label: "Running",
    variant: "default" as const,
    dot: "bg-green-500",
  },
  STOPPED: {
    label: "Stopped",
    variant: "secondary" as const,
    dot: "bg-gray-400",
  },
  CREATING: {
    label: "Creating...",
    variant: "secondary" as const,
    dot: "bg-yellow-500",
  },
  FAILED: {
    label: "Failed",
    variant: "destructive" as const,
    dot: "bg-red-500",
  },
};

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const instance = await getInstance(id);

  if (!instance) {
    notFound();
  }

  const status =
    statusConfig[instance.status as keyof typeof statusConfig] ||
    statusConfig.STOPPED;

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
                <Badge variant={status.variant} className="gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Region: {instance.region} • Created{" "}
                {new Date(instance.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <InstanceActions instance={instance} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Info */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Details</CardTitle>
              <CardDescription>
                Use these details to connect to your instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {instance.flyAppName && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Fly App Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={instance.flyAppName}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        navigator.clipboard.writeText(instance.flyAppName || "")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {instance.ipAddress && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Private IP Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={instance.ipAddress}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        navigator.clipboard.writeText(instance.ipAddress || "")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!instance.flyAppName && !instance.ipAddress && (
                <p className="text-muted-foreground text-center py-4">
                  Connection details will appear once the instance is ready.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Start */}
          {instance.flyAppName && (
            <Card>
              <CardHeader>
                <CardTitle>Fly.io Dashboard</CardTitle>
                <CardDescription>
                  Manage your instance directly on Fly.io
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={`https://fly.io/apps/${instance.flyAppName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open in Fly.io Dashboard
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Instance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instance Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={status.variant} className="gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{instance.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Machine ID</span>
                <span className="font-medium font-mono text-xs">
                  {instance.flyMachineId || "Pending"}
                </span>
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
            <CardContent>
              <InstanceActions instance={instance} showFullActions />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
