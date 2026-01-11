import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dreadmyst Enchanting Calculator | IsItP2W',
  description: 'Calculate enchant success rates and optimal orb strategies for Dreadmyst. A tool by IsItP2W.com',
  keywords: ['Dreadmyst', 'enchanting', 'calculator', 'orb', 'success rate', 'IsItP2W'],
  authors: [{ name: 'IsItP2W', url: 'https://isitp2w.com' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  openGraph: {
    title: 'Dreadmyst Enchanting Calculator',
    description: 'Calculate enchant success rates and optimal orb strategies for Dreadmyst',
    url: 'https://isitp2w.com/games/dreadmyst',
    siteName: 'IsItP2W',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
