import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Manrope } from 'next/font/google';
import { UserProvider } from '@/hooks/use-user';
import { OfflineBanner } from '@/components/offline-banner';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UJLOG Étudiants - Université Jean Lorougnon Guédé',
  description: 'Portail universitaire officiel des cours, annales et ressources académiques de l\'Université Jean Lorougnon Guédé (Daloa).',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UJLOG Étudiants',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/LOGO-SITE.png',
    apple: '/LOGO-SITE.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#ff7a00',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`h-full ${spaceGrotesk.variable} ${manrope.variable}`}>
      <body className="h-full antialiased font-sans bg-ujlog-bg text-ujlog-ink selection:bg-orange-100 selection:text-ujlog-primary-dark overflow-x-hidden">
        <UserProvider>
          <ServiceWorkerRegister />
          <OfflineBanner />
          <PwaInstallPrompt />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
