"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { authenticatedApiClient } from "@/lib/api";
import toast from "react-hot-toast";

interface Subscription {
  id: string;
  status: string;
  plan: string;
  instanceLimit: number;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

type PlanId = "starter" | "pro" | "enterprise";

const plans: { id: PlanId; name: string; price: number; instanceLimit: number; features: string[]; popular?: boolean }[] = [
  {
    id: "starter",
    name: "Starter",
    price: 39,
    instanceLimit: 2,
    features: [
      "2 OpenClaw instances",
      "Telegram bot support",
      "GPT-4o & Claude models",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    instanceLimit: 10,
    popular: true,
    features: [
      "10 OpenClaw instances",
      "Telegram bot support",
      "All AI models",
      "Priority support",
      "Custom bot names",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    instanceLimit: -1,
    features: [
      "Unlimited instances",
      "All platforms (coming soon)",
      "All AI models",
      "24/7 dedicated support",
      "SLA guarantee",
    ],
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await authenticatedApiClient.get<{ subscription: Subscription | null }>(
        "/billing/subscription"
      );
      setSubscription(data.subscription);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const data = await authenticatedApiClient.post<{ url: string }>("/billing/portal");
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planId: PlanId) => {
    setCheckoutLoading(planId);
    try {
      const data = await authenticatedApiClient.post<{ url: string }>("/billing/checkout", {
        plan: planId,
      });
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    {subscription
                      ? `You are on the ${subscription.plan || "Free"} plan`
                      : "You don't have an active subscription"}
                  </CardDescription>
                </div>
                {subscription && (
                  <Badge
                    variant={subscription.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {subscription.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">
                      {subscription.plan || "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Instance Limit</span>
                    <span className="font-medium">
                      {subscription.instanceLimit === -1 ? "Unlimited" : subscription.instanceLimit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Next billing date</span>
                    <span className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  {subscription.cancelAtPeriodEnd && (
                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                      <p className="text-sm text-destructive">
                        Your subscription will be canceled on{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Manage Subscription
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    Subscribe to a plan below to create OpenClaw bot instances
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>
                {subscription ? "Change Plan" : "Choose a Plan"}
              </CardTitle>
              <CardDescription>
                {subscription
                  ? "Upgrade or downgrade your plan at any time"
                  : "Select a plan to get started with FasterClaw"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isCurrent =
                    subscription?.plan?.toLowerCase() === plan.id;
                  const isLoading = checkoutLoading === plan.id;
                  return (
                    <div
                      key={plan.name}
                      className={`p-4 border rounded-lg relative ${
                        isCurrent ? "border-primary bg-primary/5" : ""
                      } ${plan.popular && !isCurrent ? "border-primary" : ""}`}
                    >
                      {plan.popular && !isCurrent && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <Badge variant="default" className="text-xs">Popular</Badge>
                        </div>
                      )}
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-4">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Badge className="w-full justify-center">Current Plan</Badge>
                      ) : subscription ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleManageBilling}
                          disabled={portalLoading}
                        >
                          {portalLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Change Plan
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                          variant={plan.popular ? "default" : "outline"}
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={isLoading || checkoutLoading !== null}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Subscribe
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Usage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instance Limit</span>
                <span className="font-medium">
                  {subscription?.instanceLimit === -1 ? "Unlimited" : `${subscription?.instanceLimit || 0} instances`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">
                  {subscription?.plan || "None"}
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
              {!subscription && (
                <Button
                  className="w-full justify-start"
                  onClick={() => handleSubscribe("pro")}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === "pro" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Subscribe to Pro (Recommended)
                </Button>
              )}
              {subscription && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing Portal
                  </Button>
                  {!subscription.cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
