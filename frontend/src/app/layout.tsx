import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Inter is a clean, modern font — perfect for a dashboard
const inter = Inter({ subsets: ['latin'] })

// This metadata appears in the browser tab and search engines
export const metadata: Metadata = {
  title: 'Minecraft Panel',
  description: 'Free Minecraft server hosting panel',
}

// RootLayout wraps EVERY page in our app
// Think of it like the outer shell of all pages
export default function RootLayout({
  children,
}: {
  children: React.ReactNode  // children = whatever page is currently loaded
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}