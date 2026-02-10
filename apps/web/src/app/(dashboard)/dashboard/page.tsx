import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Sparkles } from "lucide-react";
import { getInstances } from "@/actions/instances.actions";

const statusConfig = {
  RUNNING: {
    label: "Live",
    variant: "default" as const,
    dot: "bg-green-500",
  },
  STOPPED: {
    label: "Paused",
    variant: "secondary" as const,
    dot: "bg-gray-400",
  },
  CREATING: {
    label: "Starting...",
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
  const agents = await getInstances();

  const liveAgents = agents.filter((a) => a.status === "RUNNING").length;
  const totalAgents = agents.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Agents</h1>
          <p className="text-muted-foreground mt-1">Your AI assistants</p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Agents</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveAgents}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Agents</CardTitle>
          <CardDescription>Click on an agent to view details and settings</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI agent to get started
              </p>
              <Link href="/dashboard/agents/new">
                <Button>Create Your First Agent</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => {
                const status = statusConfig[agent.status as keyof typeof statusConfig];
                return (
                  <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} className="block">
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge variant={status.variant} className="gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(agent.createdAt).toLocaleDateString()}
                          </p>
                        </div>
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
