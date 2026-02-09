import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Server, Globe } from "lucide-react";
import { getInstances } from "@/actions/instances.actions";

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
  DELETED: {
    label: "Deleted",
    variant: "secondary" as const,
    dot: "bg-gray-400",
  },
};

export default async function DashboardPage() {
  const instances = await getInstances();

  const runningInstances = instances.filter((i) => i.status === "RUNNING").length;
  const totalInstances = instances.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Instances</h1>
          <p className="text-muted-foreground mt-1">
            Your OpenClaw AI instances deployed on Fly.io
          </p>
        </div>
        <Link href="/dashboard/instances/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Instance
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Running Instances
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningInstances}</div>
            <p className="text-xs text-muted-foreground">
              {totalInstances} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instances
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstances}</div>
            <p className="text-xs text-muted-foreground">Deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(instances.map((i) => i.region)).size}
            </div>
            <p className="text-xs text-muted-foreground">Active regions</p>
          </CardContent>
        </Card>
      </div>

      {/* Instances List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Instances</CardTitle>
          <CardDescription>
            Click on an instance to view details and manage settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No instances yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first OpenClaw instance to start building AI
                assistants
              </p>
              <Link href="/dashboard/instances/new">
                <Button>Create Your First Instance</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => {
                const status =
                  statusConfig[instance.status as keyof typeof statusConfig] ||
                  statusConfig.STOPPED;
                return (
                  <Link
                    key={instance.id}
                    href={`/dashboard/instances/${instance.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{instance.name}</h3>
                            <Badge variant={status.variant} className="gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                              />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Region: {instance.region} • Created{" "}
                            {new Date(instance.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {instance.flyAppName || "Pending"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
