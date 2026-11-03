import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ayukara — Pendamping Perencanaan Upacara Yadnya',
  description:
    'Pendamping perencanaan upacara yadnya Hindu Bali: dewasa ayu, tingkatan, banten, estimasi biaya, dan Chat AI berbasis sumber.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-[#F7F5F0] text-[#1B3022]">
        {children}
      </body>
    </html>
  );
}

