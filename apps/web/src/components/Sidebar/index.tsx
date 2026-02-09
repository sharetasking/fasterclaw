"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Sun, Moon, Monitor, X, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import NavLink from "./NavLink";
import { navigation } from "./navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const Sidebar = ({ visible, onClose }: Props) => {
  const { collapsed, toggleCollapsed, isHydrated } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = () => {
    let newTheme: string;
    if (theme === "light") {
      newTheme = "dark";
    } else if (theme === "dark") {
      newTheme = "system";
    } else {
      newTheme = "light";
    }
    setTheme(newTheme);
  };

  const getThemeIcon = () => {
    if (!mounted) return <Sun className="h-5 w-5" />;
    if (theme === "system") return <Monitor className="h-5 w-5" />;
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
  };

  const getThemeLabel = () => {
    if (!mounted) return "Theme";
    if (theme === "system") return "System";
    if (theme === "dark") return "Dark";
    return "Light";
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 bg-card border-r transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        "max-lg:w-64 max-lg:shadow-lg",
        visible ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        isHydrated ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center h-16 px-4 border-b", collapsed && "justify-center")}>
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          {collapsed ? (
            <span className="text-xl">FC</span>
          ) : (
            <>
              <span className="text-xl">⚡</span>
              <span>FasterClaw</span>
            </>
          )}
        </Link>
        <button className="ml-auto lg:hidden" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-[calc(100vh-4rem)] p-4">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => (
            <NavLink key={item.title} value={item} collapsed={collapsed} onClick={onClose} />
          ))}
        </nav>

        {/* Theme Toggle */}
        <div className="space-y-4">
          <Separator />
          <Button
            variant="ghost"
            onClick={handleThemeToggle}
            className={cn("w-full justify-start gap-3", collapsed && "justify-center px-2")}
            title={`Switch theme (${getThemeLabel()})`}
          >
            {getThemeIcon()}
            {!collapsed && <span>{getThemeLabel()}</span>}
          </Button>
        </div>
      </div>

      {/* Collapse Toggle (Desktop Only) */}
      <button
        className={cn(
          "hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md transition-transform hover:scale-110",
          collapsed && "rotate-180"
        )}
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Sidebar;
