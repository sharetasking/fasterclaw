"use server";

import { cookies } from "next/headers";

export type Subscription = {
  id: string;
  plan: "starter" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export type Invoice = {
  id: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  createdAt: string;
  paidAt?: string;
  invoiceUrl: string;
};

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value || null;
}

export async function getSubscription(): Promise<Subscription | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscription`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
  plan: "starter" | "pro" | "enterprise"
): Promise<string | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      throw new Error("Failed to create checkout session");
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
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to create portal session");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Create portal session error:", error);
    return null;
  }
}

export async function cancelSubscription(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscription/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return false;
  }
}

export async function resumeSubscription(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscription/resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Resume subscription error:", error);
    return false;
  }
}
