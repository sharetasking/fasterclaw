"use client";

import { useState } from "react";
import Sidebar from "../Sidebar";
import Header from "./Header";
import { SidebarProvider, useSidebar } from "../Sidebar/SidebarContext";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

const LayoutContent = ({ children }: Props) => {
  const [visible, setVisible] = useState(false);
  const { collapsed, isHydrated } = useSidebar();

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-300",
        collapsed ? "lg:pl-20" : "lg:pl-64",
        "lg:pt-0 pt-16",
        isHydrated ? "opacity-100" : "opacity-0"
      )}
    >
      <Header onOpen={() => setVisible(true)} />
      <Sidebar visible={visible} onClose={() => setVisible(false)} />

      {/* Overlay for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setVisible(false)}
      />

      {children}
    </div>
  );
};

const Layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

export default Layout;
