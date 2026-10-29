import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'IoT Monitor',
  description: 'Readings and alerts from IoT devices',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              IoT Monitor
            </Link>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
