'use client';

import React, { useState } from 'react';

export interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder = 'Tanyakan tentang dewasa ayu, tingkatan yadnya, atau banten...',
}: ChatInputProps) {
  const [input, setInput] = useState('');

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="w-full">
      {/* Pill Input Container */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="relative flex items-center justify-between gap-3 rounded-full border border-white/20 bg-white/[0.04] p-1.5 pl-6 sm:pl-7 shadow-lg backdrop-blur-md focus-within:border-white/40 focus-within:bg-white/[0.07] transition-all"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          maxLength={1000}
          className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-stone-400 focus:outline-hidden py-2"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="shrink-0 px-6 sm:px-7 py-2.5 rounded-full bg-[#B35438] hover:bg-[#9E4730] disabled:opacity-40 disabled:hover:bg-[#B35438] text-white font-medium text-xs sm:text-sm transition-all cursor-pointer disabled:cursor-not-allowed shadow-md active:scale-95 flex items-center justify-center"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Mengirim...</span>
            </span>
          ) : (
            'Kirim'
          )}
        </button>
      </form>

      {/* Disclaimers Below Input (matching Figma screenshot exactly) */}
      <div className="mt-3 text-left pl-3 sm:pl-4 space-y-0.5">
        <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed">
          Jawaban AI berdasarkan sumber terverifikasi dan bersifat pendamping, bukan pengganti sulinggih atau pemangku.
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-white">
          Percakapan tidak disimpan.
        </p>
      </div>
    </div>
  );
}

export default ChatInput;

