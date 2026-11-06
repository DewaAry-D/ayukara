'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatCitation, SuggestedPlan } from '@/lib/chat/ChatService';

export interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  suggestedPlan?: SuggestedPlan;
  createdAt: Date;
}

export function useChatStream() {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('ayukara-chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch {
        sessionStorage.removeItem('ayukara-chat');
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || isLoading) return;
    sessionStorage.setItem('ayukara-chat', JSON.stringify(messages));
  }, [messages, isLoading, ready]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || isLoading) return;

      setError(null);

      const userMsg: UiChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date(),
      };

      const assistantMsgId = `assistant-${Date.now()}`;
      const initialAssistantMsg: UiChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      const newHistory = [...messages, userMsg];
      setMessages([...newHistory, initialAssistantMsg]);
      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Gagal menghubungi server Ayukara.');
        }

        if (!response.body) {
          throw new Error('Respons stream kosong.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
            )
          );
        }

        // Deteksi upacara untuk CTA "Buat Rencana dari Jawaban Ini"
        let suggestedPlan: SuggestedPlan | undefined = undefined;
        const lower = accumulatedText.toLowerCase();
        if (lower.includes('otonan')) {
          suggestedPlan = { upacaraId: 23, upacaraNama: 'Otonan', tab: 'otonan' };
        } else if (lower.includes('galungan')) {
          suggestedPlan = { upacaraId: 3, upacaraNama: 'Galungan', tab: 'hari_raya' };
        } else if (lower.includes('kuningan')) {
          suggestedPlan = { upacaraId: 4, upacaraNama: 'Kuningan', tab: 'hari_raya' };
        } else if (lower.includes('nyepi')) {
          suggestedPlan = { upacaraId: 8, upacaraNama: 'Nyepi', tab: 'hari_raya' };
        } else if (lower.includes('pawiwahan') || lower.includes('pernikahan')) {
          suggestedPlan = { upacaraId: 9, upacaraNama: 'Pawiwahan', tab: 'dewasa' };
        } else if (lower.includes('metatah') || lower.includes('potong gigi')) {
          suggestedPlan = { upacaraId: 10, upacaraNama: 'Metatah / Potong Gigi', tab: 'dewasa' };
        } else if (lower.includes('melaspas')) {
          suggestedPlan = { upacaraId: 17, upacaraNama: 'Melaspas Bangunan', tab: 'dewasa' };
        }

        if (suggestedPlan) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, suggestedPlan } : m
            )
          );
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Terjadi kendala pada koneksi chat.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    'Terjadi kendala saat memproses jawaban. Silakan coba kembali sesaat lagi.',
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    sessionStorage.removeItem('ayukara-chat'); 
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}

