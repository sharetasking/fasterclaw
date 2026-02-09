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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || "Invalid credentials",
      };
    }

    const data = await response.json();

    // Set auth token cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", data.accessToken, {
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
        error: error.error || "Registration failed",
      };
    }

    const data = await response.json();

    // Set auth token cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", data.accessToken, {
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

export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

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

export async function updateProfile(name: string): Promise<AuthResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to update profile" };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "An error occurred while updating profile" };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to update password" };
    }

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, error: "An error occurred while updating password" };
  }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to delete account" };
    }

    // Clear the auth cookie
    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete("auth_token");

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "An error occurred while deleting account" };
  }
}
