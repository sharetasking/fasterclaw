"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Zap, Brain, Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createInstance } from "@/actions/instances.actions";

const personalities = [
  {
    value: "fast",
    label: "Quick & Efficient",
    description: "Fast responses, great for simple tasks",
    icon: Zap,
    model: "claude-3-haiku",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Best mix of speed and capability",
    icon: Sparkles,
    model: "claude-3-sonnet",
    recommended: true,
  },
  {
    value: "powerful",
    label: "Most Capable",
    description: "Handles complex conversations",
    icon: Brain,
    model: "claude-3-opus",
  },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    telegramToken: "",
    personality: "balanced",
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (/^\d+:[A-Za-z0-9_-]+$/.exec(formData.telegramToken) === null) {
      toast.error("Please enter a valid Telegram bot token");
      return;
    }

    setLoading(true);

    void (async () => {
      try {
        // Get the model based on personality selection
        const selectedPersonality = personalities.find((p) => p.value === formData.personality);
        const aiModel = selectedPersonality?.model ?? "claude-3-sonnet";

        const result = await createInstance({
          name: formData.name,
          telegramBotToken: formData.telegramToken,
          aiModel,
        });

        if (result !== null) {
          toast.success("Your agent is being created!");
          router.push("/dashboard");
        } else {
          toast.error("Failed to create agent");
        }
      } catch {
        toast.error("Failed to create agent");
      } finally {
        setLoading(false);
      }
    })();
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
        <h1 className="text-3xl font-bold">Create Your Agent</h1>
        <p className="text-muted-foreground mt-1">Set up a new AI assistant for your Telegram</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Setup
            </CardTitle>
            <CardDescription>Just a few details and your agent will be live</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Give your agent a name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support, Sales Assistant"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is just for you to identify it in your dashboard
                </p>
              </div>

              {/* Telegram Token */}
              <div className="space-y-2">
                <Label htmlFor="telegramToken">Telegram Bot Token</Label>
                <Input
                  id="telegramToken"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={formData.telegramToken}
                  onChange={(e) => {
                    setFormData({ ...formData, telegramToken: e.target.value });
                  }}
                  required
                  className="font-mono text-sm"
                />
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">How to get your token:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Open Telegram and search for <span className="font-medium">@BotFather</span>
                      </li>
                      <li>
                        Send <code className="bg-background px-1 rounded">/newbot</code> and follow
                        the prompts
                      </li>
                      <li>Copy the token BotFather gives you and paste it above</li>
                    </ol>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                    >
                      Open BotFather <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Personality Selection */}
              <div className="space-y-3">
                <Label>Choose your agent's style</Label>
                <div className="space-y-2">
                  {personalities.map((option) => {
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.personality === option.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-accent"
                        }`}
                      >
                        <input
                          type="radio"
                          name="personality"
                          value={option.value}
                          checked={formData.personality === option.value}
                          onChange={(e) => {
                            setFormData({ ...formData, personality: e.target.value });
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            formData.personality === option.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            {option.recommended === true && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1 gap-2">
                  {loading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Launch Agent
                    </>
                  )}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Your agent will be set up in about 30 seconds</li>
              <li>It will connect to your Telegram bot automatically</li>
              <li>Start chatting with your bot - your agent is ready!</li>
              <li>You can customize responses and settings anytime</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
