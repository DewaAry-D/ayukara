'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
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

  function renderFormattedContent(text: string) {
    if (!text) return null;
    // Ubah sitasi [1] jadi link khusus supaya bisa diberi gaya emas
    const prepared = text
      .replace(/\[(\d+)\](?:\s*[,;]?\s*\[\1\])+/g, '[$1]')
      .replace(/\[(\d+)\](?!\()/g, '[[$1]](#cite-$1)');
    return (
      <div className="space-y-2.5 text-xs sm:text-sm text-stone-200 leading-relaxed">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h4 className="text-sm sm:text-base font-bold text-[#C9A24A] pt-2">{children}</h4>,
            h2: ({ children }) => <h4 className="text-sm sm:text-base font-bold text-[#C9A24A] pt-2">{children}</h4>,
            h3: ({ children }) => <h4 className="text-sm sm:text-base font-bold text-[#C9A24A] pt-2">{children}</h4>,
            p: ({ children }) => {
              const plain = String(children);
              if (plain.includes('sulinggih atau pemangku')) {
                return <p className="text-[11px] text-[#F3E9CF]/80 italic pt-1 border-t border-white/10">{children}</p>;
              }
              return <p>{children}</p>;
            },
            ul: ({ children }) => <ul className="space-y-1.5 pl-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 pl-1 marker:text-[#C9A24A] marker:font-bold">{children}</ol>,
            li: ({ children }) => (
              <li className="flex items-start gap-2">
                <span className="text-[#C9A24A] font-bold text-xs shrink-0">•</span>
                <div>{children}</div>
              </li>
            ),
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-[#F3E9CF]">{children}</em>,
            a: ({ href, children }) => {
              if (href?.startsWith('#cite-')) {
                return <sup className="px-0.5 text-[#C9A24A] font-bold text-[10px]">{children}</sup>;
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="text-[#C9A24A] hover:underline underline-offset-2 font-medium">
                  {children} ↗
                </a>
              );
            },
          }}
        >
          {prepared}
        </ReactMarkdown>
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
              <div className="w-8 h-8 shrink-0 mt-0.5 flex items-center justify-center">
                <Image
                  src="/images/logo_ayukara_hd.png"
                  alt=""
                  width={64}
                  height={64}
                  className="w-8 h-8 object-contain scale-150"
                />
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

