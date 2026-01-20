import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ConvexClientProvider } from './ConvexClientProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://isitp2w.com'),
  title: 'Dreadmyst Orb Enchanting Tool | IsItP2W',
  description: 'Track your Dreadmyst enchanting sessions, view success rates, and compete on the leaderboard. A tool by IsItP2W.com',
  keywords: ['Dreadmyst', 'enchanting', 'calculator', 'orb', 'success rate', 'IsItP2W', 'tracker', 'leaderboard'],
  authors: [{ name: 'IsItP2W', url: 'https://isitp2w.com' }],
  alternates: {
    canonical: '/games/dreadmyst/orb-enchanting-tool',
  },
  openGraph: {
    title: 'Dreadmyst Orb Enchanting Tool',
    description: 'Track your Dreadmyst enchanting sessions, view success rates, and compete on the leaderboard.',
    url: 'https://isitp2w.com/games/dreadmyst/orb-enchanting-tool',
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
    <html lang="en" style={{ margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0 }}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
