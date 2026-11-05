'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  // FR-C: Jangan tampilkan footer di halaman chat sesuai instruksi user
  if (pathname === '/chat' || pathname.startsWith('/chat')) {
    return null;
  }

  return (
    <footer className="w-full bg-[#EDE6D8] border-t border-[#DDD3C1]/80 py-12 px-6 text-center text-[#5B6B66] font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Ornament Divider: line 48px, diamond motif, line 48px */}
        <div className="flex items-center justify-center gap-3">
          <span className="w-12 h-[1px] bg-[#C9A24A]/60" />
          <svg className="w-3.5 h-3.5 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
          <span className="w-12 h-[1px] bg-[#C9A24A]/60" />
        </div>

        {/* Disclaimer Keagamaan */}
        <p className="text-xs sm:text-[13px] text-[#5B6B66] max-w-2xl mx-auto leading-relaxed">
          Ayukara adalah pendamping perencanaan, bukan pengganti otoritas keagamaan. Konsultasikan dengan sulinggih atau pemangku setempat.
        </p>

        {/* Copyright */}
        <p className="text-[11px] text-[#8A938C] tracking-wide pt-1">
          © 2026 Ayukara
        </p>
      </div>
    </footer>
  );
}

export default Footer;