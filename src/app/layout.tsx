import type { Metadata, Viewport  } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Metabolic Refactor",
    description: "Personal health, insulin, and gym tracker",
    manifest: '/manifest.json',
    icons: {
        apple: '/app_icon.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Metabolic",
    },
};

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
        <body className="min-h-full flex flex-col text-white">
        <div className="flex-grow pb-24">
            {children}
        </div>

        {/* Render the fixed Bottom Nav globally */}
        <BottomNav />
        </body>
    </html>
  );
}
