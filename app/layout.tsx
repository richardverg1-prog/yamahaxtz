import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'XTZ 250X — Painel',
  description: 'Controle completo da sua Yamaha XTZ 250X',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'XTZ Painel' },
};

export const viewport: Viewport = {
  themeColor: '#0D0C08',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=localStorage.getItem('xtz_settings');if(s){var t=JSON.parse(s).theme;if(t)document.documentElement.dataset.theme=t;}}catch(e){}})();`
        }} />
      </head>
      <body>
        <ThemeProvider>
          <div className="app-shell">
            {children}
          </div>
          <Navigation />
        </ThemeProvider>
      </body>
    </html>
  );
}
