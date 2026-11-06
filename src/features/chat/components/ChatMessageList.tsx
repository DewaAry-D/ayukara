'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { UiChatMessage } from '../hooks/useChatStream';
import { CreatePlanCta } from './CreatePlanCta';

export interface ChatMessageListProps {
  messages: UiChatMessage[];
  isLoading: boolean;
}

function parseInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Tokenizer pattern: markdown link, citation [N], bold **text**, italic *text*, inline code `code`
  const pattern = /(!?\[([^\]]+)\]\(([^)]+)\))|(\[(\d+)\])|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Link [text](url)
      const linkText = match[2];
      const href = match[3];
      if (href.startsWith('#cite-')) {
        tokens.push(
          <sup key={match.index} className="px-0.5 text-[#C9A24A] font-bold text-[10px]">
            [{linkText}]
          </sup>
        );
      } else {
        tokens.push(
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C9A24A] hover:underline underline-offset-2 font-medium"
          >
            {linkText} ↗
          </a>
        );
      }
    } else if (match[4]) {
      // Citation [1]
      const citNum = match[5];
      tokens.push(
        <sup key={match.index} className="px-0.5 text-[#C9A24A] font-bold text-[10px]">
          [{citNum}]
        </sup>
      );
    } else if (match[6]) {
      // Bold **text**
      tokens.push(
        <strong key={match.index} className="font-bold text-white">
          {match[7]}
        </strong>
      );
    } else if (match[8]) {
      // Italic *text*
      tokens.push(
        <em key={match.index} className="italic text-[#F3E9CF]">
          {match[9]}
        </em>
      );
    } else if (match[10]) {
      // Inline code `code`
      tokens.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-white/10 text-[#C9A24A] font-mono text-xs">
          {match[11]}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

function ChatMarkdown({ content }: { content: string }) {
  if (!content) return null;

  // Bersihkan sitasi ganda berulang misal [1] [1] -> [1]
  const prepared = content
    .replace(/\[(\d+)\](?:\s*[,;]?\s*\[\1\])+/g, '[$1]')
    .replace(/\[(\d+)\](?!\()/g, '[[$1]](#cite-$1)');

  const lines = prepared.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  function flushList() {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 pl-1 my-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[#C9A24A] font-bold text-xs shrink-0">•</span>
              <div>{parseInline(item)}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 pl-1 my-1 marker:text-[#C9A24A] marker:font-bold">
          {currentList.items.map((item, idx) => (
            <li key={idx}>
              <span className="inline">{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    // Heading: #, ##, ###
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      elements.push(
        <h4 key={`h-${elements.length}`} className="text-sm sm:text-base font-bold text-[#C9A24A] pt-2">
          {parseInline(headingMatch[2])}
        </h4>
      );
      continue;
    }

    // Bullet list: •, -, *, +
    const bulletMatch = line.match(/^([•\-\*+])\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    // Numbered list: 1., 2., etc.
    const numberedMatch = line.match(/^\d+[\.\)]\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[1]);
      continue;
    }

    // Paragraph
    flushList();

    if (line.includes('sulinggih atau pemangku')) {
      elements.push(
        <p key={`p-${elements.length}`} className="text-[11px] text-[#F3E9CF]/80 italic pt-1 border-t border-white/10 my-1">
          {parseInline(line)}
        </p>
      );
    } else {
      elements.push(
        <p key={`p-${elements.length}`} className="my-1">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();

  return (
    <div className="space-y-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
      {elements}
    </div>
  );
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
                    <ChatMarkdown content={msg.content} />
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
