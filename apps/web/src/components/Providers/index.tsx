"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

interface Props {
  children: React.ReactNode;
}

const Providers = ({ children }: Props) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--color-card)",
            color: "var(--color-card-foreground)",
            border: "1px solid var(--color-border)",
          },
          success: {
            iconTheme: {
              primary: "var(--color-primary)",
              secondary: "var(--color-primary-foreground)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--color-destructive)",
              secondary: "var(--color-destructive-foreground)",
            },
          },
        }}
      />
    </ThemeProvider>
  );
};

export default Providers;
