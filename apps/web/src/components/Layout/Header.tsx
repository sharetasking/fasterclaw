"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onOpen: () => void;
};

const Header = ({ onOpen }: Props) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-card border-b lg:hidden">
      <div className="flex items-center h-full px-4">
        <Button variant="ghost" size="icon" onClick={onOpen}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="ml-4 font-bold text-lg flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span>FasterClaw</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
