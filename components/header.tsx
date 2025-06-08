import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  return (
    <div className="w-full h-[54px] border-b">
      <div className="flex justify-between items-center h-full px-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <SidebarTrigger/>
          <Link href="/" className="flex flex-row items-center gap-2 font-semibold">
            Better Chat
          </Link>
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
          <ThemeToggle/>
        </div>
      </div>
    </div>
  );
};
