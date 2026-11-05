'use client';

import React, { useEffect, useRef } from 'react';
import { UiChatMessage } from '../hooks/useChatStream';
import { CreatePlanCta } from './CreatePlanCta';

export interface ChatMessageListProps {
  messages: UiChatMessage[];
  isLoading: boolean;
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function renderInlineTokens(text: string) {
    if (!text) return null;

    // Bersihkan sitasi ganda berulang
    const cleanedText = text.replace(/\[(\d+)\](?:\s*[,;]?\s*\[\1\])+/g, '[$1]');
    const tokens = cleanedText.split(/(\[[^\]]+\]\([^\)]+\)|\*\*[^*]+?\*\*|\[\d+\])/g);

    return tokens.map((token, i) => {
      // 1. Markdown link [label](url)
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C9A24A] hover:underline underline-offset-2 font-medium inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <svg className="w-3 h-3 inline-block opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        );
      }

      // 2. Bold text
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={i} className="font-bold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }

      // 3. Sitasi [1]
      const citationMatch = token.match(/^\[(\d+)\]$/);
      if (citationMatch) {
        return (
          <sup key={i} className="px-0.5 text-[#C9A24A] font-bold text-[10px]">
            [{citationMatch[1]}]
          </sup>
        );
      }

      return <span key={i}>{token}</span>;
    });
  }

  function renderFormattedContent(text: string) {
    if (!text) return null;

    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <div className="space-y-2.5">
        {lines.map((line, idx) => {
          if (line.startsWith('• ') || line.startsWith('- ')) {
            const itemText = line.replace(/^[•\-]\s*/, '').trim();
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-[#C9A24A] font-bold text-xs shrink-0">•</span>
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  {renderInlineTokens(itemText)}
                </div>
              </div>
            );
          }

          if (line.includes('sulinggih atau pemangku')) {
            return (
              <p key={idx} className="text-[11px] text-[#F3E9CF]/80 italic pt-1 border-t border-white/10">
                {renderInlineTokens(line)}
              </p>
            );
          }

          return (
            <p key={idx} className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              {renderInlineTokens(line)}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#C9A24A] shrink-0 mt-0.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                </svg>
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 shadow-md ${
                isUser
                  ? 'bg-[#C9A24A]/20 border border-[#C9A24A]/40 text-white rounded-tr-xs'
                  : 'bg-white/[0.04] backdrop-blur-md border border-white/15 text-stone-200 rounded-tl-xs'
              }`}
            >
              {isUser ? (
                <div className="text-xs sm:text-sm text-white leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div>
                  {msg.content ? (
                    renderFormattedContent(msg.content)
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-stone-400 py-1">
                      <span className="w-2 h-2 rounded-full bg-[#C9A24A] animate-ping" />
                      <span>Menyusun jawaban dari pustaka yadnya...</span>
                    </div>
                  )}

                  {/* CTA Buat Rencana */}
                  {msg.suggestedPlan && (
                    <CreatePlanCta plan={msg.suggestedPlan} />
                  )}
                </div>
              )}
            </div>

            {/* User Avatar Placeholder */}
            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-[#C9A24A] text-stone-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                U
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatMessageList;

