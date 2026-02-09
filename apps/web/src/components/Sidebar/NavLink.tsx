import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  value: {
    title: string;
    icon: string;
    href: string;
  };
  onClick?: () => void;
  collapsed?: boolean;
};

const NavLink = ({ value, onClick, collapsed = false }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === value.href;

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[value.icon] || LucideIcons.Circle;

  return (
    <Link
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-2" : "hover:bg-accent",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      href={value.href}
      onClick={onClick}
      title={collapsed ? value.title : undefined}
    >
      <IconComponent className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{value.title}</span>}
    </Link>
  );
};

export default NavLink;
