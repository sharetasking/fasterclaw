import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Download } from "lucide-react";

// Mock data - replace with actual data fetching
const subscription = {
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2024-02-15",
  cancelAtPeriodEnd: false,
};

const invoices = [
  {
    id: "inv_1",
    amount: 79,
    status: "paid",
    createdAt: "2024-01-15",
    paidAt: "2024-01-15",
    invoiceUrl: "#",
  },
  {
    id: "inv_2",
    amount: 79,
    status: "paid",
    createdAt: "2023-12-15",
    paidAt: "2023-12-15",
    invoiceUrl: "#",
  },
];

const plans = [
  {
    name: "Starter",
    price: 39,
    features: [
      "Up to 100K requests/month",
      "2 Claude instances",
      "Basic analytics",
      "Email support",
    ],
    current: false,
  },
  {
    name: "Pro",
    price: 79,
    features: [
      "Up to 1M requests/month",
      "10 Claude instances",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: 149,
    features: [
      "Unlimited requests",
      "Unlimited instances",
      "Custom analytics",
      "24/7 dedicated support",
      "SLA guarantee",
    ],
    current: false,
  },
];

export default function BillingPage() {
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
                    You are currently on the {subscription.plan} plan
                  </CardDescription>
                </div>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="font-medium capitalize">{subscription.plan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Billing cycle</span>
                  <span className="font-medium">Monthly</span>
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
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">Update Payment Method</Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Upgrade or downgrade your plan at any time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`p-4 border rounded-lg ${
                      plan.current ? "border-primary bg-primary/5" : ""
                    }`}
                  >
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
                    {plan.current ? (
                      <Badge className="w-full justify-center">Current Plan</Badge>
                    ) : (
                      <Button variant="outline" className="w-full">
                        Select Plan
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                Download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        <div className="font-medium">${invoice.amount}.00</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">•••• 4242</div>
                  <div className="text-sm text-muted-foreground">Expires 12/25</div>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-3">
                Update
              </Button>
            </CardContent>
          </Card>

          {/* Usage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requests this month</span>
                <span className="font-medium">245K / 1M</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "24.5%" }} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active instances</span>
                <span className="font-medium">3 / 10</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "30%" }} />
              </div>
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
              <Button variant="outline" className="w-full justify-start">
                Manage Billing Portal
              </Button>
              {!subscription.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  Cancel Subscription
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start">
                  Resume Subscription
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
