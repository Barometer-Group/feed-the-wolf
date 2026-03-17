import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Feed the Wolf",
  description: "Workout tracker for athletes and trainers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Feed the Wolf",
    statusBarStyle: "black",
  },
  themeColor: "#000000",
  icons: {
    apple: "/icons/wolf-icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
