"use server";

import { cookies } from "next/headers";

export type AuthResponse = {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    const data = await response.json();

    // Set auth token cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An error occurred during login",
    };
  }
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }

    const data = await response.json();

    // Set auth token cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An error occurred during registration",
    };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}
