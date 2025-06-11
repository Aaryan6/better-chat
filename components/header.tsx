"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useState } from "react";
import { WifiOffIcon, WifiIcon } from "lucide-react";

export const Header = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="w-full h-[54px] border-b z-50 bg-background absolute w-full top-0">
      <div className="flex justify-between items-center h-full px-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <SidebarTrigger />
          <Link
            href="/"
            className="flex flex-row items-center gap-2 font-semibold"
          >
            Better Chat
          </Link>
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-md text-xs font-medium">
              <WifiOffIcon className="w-3 h-3" />
              Offline Mode
            </div>
          )}
        </div>
        <div className="flex flex-row items-center gap-4 shrink-0">
          {/* <SignedOut>
            <Link href="/sign-in" className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:underline">
              Sign In
            </Link>
            <Link href="/sign-up" className="text-sm font-medium bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-md hover:opacity-90">
              Sign Up
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn> */}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
