'use client';
import { useEffect } from 'react';
import type { UIMessage } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';

export type DataPart = { type: 'append-message'; message: string };

export interface Props {
  autoResume: boolean;
  initialMessages: UIMessage[];
  experimental_resume: UseChatHelpers['experimental_resume'];
  data: UseChatHelpers['data'];
  setMessages: UseChatHelpers['setMessages'];
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
}: Props) {
  useEffect(() => {
    if (!autoResume) return;
    const mostRecentMessage = initialMessages.at(-1);
    if (mostRecentMessage?.role === 'user') {
      experimental_resume();
    }
    // Run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const dataPart = data[0] as DataPart;
    if (dataPart.type === 'append-message') {
      const message = JSON.parse(dataPart.message) as UIMessage;
      // Only update if the last message is not the same
      const lastMessage = initialMessages[initialMessages.length - 1];
      if (!lastMessage || lastMessage.id !== message.id) {
        setMessages([...initialMessages, message]);
      }
    }
  }, [data, initialMessages, setMessages]);
}
