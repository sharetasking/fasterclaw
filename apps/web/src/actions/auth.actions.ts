"use server";

import { cookies } from "next/headers";
import {
  postAuthLogin,
  postAuthRegister,
  getAuthMe,
  patchAuthProfile,
  patchAuthPassword,
  deleteAuthAccount,
  type User,
} from "@fasterclaw/api-client";
import { createAuthenticatedClient, getApiClient } from "@/lib/api-client";

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const client = getApiClient();
    const { data, error } = await postAuthLogin({
      client,
      body: { email, password },
    });

    if (!data) {
      return {
        success: false,
        error: error.error,
      };
    }

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
    const client = getApiClient();
    const { data, error } = await postAuthRegister({
      client,
      body: { name, email, password },
    });

    if (!data) {
      return {
        success: false,
        error: error.error,
      };
    }

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

export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await getAuthMe({ client });

    if (!data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export async function updateProfile(name: string): Promise<AuthResponse> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await patchAuthProfile({
      client,
      body: { name },
    });

    if (!data) {
      return {
        success: false,
        error: error.error,
      };
    }

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error("Update profile error:", error);
    return {
      success: false,
      error: "An error occurred while updating profile",
    };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await patchAuthPassword({
      client,
      body: { currentPassword, newPassword },
    });

    if (error) {
      return {
        success: false,
        error: error.error,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      success: false,
      error: "An error occurred while updating password",
    };
  }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteAuthAccount({ client });

    if (error) {
      return {
        success: false,
        error: error.error,
      };
    }

    // Clear the auth cookie
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      error: "An error occurred while deleting account",
    };
  }
}
