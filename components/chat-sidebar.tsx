"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuAuth } from '@/components/ui/dropdown-menu';
import {
  ChevronUpIcon,
  MessageSquareTextIcon, // Placeholder for chat item icon
  MoreHorizontalIcon,
  PlusIcon
} from "lucide-react";
import { useState } from 'react';
import useSWR from 'swr';
import Link from "next/link";

interface ChatItem {
  id: string;
  title: string;
  // userId: string; // Not needed on client if API filters by user
  // createdAt: string; // For future sorting/grouping
}


export function ChatSidebar() {
  const { user } = useUser();
  const { data: chats, isLoading } = useSWR<ChatItem[]>('/api/history', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <Sidebar className="w-full md:w-[var(--sidebar-width)] border-r flex flex-col h-screen">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chatbot</h2>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <PlusIcon className="h-5 w-5" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>

      <SidebarContent className="flex-grow overflow-y-auto p-4 space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground px-2">Loading chats...</p>}
        {!isLoading && chats?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center px-2 py-4">
            No chat history found. Start a new chat!
          </p>
        )}
        {!isLoading && chats &&chats?.length > 0 && (
          <SidebarMenu>
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id} className="relative">
                <SidebarMenuButton 
                asChild
                  isActive={activeChatId === chat.id}
                  className="w-full justify-start h-10 text-sm truncate pr-10"
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <Link href={`/chat/${chat.id}`}>
                  <MessageSquareTextIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate flex-grow">{chat.title}</span>
                  </Link>
                </SidebarMenuButton>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); console.log('More options for', chat.title); }}
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarSeparator className="ml-0" />

      <SidebarFooter className="pb-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                  <AvatarFallback>
                    {user?.fullName?.charAt(0) || user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || 'U'}
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
        <div className="flex flex-col gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" className="w-full">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}