"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, ExternalLink, Download } from "lucide-react";
import {
  getSubscription,
  getInvoices,
  createCheckoutSession,
  createPortalSession,
} from "@/actions/billing.actions";
import toast from "react-hot-toast";
import type {
  Subscription,
  Invoice,
  PlanConfig,
  CreateCheckoutRequest,
} from "@fasterclaw/api-client";

type PlanId = CreateCheckoutRequest["plan"];

const DEFAULT_PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    name: "Starter",
    priceId: "",
    price: 39,
    instanceLimit: 2,
    features: [
      "2 OpenClaw instances",
      "Telegram bot support",
      "GPT-4o & Claude models",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    priceId: "",
    price: 79,
    instanceLimit: 10,
    features: [
      "10 OpenClaw instances",
      "Telegram bot support",
      "All AI models",
      "Priority support",
      "Custom bot names",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: "",
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
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Record<PlanId, PlanConfig>>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subscriptionResult, invoiceResult] = await Promise.all([
        getSubscription(),
        getInvoices(),
      ]);

      if (subscriptionResult.success) {
        setSubscription(subscriptionResult.data.subscription);
        setPlans(subscriptionResult.data.plans as Record<PlanId, PlanConfig>);
      } else {
        toast.error(subscriptionResult.error);
      }

      if (invoiceResult.success) {
        setInvoices(invoiceResult.data);
      } else {
        toast.error(invoiceResult.error);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result.success) {
        window.location.href = result.data;
      } else {
        toast.error(result.error);
        setPortalLoading(false);
      }
    } catch {
      toast.error("Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planId: PlanId) => {
    setCheckoutLoading(planId);
    try {
      const result = await createCheckoutSession(planId);
      if (result.success) {
        window.location.href = result.data;
      } else {
        toast.error(result.error);
        setCheckoutLoading(null);
      }
    } catch {
      toast.error("Failed to start checkout");
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

  const currentPlan = subscription?.plan as PlanId | null;

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
                    {subscription !== null
                      ? `You are on the ${subscription.plan} plan`
                      : "You don't have an active subscription"}
                  </CardDescription>
                </div>
                {subscription && (
                  <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                    {subscription.status.toLowerCase()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">{subscription.plan}</span>
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
                      onClick={() => void handleManageBilling()}
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
              <CardTitle>{subscription ? "Change Plan" : "Choose a Plan"}</CardTitle>
              <CardDescription>
                {subscription
                  ? "Upgrade or downgrade your plan at any time"
                  : "Select a plan to get started with FasterClaw"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {(Object.entries(plans) as [PlanId, PlanConfig][]).map(([planId, plan]) => {
                  const isCurrent = currentPlan === planId;
                  const isLoading = checkoutLoading === planId;
                  const isPopular = planId === "pro";
                  return (
                    <div
                      key={planId}
                      className={`p-4 border rounded-lg relative ${
                        isCurrent ? "border-primary bg-primary/5" : ""
                      } ${isPopular && !isCurrent ? "border-primary" : ""}`}
                    >
                      {isPopular && !isCurrent && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <Badge variant="default" className="text-xs">
                            Popular
                          </Badge>
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
                          <li key={feature} className="flex items-start gap-2 text-sm">
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
                          onClick={() => void handleManageBilling()}
                          disabled={portalLoading}
                        >
                          {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Change Plan
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => void handleSubscribe(planId)}
                          disabled={isLoading || checkoutLoading !== null}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Subscribe
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                          {invoice.status}
                        </Badge>
                        {invoice.invoiceUrl !== null && (
                          <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {invoice.invoicePdf !== null && (
                          <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No invoices yet. Subscribe to a plan to see your billing history.
                </p>
              )}
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
                  {subscription?.instanceLimit === -1
                    ? "Unlimited"
                    : `${String(subscription?.instanceLimit ?? 0)} instances`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{subscription?.plan ?? "None"}</span>
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
                  onClick={() => void handleSubscribe("pro")}
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
                    onClick={() => void handleManageBilling()}
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
                      onClick={() => void handleManageBilling()}
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
