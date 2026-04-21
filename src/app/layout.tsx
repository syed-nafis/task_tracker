import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from './ThemeProvider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'CRO Command Center',
  description: 'Manage your A/B tests, CRO tasks, and experiment pipeline in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white antialiased transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
