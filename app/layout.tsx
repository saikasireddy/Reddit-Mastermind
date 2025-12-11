import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reddit Mastermind',
  description: 'AI-powered narrative engine for Reddit marketing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
