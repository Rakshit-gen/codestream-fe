import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CodeStream - Real-time Collaborative Code Review',
  description: 'Collaborate on code reviews in real-time with AI assistance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <div className="min-h-screen bg-background gradient-bg">
            {children}
          </div>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
