"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Server, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createInstance, validateTelegramToken } from "@/actions/instances.actions";

const regions = [
  { value: "iad", label: "US East (Virginia)" },
  { value: "lax", label: "US West (Los Angeles)" },
  { value: "lhr", label: "Europe (London)" },
  { value: "sin", label: "Asia Pacific (Singapore)" },
];

const models = [
  { value: "claude-sonnet-4-0", label: "Claude Sonnet 4", description: "Balanced performance" },
  { value: "claude-opus-4-0", label: "Claude Opus 4", description: "Most capable model" },
  { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", description: "Fastest responses" },
];

interface TokenValidation {
  status: "idle" | "validating" | "valid" | "invalid";
  botUsername?: string;
  botName?: string;
  error?: string;
}

export default function NewInstancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    region: "iad",
    aiModel: "claude-sonnet-4-0",
    telegramBotToken: "",
  });
  const [tokenValidation, setTokenValidation] = useState<TokenValidation>({
    status: "idle",
  });

  // Debounced token validation
  const validateToken = useCallback(async (token: string) => {
    if (token === "" || token.length < 10) {
      setTokenValidation({ status: "idle" });
      return;
    }

    setTokenValidation({ status: "validating" });

    try {
      const result = await validateTelegramToken(token);
      if (result.valid) {
        setTokenValidation({
          status: "valid",
          botUsername: result.botUsername,
          botName: result.botName,
        });
      } else {
        setTokenValidation({
          status: "invalid",
          error: result.error ?? "Invalid token",
        });
      }
    } catch {
      setTokenValidation({
        status: "invalid",
        error: "Failed to validate token",
      });
    }
  }, []);

  // Debounce effect for token validation
  useEffect(() => {
    const timer = setTimeout(() => {
      void validateToken(formData.telegramBotToken);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [formData.telegramBotToken, validateToken]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.telegramBotToken.trim() === "") {
      toast.error("Telegram bot token is required");
      return;
    }

    if (tokenValidation.status !== "valid") {
      toast.error("Please enter a valid Telegram bot token");
      return;
    }

    setLoading(true);

    void (async () => {
      try {
        const result = await createInstance({
          name: formData.name,
          region: formData.region,
          aiModel: formData.aiModel,
          telegramBotToken: formData.telegramBotToken,
        });

        if (result.success) {
          toast.success("Instance created successfully!");
          router.push("/dashboard");
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Failed to create instance");
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
            <CardDescription>Configure your Claude AI instance settings</CardDescription>
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
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your instance
                </p>
              </div>

              {/* Telegram Bot Token */}
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                <div className="relative">
                  <Input
                    id="telegramBotToken"
                    type="password"
                    placeholder="e.g., 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    value={formData.telegramBotToken}
                    onChange={(e) => {
                      setFormData({ ...formData, telegramBotToken: e.target.value });
                    }}
                    className={
                      tokenValidation.status === "valid"
                        ? "border-green-500 pr-10"
                        : tokenValidation.status === "invalid"
                          ? "border-red-500 pr-10"
                          : "pr-10"
                    }
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {tokenValidation.status === "validating" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {tokenValidation.status === "valid" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {tokenValidation.status === "invalid" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {tokenValidation.status === "valid" &&
                  tokenValidation.botUsername !== undefined && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Connected to <strong>@{tokenValidation.botUsername}</strong>
                        {tokenValidation.botName !== undefined && ` (${tokenValidation.botName})`}
                      </span>
                    </div>
                  )}
                {tokenValidation.status === "invalid" && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {tokenValidation.error ?? "Invalid bot token"}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Get this from @BotFather on Telegram. This token will be passed securely to your
                  instance.
                </p>
              </div>

              {/* Region Selection */}
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.region}
                  onChange={(e) => {
                    setFormData({ ...formData, region: e.target.value });
                  }}
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
                        onChange={(e) => {
                          setFormData({ ...formData, aiModel: e.target.value });
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{model.label}</div>
                        <div className="text-sm text-muted-foreground">{model.description}</div>
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
