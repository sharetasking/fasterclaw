"use server";

import {
  getBillingSubscription,
  getBillingInvoices,
  postBillingCheckout,
  postBillingPortal,
  type SubscriptionResponse,
  type Invoice,
  type CreateCheckoutRequest,
} from "@fasterclaw/api-client";
import { createAuthenticatedClient } from "@/lib/api-client";

// NOTE: Types are NOT re-exported from Server Actions files.
// Import types directly from @fasterclaw/api-client instead.

// Local type alias for internal use
type PlanType = CreateCheckoutRequest["plan"];

export async function getSubscription(): Promise<SubscriptionResponse | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await getBillingSubscription({ client });

    if (!data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Get subscription error:", error);
    return null;
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await getBillingInvoices({ client });

    if (!data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get invoices error:", error);
    return [];
  }
}

export async function createCheckoutSession(plan: PlanType): Promise<string | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await postBillingCheckout({
      client,
      body: { plan },
    });

    if (!data) {
      return null;
    }

    return data.url;
  } catch (error) {
    console.error("Create checkout session error:", error);
    return null;
  }
}

export async function createPortalSession(): Promise<string | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await postBillingPortal({ client });

    if (!data) {
      return null;
    }

    return data.url;
  } catch (error) {
    console.error("Create portal session error:", error);
    return null;
  }
}
