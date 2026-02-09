"use server";

import { cookies } from "next/headers";

export type PlanType = "starter" | "pro" | "enterprise";

export type PlanConfig = {
  name: string;
  priceId: string;
  price: number;
  instanceLimit: number;
  features: string[];
};

export type Subscription = {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  plan: PlanType | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
};

export type SubscriptionResponse = {
  subscription: Subscription | null;
  plans: Record<PlanType, PlanConfig>;
};

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value || null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getSubscription(): Promise<SubscriptionResponse | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/billing/subscription`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch subscription");
    }

    return await response.json();
  } catch (error) {
    console.error("Get subscription error:", error);
    return null;
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/billing/invoices`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch invoices");
    }

    return await response.json();
  } catch (error) {
    console.error("Get invoices error:", error);
    return [];
  }
}

export async function createCheckoutSession(
  plan: PlanType
): Promise<string | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ plan }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create checkout session");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Create checkout session error:", error);
    return null;
  }
}

export async function createPortalSession(): Promise<string | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/billing/portal`,
      {
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create portal session");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Create portal session error:", error);
    return null;
  }
}
