"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Server, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createInstance } from "@/actions/instances.actions";

// Fly.io regions
const regions = [
  { value: "lax", label: "Los Angeles (lax)" },
  { value: "iad", label: "Washington, D.C. (iad)" },
  { value: "ord", label: "Chicago (ord)" },
  { value: "sjc", label: "San Jose (sjc)" },
  { value: "lhr", label: "London (lhr)" },
  { value: "ams", label: "Amsterdam (ams)" },
  { value: "fra", label: "Frankfurt (fra)" },
  { value: "nrt", label: "Tokyo (nrt)" },
  { value: "sin", label: "Singapore (sin)" },
  { value: "syd", label: "Sydney (syd)" },
];

export default function NewInstancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    region: "lax",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const instance = await createInstance({
        name: formData.name,
        region: formData.region,
      });

      if (instance) {
        toast.success("Instance created successfully!");
        router.push(`/dashboard/instances/${instance.id}`);
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
          Deploy a new OpenClaw instance on Fly.io
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
              Configure your OpenClaw instance settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instance Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Instance Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Bot"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  maxLength={50}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your instance (max 50
                  characters)
                </p>
              </div>

              {/* Region Selection */}
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
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

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !formData.name}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <li>A Fly.io app will be created in the selected region</li>
              <li>An OpenClaw machine will be deployed to your app</li>
              <li>Your instance will be ready in approximately 30-60 seconds</li>
              <li>You can monitor the status from the instance detail page</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
