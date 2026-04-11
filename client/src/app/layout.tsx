import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import type { Metadata } from 'next';
import './globals.css';

import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'GrindSquad — Execute the Grind',
  description: 'Squad-based DSA prep. Share problems, race your friends, track weaknesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: { 
              colorPrimary: '#00FF9C', 
              colorBackground: '#0a0a0b', 
              colorInputBackground: 'rgba(255,255,255,0.05)',
              colorText: '#ffffff',
              colorTextSecondary: '#a1a1aa',
              fontFamily: 'Inter, sans-serif' 
            },
            elements: {
              card: {
                border: '1px solid rgba(72,72,73,0.5)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }
            }
          }}
        >
          {children}
          <Toaster position="bottom-right" toastOptions={{
            style: { background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border)' }
          }} />
        </ClerkProvider>
      </body>
    </html>
  );
}
