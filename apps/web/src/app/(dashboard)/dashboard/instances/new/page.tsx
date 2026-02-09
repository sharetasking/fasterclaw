"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Server } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createInstance } from "@/actions/instances.actions";

const regions = [
  { value: "iad", label: "US East (Virginia)" },
  { value: "lax", label: "US West (Los Angeles)" },
  { value: "lhr", label: "Europe (London)" },
  { value: "sin", label: "Asia Pacific (Singapore)" },
];

const models = [
  { value: "claude-sonnet-4", label: "Claude Sonnet 4", description: "Balanced performance" },
  { value: "claude-opus-4", label: "Claude Opus 4", description: "Most capable model" },
  { value: "claude-haiku-4", label: "Claude Haiku 4", description: "Fastest responses" },
];

export default function NewInstancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    region: "iad",
    aiModel: "claude-sonnet-4",
    telegramBotToken: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.telegramBotToken.trim()) {
      toast.error("Telegram bot token is required");
      return;
    }

    setLoading(true);

    try {
      const result = await createInstance({
        name: formData.name,
        region: formData.region,
        aiModel: formData.aiModel,
        telegramBotToken: formData.telegramBotToken,
      });

      if (result) {
        toast.success("Instance created successfully!");
        router.push("/dashboard");
      } else {
        toast.error("Failed to create instance");
      }
    } catch (error) {
      toast.error("Failed to create instance");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold">Create New Instance</h1>
        <p className="text-muted-foreground mt-1">
          Deploy a new Claude AI instance in under a minute
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Instance Configuration
            </CardTitle>
            <CardDescription>
              Configure your Claude AI instance settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instance Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Instance Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your instance
                </p>
              </div>

              {/* Telegram Bot Token */}
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                <Input
                  id="telegramBotToken"
                  type="password"
                  placeholder="e.g., 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  value={formData.telegramBotToken}
                  onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Get this from @BotFather on Telegram. This token will be passed securely to your instance.
                </p>
              </div>

              {/* Region Selection */}
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                >
                  {regions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Choose the region closest to your users for best performance
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Model</Label>
                <div className="space-y-2">
                  {models.map((model) => (
                    <label
                      key={model.value}
                      className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.value}
                        checked={formData.aiModel === model.value}
                        onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{model.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {model.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Instance..." : "Create Instance"}
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
              <li>Your instance will be provisioned in the selected region</li>
              <li>A Fly.io machine will be created with your Telegram bot</li>
              <li>Your instance will be available in approximately 30 seconds</li>
              <li>The bot will start responding to messages on Telegram</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
