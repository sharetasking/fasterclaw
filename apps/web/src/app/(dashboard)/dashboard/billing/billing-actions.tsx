"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createCheckoutSession, createPortalSession } from "@/actions/billing.actions";
import { type CreateCheckoutRequest } from "@fasterclaw/api-client";

type PlanType = CreateCheckoutRequest["plan"];

interface BillingActionsProps {
  hasSubscription: boolean;
  planToSelect?: PlanType;
  portalOnly?: boolean;
  buttonText?: string;
  buttonClassName?: string;
}

export function BillingActions({
  hasSubscription,
  planToSelect,
  portalOnly = false,
  buttonText,
  buttonClassName,
}: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = (plan: PlanType) => {
    setLoading(true);
    void (async () => {
      try {
        const result = await createCheckoutSession(plan);
        if (result.success) {
          window.location.href = result.data;
        } else {
          console.error("Checkout error:", result.error);
        }
      } catch (error) {
        console.error("Checkout error:", error);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handlePortal = () => {
    setLoading(true);
    void (async () => {
      try {
        const result = await createPortalSession();
        if (result.success) {
          window.location.href = result.data;
        } else {
          console.error("Portal error:", result.error);
        }
      } catch (error) {
        console.error("Portal error:", error);
      } finally {
        setLoading(false);
      }
    })();
  };

  // Portal-only mode
  if (portalOnly) {
    return (
      <Button
        variant="outline"
        onClick={handlePortal}
        disabled={loading}
        className={buttonClassName}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonText ?? "Update Payment Method"}
      </Button>
    );
  }

  // Plan selection mode
  if (planToSelect) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          handleCheckout(planToSelect);
        }}
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {hasSubscription ? "Switch to this Plan" : "Select Plan"}
      </Button>
    );
  }

  // Default mode - show appropriate actions based on subscription status
  if (hasSubscription) {
    return (
      <>
        <Button variant="outline" onClick={handlePortal} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Plan
        </Button>
        <Button variant="outline" onClick={handlePortal} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Payment Method
        </Button>
      </>
    );
  }

  return null;
}
