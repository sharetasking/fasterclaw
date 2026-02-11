import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot } from "lucide-react";
import { getInstance } from "@/actions/instances.actions";
import { redirect } from "next/navigation";
import { AgentActions } from "./agent-actions";

const statusConfig = {
  RUNNING: { label: "Live", variant: "default" as const, dot: "bg-green-500" },
  STOPPED: { label: "Paused", variant: "secondary" as const, dot: "bg-gray-400" },
  CREATING: { label: "Starting...", variant: "secondary" as const, dot: "bg-yellow-500" },
  PROVISIONING: { label: "Provisioning...", variant: "secondary" as const, dot: "bg-yellow-500" },
  STARTING: { label: "Starting...", variant: "secondary" as const, dot: "bg-yellow-500" },
  STOPPING: { label: "Stopping...", variant: "secondary" as const, dot: "bg-yellow-500" },
  FAILED: { label: "Failed", variant: "destructive" as const, dot: "bg-red-500" },
  DELETED: { label: "Deleted", variant: "secondary" as const, dot: "bg-gray-400" },
};

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getInstance(id);

  if (agent === null) {
    redirect("/dashboard");
  }

  const status = statusConfig[agent.status as keyof typeof statusConfig];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to My Agents
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{agent.name}</h1>
                <Badge variant={status.variant} className="gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {new Date(agent.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${status.dot}`} />
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {agent.status === "RUNNING"
                      ? "Your agent is active and responding to messages"
                      : agent.status === "CREATING"
                        ? "Your agent is being set up..."
                        : agent.status === "FAILED"
                          ? "Something went wrong. Try deleting and creating a new agent."
                          : "Your agent is paused and not responding to messages"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          {agent.status === "RUNNING" && (
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Your agent is live! Here's what to do next:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open your Telegram bot and send it a message</li>
                  <li>Your agent will respond automatically</li>
                  <li>Share your bot link with others to let them chat too</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Details</CardTitle>
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
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <AgentActions agentId={agent.id} status={agent.status} />
        </div>
      </div>
    </div>
  );
}
