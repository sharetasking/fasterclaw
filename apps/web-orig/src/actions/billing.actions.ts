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

/**
 * Result type for actions that may fail.
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object" && "error" in error) {
    return String((error as { error: unknown }).error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export async function getSubscription(): Promise<ActionResult<SubscriptionResponse>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getBillingSubscription({ client });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    // data is always present when there's no error
    return { success: true, data };
  } catch (error) {
    console.error("Get subscription error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getInvoices(): Promise<ActionResult<Invoice[]>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getBillingInvoices({ client });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Get invoices error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function createCheckoutSession(plan: PlanType): Promise<ActionResult<string>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postBillingCheckout({
      client,
      body: { plan },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: data.url };
  } catch (error) {
    console.error("Create checkout session error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function createPortalSession(): Promise<ActionResult<string>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postBillingPortal({ client });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: data.url };
  } catch (error) {
    console.error("Create portal session error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
