import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { UserProvider } from '@/hooks/use-user';
import { OfflineBanner } from '@/components/offline-banner';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
<<<<<<< HEAD
=======
import { AppearanceBootstrap } from '@/components/preferences/appearance-bootstrap';
>>>>>>> master

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'UJLOG Étudiants - Département de Géographie',
  description: 'Portail universitaire officiel des cours, annales et ressources académiques du Département de Géographie de l\'Université Jean Lorougnon Guédé (Daloa).',
=======
  title: 'UJLoG Étudiant — UFR SSH',
  description: 'Portail universitaire officiel des cours, annales et ressources académiques de l’UFR SSH de l\'Université Jean Lorougnon Guédé (Daloa).',
>>>>>>> master
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
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
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
    <html lang="fr" className={`h-full ${inter.variable}`}>
      <body className="h-full antialiased font-sans bg-ujlog-bg text-ujlog-ink selection:bg-orange-100 selection:text-ujlog-primary-dark overflow-x-hidden">
        <UserProvider>
<<<<<<< HEAD
=======
          <AppearanceBootstrap />
>>>>>>> master
          <ServiceWorkerRegister />
          <OfflineBanner />
          <PwaInstallPrompt />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
