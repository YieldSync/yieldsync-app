import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { DEFAULT_THEME } from '@/lib/theme/color-presets'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-body',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-body',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://yieldsync.io'),
  title: {
    default: 'YieldSync — Copy Trade Meteora LP Creators in Real Time',
    template: '%s · YieldSync',
  },
  description:
    'Track Meteora LP creators in real time, see who\'s actually profitable, and copy their trades automatically. Built for Solana traders.',
  icons: {
    icon: [
      { url: '/meteor.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/meteor.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'YieldSync',
    url: 'https://yieldsync.io',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050605',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`dark ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('ys-brand-theme-mode');var t=localStorage.getItem('ys-brand-theme');if(m!=='custom'&&(t==='moss'||t==='orange'||t==='purple'||t==='blue'))document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${dmSans.className} min-h-full bg-background text-foreground`}>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
