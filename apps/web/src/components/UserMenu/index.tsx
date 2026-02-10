"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { getCurrentUser, logout } from "@/actions/auth.actions";
import { type User } from "@fasterclaw/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserWithAvatar extends User {
  avatar?: string;
}

interface Props {
  collapsed?: boolean;
}

export default function UserMenu({ collapsed = false }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UserWithAvatar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void getCurrentUser()
      .then((data) => {
        setUser(data as UserWithAvatar | null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push("/sign-in");
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading skeleton while fetching user
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 w-full rounded-md px-2 py-2",
          collapsed && "justify-center"
        )}
      >
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        {!collapsed && (
          <div className="flex-1 space-y-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Use fallback values if user data is not available
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-md px-2 py-2 text-left hover:bg-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8">
            {user?.avatar != null && user.avatar !== "" && (
              <AvatarImage src={user.avatar} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {displayEmail !== "" && (
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              )}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "center" : "start"} side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {displayEmail !== "" && (
              <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/dashboard/settings");
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isPending}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
