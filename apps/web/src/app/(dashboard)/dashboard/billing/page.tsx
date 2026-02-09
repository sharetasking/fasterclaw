import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Download, ExternalLink } from "lucide-react";
import {
  getSubscription,
  getInvoices,
  type PlanType,
  type PlanConfig,
} from "@/actions/billing.actions";
import { BillingActions } from "./billing-actions";

// Default plans if API doesn't return them (shouldn't happen but good fallback)
const DEFAULT_PLANS: Record<PlanType, PlanConfig> = {
  starter: {
    name: "Starter",
    priceId: "",
    price: 39,
    instanceLimit: 2,
    features: [
      "Up to 100K requests/month",
      "2 Claude instances",
      "Basic analytics",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    priceId: "",
    price: 79,
    instanceLimit: 10,
    features: [
      "Up to 1M requests/month",
      "10 Claude instances",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: "",
    price: 149,
    instanceLimit: -1,
    features: [
      "Unlimited requests",
      "Unlimited instances",
      "Custom analytics",
      "24/7 dedicated support",
      "SLA guarantee",
    ],
  },
};

export default async function BillingPage() {
  const [subscriptionData, invoices] = await Promise.all([
    getSubscription(),
    getInvoices(),
  ]);

  const subscription = subscriptionData?.subscription;
  const plans = subscriptionData?.plans || DEFAULT_PLANS;
  const currentPlan = subscription?.plan || null;

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
                      ? `You are currently on the ${currentPlan || "free"} plan`
                      : "You don't have an active subscription"}
                  </CardDescription>
                </div>
                {subscription && (
                  <Badge
                    variant={
                      subscription.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
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
                    <span className="font-medium capitalize">
                      {currentPlan || "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Billing cycle
                    </span>
                    <span className="font-medium">Monthly</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Next billing date
                    </span>
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
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Subscribe to a plan to get started with FasterClaw.
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <BillingActions hasSubscription={!!subscription} />
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                {subscription
                  ? "Upgrade or downgrade your plan at any time"
                  : "Choose a plan to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {(Object.entries(plans) as [PlanType, PlanConfig][]).map(
                  ([planKey, plan]) => {
                    const isCurrent = currentPlan === planKey;
                    return (
                      <div
                        key={planKey}
                        className={`p-4 border rounded-lg ${
                          isCurrent ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <div className="mt-2">
                            <span className="text-3xl font-bold">
                              ${plan.price}
                            </span>
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
                          <Badge className="w-full justify-center">
                            Current Plan
                          </Badge>
                        ) : (
                          <BillingActions
                            planToSelect={planKey}
                            hasSubscription={!!subscription}
                          />
                        )}
                      </div>
                    );
                  }
                )}
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
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            ${invoice.amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            invoice.status === "paid" ? "default" : "secondary"
                          }
                        >
                          {invoice.status}
                        </Badge>
                        {invoice.invoiceUrl && (
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
                  No invoices yet. Subscribe to a plan to see your billing
                  history.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your payment method through the Stripe portal.
                  </p>
                  <BillingActions portalOnly hasSubscription={true} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Subscribe to a plan to add a payment method.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/pricing">
                <Button variant="outline" className="w-full justify-start">
                  View All Plans
                </Button>
              </Link>
              {subscription && (
                <BillingActions
                  portalOnly
                  hasSubscription={true}
                  buttonText="Manage Billing Portal"
                  buttonClassName="w-full justify-start"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
