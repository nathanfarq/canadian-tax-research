"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/utils/cn";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  open,
  onOpenChange,
}: DropdownMenuProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-40 p-1"
        sideOffset={4}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export function DropdownMenuItem({
  className,
  destructive,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm",
        "outline-none transition-colors",
        "hover:bg-accent focus:bg-accent",
        destructive && "text-destructive hover:bg-destructive/10 focus:bg-destructive/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
