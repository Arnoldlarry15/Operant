import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientProviders } from '@/components/client-providers'
import { Toaster } from 'sonner'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://operantai.xyz').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Operant | Purpose-Built AI Agents & Modular Marketplace',
    template: '%s | Operant AI',
  },
  description: 'Buy prebuilt AI agents, build custom agents from modular components, and upgrade them with specialized skills. The ultimate purpose-built AI agent marketplace.',
  keywords: [
    'AI agent',
    'custom AI agent',
    'prebuilt AI agent',
    'AI marketplace',
    'modular AI',
    'AI skills',
    'Operant AI',
    'AI assistant builder',
    'AI productivity tools',
  ],
  authors: [{ name: 'Operant Inc.', url: appUrl }],
  creator: 'Operant Inc.',
  publisher: 'Operant Inc.',
  category: 'Technology',
  icons: {
    icon: [
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Operant | Purpose-Built AI Agents & Modular Marketplace',
    description: 'Buy prebuilt AI agents, build custom agents from modular components, and upgrade them with specialized skills.',
    url: appUrl,
    siteName: 'Operant',
    images: [
      {
        url: '/operant-logo-full.png',
        width: 1200,
        height: 630,
        alt: 'Operant AI Agent Marketplace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Operant | Purpose-Built AI Agent Marketplace',
    description: 'Build, buy, and upgrade purpose-built AI agents with specialized skills.',
    images: ['/operant-logo-full.png'],
    creator: '@operantai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: appUrl,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Operant',
  url: appUrl,
  image: `${appUrl}/operant-logo-full.png`,
  description: 'Buy prebuilt AI agents, build custom agents from modular components, and upgrade them with specialized skills.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '9.00',
    highPrice: '129.00',
    offerCount: '45',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Operant Inc.',
    logo: {
      '@type': 'ImageObject',
      url: `${appUrl}/operant-logo.png`,
    },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} bg-background dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ClientProviders>
          <TooltipProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: { background: 'oklch(0.16 0.015 260)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.93 0.01 260)' },
              }}
            />
          </TooltipProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
