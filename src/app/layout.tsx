import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ConvexClientProvider } from './ConvexClientProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Dreadmyst Enchanting Calculator | IsItP2W',
  description: 'Calculate enchant success rates and optimal orb strategies for Dreadmyst. A tool by IsItP2W.com',
  keywords: ['Dreadmyst', 'enchanting', 'calculator', 'orb', 'success rate', 'IsItP2W'],
  authors: [{ name: 'IsItP2W', url: 'https://isitp2w.com' }],
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
    <html lang="en" style={{ margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0 }}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
