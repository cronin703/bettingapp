import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
const inter = Inter({ subsets: ['latin'] });
export const metadata: Metadata = { title: 'WNBA Model', description: 'WNBA betting model tracker' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
      <nav className="border-b border-gray-800 px-6 py-3 flex gap-6 text-sm font-medium">
        <Link href="/" className="hover:text-white text-gray-300">Today</Link>
        <Link href="/results" className="hover:text-white text-gray-300">Results</Link>
        <Link href="/clv" className="hover:text-white text-gray-300">CLV</Link>
        <Link href="/model" className="hover:text-white text-gray-300">Model</Link>
        <Link href="/admin" className="hover:text-white text-gray-300 ml-auto">Admin</Link>
      </nav>
      <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
    </body></html>
  );
}
