import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="w-full flex flex-col bg-[#1F3B3A]">
      {/* HERO SECTION (Top cream + landscape waves) */}
      <section className="relative w-full bg-[#F5F0E6] overflow-x-clip pt-8 pb-20 sm:pb-32 lg:pb-40">
        {/* Layered hill wave background decorations */}
        <div className="absolute inset-x-0 -bottom-[2px] pointer-events-none w-full h-[55%] flex flex-col justify-end">
          <div className="w-full h-full relative">
            <svg
              className="absolute bottom-0 w-full h-[85%] text-[#8EA89D]/40"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,192 C320,96 640,256 960,160 C1280,64 1360,128 1440,160 L1440,320 L0,320 Z" />
            </svg>
            <svg
              className="absolute bottom-0 w-full h-[65%] text-[#5B8577]/60"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,128 C280,224 560,96 840,192 C1120,288 1320,160 1440,192 L1440,320 L0,320 Z" />
            </svg>
            <svg
              className="absolute -bottom-[2px] w-full h-[calc(40%+4px)] text-[#1F3B3A]"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,160 C360,64 720,224 1080,128 C1260,80 1380,140 1440,160 L1440,325 L0,325 Z" />
            </svg>
            {/* Strip penutup agar tidak ada celah garis putih/subpixel dari background beige */}
            <div className="absolute inset-x-0 -bottom-[2px] h-2 bg-[#1F3B3A]" />
          </div>
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Banten / Pawiwahan Artwork */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[420px] lg:max-w-none aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/60">
              <Image
                src="/images/hero-pawiwahan.webp"
                alt="Upakara Banten Yadnya Hindu Bali"
                fill
                priority
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Right Column: Wordmark & Description Card */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            {/* Wordmark "Ayukara" */}
            <h1 className="text-6xl sm:text-7xl lg:text-[130px] font-black text-[#1F3B3A] tracking-[-0.03em] leading-none font-serif">
              Ayukara
            </h1>

            {/* Description Glass Card */}
            <div className="w-full max-w-xl rounded-2xl bg-[#FBF8F2] border border-[#DDD3C1] p-6 sm:p-8 shadow-lg text-[#1F3B3A] leading-relaxed">
              <p className="text-sm sm:text-base font-normal">
              Asisten AI untuk perencanaan yadnya Hindu Bali seperti dewasa ayu, tingkatan upacara, kebutuhan banten, dan estimasi biaya, semuanya dengan sumber rujukan yang terverifikasi.
              </p>
            </div>

            {/* CTA Button */}
            <div className="w-full max-w-xl flex justify-center pt-2">
              <Link
                href="/planner"
                className="w-full flex items-center justify-center px-8 py-4 rounded-full bg-[#A8543A] hover:bg-[#8f432d] text-white font-semibold text-base sm:text-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-center tracking-wide"
              >
                Mulai Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CARA KERJA SECTION (Deep Forest Green #1F3B3A) */}
      <section className="relative w-full bg-[#1F3B3A] py-16 sm:py-24 px-6 sm:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-8 flex flex-col justify-between space-y-6 hover:border-white/30 transition-all">
              <div className="text-5xl font-black text-[#C9A24A] font-serif leading-none">
                1
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-serif">
                  Input Upacara dan Rentang
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Pilih jenis upacara yadnya dan rentang tanggal yang Anda inginkan.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-8 flex flex-col justify-between space-y-6 hover:border-white/30 transition-all">
              <div className="text-5xl font-black text-[#C9A24A] font-serif leading-none">
                2
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-serif">
                  Pilih tingkatan
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Nista, madya, atau utama — skala pelaksanaan, bukan kualitas spiritual.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-8 flex flex-col justify-between space-y-6 hover:border-white/30 transition-all">
              <div className="text-5xl font-black text-[#C9A24A] font-serif leading-none">
                3
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-serif">
                  Terima rencana
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Dewasa ayu, banten, dan penjelasan AI lengkap dengan sumber.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
