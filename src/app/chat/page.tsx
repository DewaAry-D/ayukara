'use client';

import React from 'react';
import { useChatStream } from '@/features/chat/hooks/useChatStream';
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState';
import { ChatMessageList } from '@/features/chat/components/ChatMessageList';
import { ChatInput } from '@/features/chat/components/ChatInput';

export default function ChatPage() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChatStream();

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] bg-[#1F3B3A] text-white flex flex-col justify-between">
      {messages.length === 0 ? (
        // Empty State: centered content with bottom input
        <div className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-12">
          <div className="flex-1 flex flex-col justify-center items-center">
            <ChatEmptyState onSelectSuggestion={sendMessage} />
          </div>

          <div className="w-full max-w-3xl mx-auto pt-6">
            {error && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      ) : (
        // Active Chat: message list with sticky bottom input
        <div className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4 sm:px-6">
          {/* Action bar for active chat */}
          <div className="py-4 flex justify-end items-center border-b border-white/10">
            <button
              type="button"
              onClick={clearMessages}
              className="text-xs px-3.5 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-stone-200 hover:text-white transition-all cursor-pointer"
            >
              Percakapan Baru
            </button>
          </div>

          <div className="flex-1 py-6">
            <ChatMessageList messages={messages} isLoading={isLoading} />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 z-20 w-full bg-[#1F3B3A]/95 backdrop-blur-md pt-2 pb-6">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
