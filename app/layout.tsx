import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feed the Wolf",
  description: "Workout tracker for athletes and trainers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Feed the Wolf",
    statusBarStyle: "black",
  },
  icons: {
    apple: "/icons/wolf-icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-background font-body antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
