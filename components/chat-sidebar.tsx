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
  SidebarSeparator,
} from "@/components/ui/sidebar";
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
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { useState } from "react";

interface ChatItem {
  id: string;
  title: string;
  sharePath?: string | null;
  // userId: string; // Not needed on client if API filters by user
  // createdAt: string; // For future sorting/grouping
}

export function ChatSidebar() {
  const { user, isLoaded: userLoaded } = useUser();
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [makingPrivateChatId, setMakingPrivateChatId] = useState<string | null>(
    null
  );
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

  const handleShareChat = async (chatId: string, chatTitle: string) => {
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

  const handleMakePrivate = async (chatId: string, chatTitle: string) => {
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

  return (
    <Sidebar className="w-full md:w-[var(--sidebar-width)] border-r flex flex-col h-screen">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chatbot</h2>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <PlusIcon className="h-5 w-5" />
            <span className="sr-only">New Chat</span>
          </Link>
        </Button>
      </div>

      <SidebarContent className="flex-grow overflow-y-auto p-4 space-y-2">
        {user && isLoading && !isOffline && (
          <p className="text-xs text-muted-foreground px-2">Loading chats...</p>
        )}
        {!userLoaded && (
          <p className="text-xs text-muted-foreground px-2">Loading...</p>
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
          <SidebarMenu>
            {chats.map((chat) => (
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
                    <span className="truncate flex-grow">{chat.title}</span>
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
                          handleMakePrivate(chat.id, chat.title);
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
                          handleShareChat(chat.id, chat.title);
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
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
