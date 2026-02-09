"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bot, MessageCircle, Users, TrendingUp, ExternalLink, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

// Mock data - replace with actual data fetching
const agentData = {
  id: "agent_1",
  name: "Customer Support Bot",
  status: "live",
  platform: "Telegram",
  botUsername: "@my_support_bot",
  personality: "balanced",
  createdAt: "2024-01-15T10:30:00Z",
  stats: {
    conversationsToday: 42,
    conversationsTotal: 847,
    usersToday: 18,
    usersTotal: 234,
    avgResponseTime: "1.2s",
  },
  recentActivity: [
    { id: 1, user: "User_847", message: "Thanks for the help!", time: "2 min ago" },
    { id: 2, user: "User_846", message: "How do I reset my password?", time: "5 min ago" },
    { id: 3, user: "User_845", message: "Great service!", time: "12 min ago" },
    { id: 4, user: "User_844", message: "What are your hours?", time: "18 min ago" },
  ],
};

const statusConfig = {
  live: { label: "Live", dot: "bg-green-500" },
  paused: { label: "Paused", dot: "bg-gray-400" },
  starting: { label: "Starting...", dot: "bg-yellow-500" },
};

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const [isLive, setIsLive] = useState(agentData.status === "live");
  const [copied, setCopied] = useState(false);
  const status = statusConfig[isLive ? "live" : "paused"];

  const handleToggle = async (checked: boolean) => {
    setIsLive(checked);
    toast.success(checked ? "Agent is now live!" : "Agent paused");
  };

  const copyBotLink = () => {
    navigator.clipboard.writeText(`https://t.me/${agentData.botUsername.replace("@", "")}`);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

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
                <h1 className="text-3xl font-bold">{agentData.name}</h1>
                <Badge variant="secondary" className="gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {agentData.botUsername} on Telegram
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isLive ? "Agent is live" : "Agent paused"}
              </span>
              <Switch
                checked={isLive}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">Today</span>
                </div>
                <div className="text-2xl font-bold">{agentData.stats.conversationsToday}</div>
                <p className="text-xs text-muted-foreground">conversations</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Today</span>
                </div>
                <div className="text-2xl font-bold">{agentData.stats.usersToday}</div>
                <p className="text-xs text-muted-foreground">users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">All Time</span>
                </div>
                <div className="text-2xl font-bold">{agentData.stats.conversationsTotal}</div>
                <p className="text-xs text-muted-foreground">conversations</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Avg</span>
                </div>
                <div className="text-2xl font-bold">{agentData.stats.avgResponseTime}</div>
                <p className="text-xs text-muted-foreground">response time</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest conversations with your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{activity.user}</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share Your Bot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Share Your Bot</CardTitle>
              <CardDescription>
                Send this link to anyone who should chat with your agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm truncate">
                  t.me/{agentData.botUsername.replace("@", "")}
                </div>
                <Button variant="outline" size="icon" onClick={copyBotLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <a
                href={`https://t.me/${agentData.botUsername.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in Telegram
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Agent Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">{agentData.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span className="font-medium capitalize">{agentData.personality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total users</span>
                <span className="font-medium">{agentData.stats.usersTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(agentData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                Edit Agent Settings
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                Delete Agent
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
