import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { AppShell } from "@/components/app-shell"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/AuthContext"
import { InventoryProvider } from "@/context/InventoryContext"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Popis Robe",
  description: "Mobilna aplikacija za popis robe — brz, precizan, profesionalan.",
  applicationName: "Popis Robe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Popis",
  },
  formatDetection: {
    telephone: false,
    email: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="sr"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-zinc-950 font-sans text-zinc-100 antialiased">
        <AuthProvider>
          <InventoryProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
            {process.env.NODE_ENV === "production" && <Analytics />}
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
