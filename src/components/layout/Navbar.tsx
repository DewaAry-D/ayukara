'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check active state according to design_ayukara.md §6.1
  const isBerandaActive = pathname === '/';
  const isPerencanaActive = pathname.startsWith('/planner');
  const isChatActive = pathname.startsWith('/chat');

  return (
    <header
      className={`fixed top-0 inset-x-0 w-full z-30 transition-colors ${
        isChatActive
          ? 'bg-[#1F3B3A] border-b border-white/10'
          : 'bg-[#F5F0E6] border-b border-[#DDD3C1]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 h-20 sm:h-24 flex items-center justify-between">
        {/* Logo Lockup */}
        <Link href="/" className="flex items-center gap-3 group">
          {isChatActive ? (
            <Image
              src="/images/logo_ayukara_navbar.png"
              alt="Ayukara"
              width={180}
              height={52}
              className="h-11 sm:h-12 w-auto object-contain scale-85 origin-left translate-x-2.5"
              priority
            />
          ) : (
            <Image
              src="/images/logo_with_text.png"
              alt="Ayukara - Pendamping Perencanaan Upacara Yadnya"
              width={180}
              height={52}
              className="h-11 sm:h-12 w-auto object-contain"
              priority
            />
          )}
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-9 text-sm font-sans">
          {/* Beranda */}
          <Link
            href="/"
            className="relative py-2 flex flex-col items-center group transition-colors"
          >
            <span
              className={`transition-colors ${
                isChatActive
                  ? isBerandaActive
                    ? 'font-bold text-[#C9A24A]'
                    : 'font-medium text-stone-300 hover:text-white'
                  : isBerandaActive
                    ? 'font-bold text-[#A8543A]'
                    : 'font-medium text-[#1F3B3A] hover:text-[#A8543A]'
              }`}
            >
              Beranda
            </span>
            {isBerandaActive && (
              <span className="absolute -bottom-1 w-full h-[3px] bg-[#C9A24A] rounded-[2px]" />
            )}
          </Link>

          {/* Perencana */}
          <Link
            href="/planner"
            className="relative py-2 flex flex-col items-center group transition-colors"
          >
            <span
              className={`transition-colors ${
                isChatActive
                  ? isPerencanaActive
                    ? 'font-bold text-[#C9A24A]'
                    : 'font-medium text-stone-300 hover:text-white'
                  : isPerencanaActive
                    ? 'font-bold text-[#A8543A]'
                    : 'font-medium text-[#1F3B3A] hover:text-[#A8543A]'
              }`}
            >
              Perencana
            </span>
            {isPerencanaActive && (
              <span className="absolute -bottom-1 w-full h-[3px] bg-[#C9A24A] rounded-[2px]" />
            )}
          </Link>

          {/* Chat AI */}
          <Link
            href="/chat"
            className="relative py-2 flex flex-col items-center group transition-colors"
          >
            <span
              className={`transition-colors ${
                isChatActive
                  ? 'font-bold text-[#C9A24A]'
                  : 'font-medium text-[#1F3B3A] hover:text-[#A8543A]'
              }`}
            >
              Chat AI
            </span>
            {isChatActive && (
              <span className="absolute -bottom-1 w-full h-[3px] bg-[#C9A24A] rounded-[2px]" />
            )}
          </Link>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isChatActive
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-[#DDD3C1] text-[#1F3B3A] hover:bg-[#EDE6D8]'
            }`}
            aria-label="Menu navigasi"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t px-6 py-4 space-y-3 ${
            isChatActive
              ? 'border-white/10 bg-[#1F3B3A] text-white'
              : 'border-[#DDD3C1] bg-[#F5F0E6] text-[#1F3B3A]'
          }`}
        >
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm ${
              isBerandaActive
                ? 'font-bold text-[#C9A24A]'
                : isChatActive
                  ? 'font-medium text-stone-300'
                  : 'font-medium text-[#1F3B3A]'
            }`}
          >
            Beranda
          </Link>
          <Link
            href="/planner"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm ${
              isPerencanaActive
                ? 'font-bold text-[#C9A24A]'
                : isChatActive
                  ? 'font-medium text-stone-300'
                  : 'font-medium text-[#1F3B3A]'
            }`}
          >
            Perencana
          </Link>
          <Link
            href="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm ${
              isChatActive ? 'font-bold text-[#C9A24A]' : 'font-medium text-[#1F3B3A]'
            }`}
          >
            Chat AI
          </Link>
        </div>
      )}
    </header>
  );
}

export default Navbar;