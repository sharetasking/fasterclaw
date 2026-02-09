import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Server, Activity, Clock } from "lucide-react";

// Mock data - replace with actual data fetching
const instances = [
  {
    id: "inst_1",
    name: "Production API",
    status: "running",
    region: "us-east-1",
    requests: "1.2M",
    uptime: "99.9%",
    createdAt: "2024-01-15",
  },
  {
    id: "inst_2",
    name: "Development",
    status: "running",
    region: "us-west-2",
    requests: "45K",
    uptime: "99.8%",
    createdAt: "2024-01-20",
  },
  {
    id: "inst_3",
    name: "Staging",
    status: "stopped",
    region: "eu-west-1",
    requests: "12K",
    uptime: "N/A",
    createdAt: "2024-01-25",
  },
];

export default function DashboardPage() {
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
              {instances.filter(i => i.status === "running").length} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.3M</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
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
                          <Badge
                            variant={instance.status === "running" ? "default" : "secondary"}
                          >
                            {instance.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {instance.region} • {instance.requests} requests • {instance.uptime} uptime
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
