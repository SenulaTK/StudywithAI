import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Professor Barnaby's 3D Study Desk | Socratic Intelligent Tutoring System",
  description:
    'Tactile 3-panel Intelligent Tutoring System built around Cognitive Load Theory, Dual Coding Theory, and Gamified Active Mastery with Professor Barnaby.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col desk-wood-surface text-[#1E293B] selection:bg-[#FDE047] selection:text-[#1E293B]">
        {children}
      </body>
    </html>
  );
}
