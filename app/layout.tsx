import type { Metadata } from 'next'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import { AppProviders } from '@/components/app-providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chat UI',
  description: 'AI Chat Interface',
}

const googleTagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="h-full bg-background text-foreground">
        <ClerkProvider dynamic>
          <AppProviders>{children}</AppProviders>
        </ClerkProvider>
      </body>
      {googleTagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
            strategy="afterInteractive"
          />
          <Script id="google-tag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${googleTagId}');
            `}
          </Script>
        </>
      )}
    </html>
  )
}
