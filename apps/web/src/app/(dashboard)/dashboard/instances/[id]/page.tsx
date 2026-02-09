import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, Activity, Copy, Power, RefreshCw } from "lucide-react";

// Mock data - replace with actual data fetching
const instanceData = {
  id: "inst_1",
  name: "Production API",
  status: "running",
  region: "us-east-1",
  model: "claude-3-sonnet",
  createdAt: "2024-01-15T10:30:00Z",
  apiKey: "fc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  endpoint: "https://inst-1.api.fasterclaw.com/v1",
  metrics: {
    requests24h: "45.2K",
    avgLatency: "124ms",
    uptime: "99.9%",
    lastRequest: "2 minutes ago",
  },
};

export default function InstanceDetailPage({ params }: { params: { id: string } }) {
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
                <h1 className="text-3xl font-bold">{instanceData.name}</h1>
                <Badge variant={instanceData.status === "running" ? "default" : "secondary"}>
                  {instanceData.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {instanceData.region} • {instanceData.model}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Restart
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Power className="h-4 w-4" />
              Stop
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests (24h)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{instanceData.metrics.requests24h}</div>
                <p className="text-xs text-muted-foreground">
                  Last request {instanceData.metrics.lastRequest}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{instanceData.metrics.avgLatency}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>

          {/* API Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>
                Use these credentials to connect to your instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={instanceData.apiKey}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Keep this key secret and never commit it to version control
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Endpoint</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={instanceData.endpoint}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Example */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Example code to get started with your instance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{`curl ${instanceData.endpoint}/chat \\
  -H "Authorization: Bearer ${instanceData.apiKey.substring(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${instanceData.model}",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
              </pre>
            </CardContent>
          </Card>
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
                <Badge variant={instanceData.status === "running" ? "default" : "secondary"}>
                  {instanceData.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{instanceData.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{instanceData.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">{instanceData.metrics.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(instanceData.createdAt).toLocaleDateString()}
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
              <Button variant="outline" className="w-full justify-start gap-2">
                <RefreshCw className="h-4 w-4" />
                Restart Instance
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Power className="h-4 w-4" />
                Stop Instance
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-destructive">
                Delete Instance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function Input({ value, readOnly, className }: { value: string; readOnly: boolean; className?: string }) {
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${className}`}
    />
  );
}
