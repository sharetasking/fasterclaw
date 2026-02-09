import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Server, Activity, Clock } from "lucide-react";
import { getInstances } from "@/actions/instances.actions";

function statusVariant(status: string) {
  switch (status.toUpperCase()) {
    case "RUNNING":
      return "default" as const;
    case "CREATING":
    case "PROVISIONING":
    case "STARTING":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

export default async function DashboardPage() {
  const instances = await getInstances();
  const runningCount = instances.filter(
    (i) => i.status.toUpperCase() === "RUNNING"
  ).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Instances</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Claude AI instances
          </p>
        </div>
        <Link href="/dashboard/instances/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Instance
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instances.length}</div>
            <p className="text-xs text-muted-foreground">
              {runningCount} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningCount}</div>
            <p className="text-xs text-muted-foreground">
              Active instances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instances.length - runningCount}</div>
            <p className="text-xs text-muted-foreground">
              Inactive instances
            </p>
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
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No instances yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Claude AI instance to get started
              </p>
              <Link href="/dashboard/instances/new">
                <Button>Create Instance</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => (
                <Link
                  key={instance.id}
                  href={`/dashboard/instances/${instance.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Server className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{instance.name}</h3>
                          <Badge variant={statusVariant(instance.status)}>
                            {instance.status.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {instance.region} &bull; {instance.aiModel}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created {new Date(instance.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
