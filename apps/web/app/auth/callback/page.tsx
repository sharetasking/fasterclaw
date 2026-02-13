"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/actions/auth.actions";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        router.replace(`/sign-in?error=${error}`);
        return;
      }

      if (!token) {
        router.replace("/sign-in?error=no_token");
        return;
      }

      // Set the auth token cookie via server action
      await setAuthToken(token);

      // Redirect to dashboard
      router.replace("/dashboard");
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-1 mx-auto mb-4"></div>
        <p className="text-n-4">Signing you in...</p>
      </div>
    </div>
  );
}
