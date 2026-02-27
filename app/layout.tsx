import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smash Sports Dashboard",
  description:
    "Analytics dashboard for Smash Sports social media performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-accent focus:text-background focus:rounded"
        >
          Skip to main content
        </a>
        <Navigation />
        <main
          id="main-content"
          className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
