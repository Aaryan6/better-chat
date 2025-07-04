"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuAuth,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import {
  ChevronUpIcon,
  MessageSquareTextIcon, // Placeholder for chat item icon
  MoreHorizontalIcon,
  PlusIcon,
  ShareIcon,
  CopyIcon,
  LockIcon,
  EyeOffIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

interface ChatItem {
  id: string;
  title: string;
  sharePath?: string | null;
  createdAt: string;
}

interface GroupedChats {
  [key: string]: ChatItem[];
}

// Utility function to group chats by time periods
const groupChatsByTime = (chats: ChatItem[]): GroupedChats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const groups: GroupedChats = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last month": [],
    Older: [],
  };

  chats.forEach((chat) => {
    const chatDate = new Date(chat.createdAt);

    if (chatDate >= today) {
      groups.Today.push(chat);
    } else if (chatDate >= yesterday) {
      groups.Yesterday.push(chat);
    } else if (chatDate >= lastWeek) {
      groups["Last 7 days"].push(chat);
    } else if (chatDate >= lastMonth) {
      groups["Last month"].push(chat);
    } else {
      groups.Older.push(chat);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
};

export function ChatSidebar() {
  const { user, isLoaded: userLoaded } = useUser();
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [makingPrivateChatId, setMakingPrivateChatId] = useState<string | null>(
    null
  );
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const {
    data: chats,
    isLoading,
    error,
  } = useSWR<ChatItem[]>(
    user ? "/api/history" : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        // Handle network errors gracefully
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }
        throw new Error("Failed to fetch chat history");
      }
      return res.json();
    },
    {
      // Reduce retry attempts for offline scenarios
      errorRetryCount: 1,
      errorRetryInterval: 5000,
      // Don't refetch on window focus when offline
      revalidateOnFocus: navigator.onLine,
    }
  );
  const { chatId } = useParams();

  // Check if we're offline
  const isOffline = error?.message === "OFFLINE" || !navigator.onLine;

  // Group chats by time periods
  const groupedChats = chats ? groupChatsByTime(chats) : {};

  const handleShareChat = async (chatId: string) => {
    if (!user) {
      toast.error("Please sign in to share chats");
      return;
    }

    setSharingChatId(chatId);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      const { shareUrl } = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      // Refresh the chat list to update the UI
      mutate("/api/history");

      toast.success("Share link copied to clipboard!", {
        description: `Anyone with this link can view this chat.`,
        position: "top-center",
      });
    } catch (error: any) {
      console.error("Share error:", error);
      toast.error("Failed to create share link", {
        description: error.message || "Please try again",
        position: "top-center",
      });
    } finally {
      setSharingChatId(null);
    }
  };

  const handleMakePrivate = async (chatId: string) => {
    if (!user) {
      toast.error("Please sign in to manage chat privacy");
      return;
    }

    setMakingPrivateChatId(chatId);
    try {
      const response = await fetch("/api/share", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error("Failed to make chat private");
      }

      // Refresh the chat list to update the UI
      mutate("/api/history");

      toast.success("Chat is now private", {
        description: `This chat is no longer shared`,
        position: "top-center",
      });
    } catch (error: any) {
      console.error("Make private error:", error);
      toast.error("Failed to make chat private", {
        description: error.message || "Please try again",
        position: "top-center",
      });
    } finally {
      setMakingPrivateChatId(null);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) {
      toast.error("Please sign in to delete chats");
      return;
    }

    setDeletingChatId(chatId);
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      // Refresh the chat list to update the UI
      mutate("/api/history");

      toast.success("Chat deleted", {
        position: "bottom-right",
      });
    } catch (error: any) {
      console.error("Delete chat error:", error);
      toast.error("Failed to delete chat", {
        description: error.message || "Please try again",
        position: "top-center",
      });
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <Sidebar className="w-full md:w-[var(--sidebar-width)] border-r flex flex-col h-screen">
      <div className="p-4 flex items-center justify-between">
        <Link href={"/"} className="text-xl font-semibold">
          Better Chat
        </Link>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hidden sm:flex"
        >
          <Link href="/">
            <PlusIcon className="h-5 w-5" />
            <span className="sr-only">New Chat</span>
          </Link>
        </Button>
        <div className="sm:hidden">
          <ThemeToggle />
        </div>
      </div>

      <SidebarContent className="flex-grow overflow-y-auto p-4 space-y-2">
        {user && isLoading && !isOffline && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 px-2" />
              <SidebarMenu>
                {Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuItem key={`skeleton-recent-${index}`}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 px-2" />
              <SidebarMenu>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuItem key={`skeleton-older-${index}`}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </div>
        )}
        {!userLoaded && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 px-2" />
              <SidebarMenu>
                {Array.from({ length: 2 }).map((_, index) => (
                  <SidebarMenuItem key={`skeleton-loading-${index}`}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </div>
        )}
        {userLoaded && !user && (
          <p className="text-xs text-muted-foreground text-center px-2 py-4">
            {isOffline
              ? "Offline mode - Start a new chat!"
              : "Sign in to save your chats."}
          </p>
        )}
        {isOffline && user && (
          <p className="text-xs text-muted-foreground text-center px-2 py-4">
            Offline mode - Chat history unavailable.
            <br />
            <span className="text-primary">Start a new chat!</span>
          </p>
        )}
        {!isLoading && !isOffline && chats?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center px-2 py-4">
            No chat history found. Start a new chat!
          </p>
        )}
        {!isLoading && !isOffline && chats && chats?.length > 0 && (
          <div className="space-y-4">
            {Object.entries(groupedChats).map(([timeGroup, groupChats]) => (
              <div key={timeGroup} className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground px-2 py-1 sticky top-0 backdrop-blur-sm">
                  {timeGroup}
                </h3>
                <SidebarMenu>
                  {groupChats.map((chat) => (
                    <SidebarMenuItem
                      key={chat.id}
                      className={cn("relative rounded-lg")}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={chatId === chat.id}
                        className="w-full justify-start h-10 text-sm truncate pr-10"
                      >
                        <Link href={`/chat/${chat.id}`}>
                          <MessageSquareTextIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate flex-grow">
                            {chat.title}
                          </span>
                          {chat.sharePath && (
                            <ShareIcon className="h-3 w-3 ml-1 text-muted-foreground flex-shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {chat.sharePath ? (
                            // Chat is already shared - show make private option
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMakePrivate(chat.id);
                              }}
                              disabled={makingPrivateChatId === chat.id}
                            >
                              {makingPrivateChatId === chat.id ? (
                                <EyeOffIcon className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <LockIcon className="h-4 w-4 mr-2" />
                              )}
                              {makingPrivateChatId === chat.id
                                ? "Making Private..."
                                : "Make Private"}
                            </DropdownMenuItem>
                          ) : (
                            // Chat is not shared - show share option
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareChat(chat.id);
                              }}
                              disabled={sharingChatId === chat.id}
                            >
                              {sharingChatId === chat.id ? (
                                <CopyIcon className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ShareIcon className="h-4 w-4 mr-2" />
                              )}
                              {sharingChatId === chat.id
                                ? "Sharing..."
                                : "Share Chat"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(chat.id);
                            }}
                            disabled={deletingChatId === chat.id}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            {deletingChatId === chat.id ? (
                              <TrashIcon className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <TrashIcon className="h-4 w-4 mr-2" />
                            )}
                            {deletingChatId === chat.id
                              ? "Deleting..."
                              : "Delete Chat"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            ))}
          </div>
        )}
      </SidebarContent>

      <SidebarSeparator className="ml-0" />

      <SidebarFooter className="pb-2">
        {userLoaded && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={user?.imageUrl}
                      alt={user?.fullName || "User"}
                    />
                    <AvatarFallback>
                      {user?.fullName?.charAt(0) ||
                        user?.firstName?.charAt(0) ||
                        user?.lastName?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user?.fullName || user?.firstName || "User"}
                  </span>
                </div>
                <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-2" align="end">
              <SignedIn>
                <DropdownMenuAuth />
              </SignedIn>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          userLoaded && (
            <div className="flex flex-col gap-2">
              <SignedOut>
                {!isOffline ? (
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </SignInButton>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Offline Mode
                  </Button>
                )}
              </SignedOut>
            </div>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
