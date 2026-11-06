import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ayukara: Perencana Yadnya Hindu Bali',
  description:
    'Ayukara adalah asisten AI untuk merencanakan yadnya Hindu Bali: mencari dewasa ayu (hari baik), memilih tingkatan upacara nista, madya, atau utama, serta menyusun daftar banten dan perkiraan biayanya.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${fraunces.variable} ${plusJakartaSans.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-[#1F3B3A] text-[#FBF8F2] font-sans selection:bg-[#A8543A] selection:text-white">
        <Navbar />
        <main className="flex-1 pt-20 sm:pt-24">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
