import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Send Resume',
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
