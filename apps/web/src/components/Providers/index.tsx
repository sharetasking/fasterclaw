"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

type Props = {
  children: React.ReactNode;
};

const Providers = ({ children }: Props) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            border: "1px solid hsl(var(--border))",
          },
          success: {
            iconTheme: {
              primary: "hsl(var(--primary))",
              secondary: "hsl(var(--primary-foreground))",
            },
          },
          error: {
            iconTheme: {
              primary: "hsl(var(--destructive))",
              secondary: "hsl(var(--destructive-foreground))",
            },
          },
        }}
      />
    </ThemeProvider>
  );
};

export default Providers;
