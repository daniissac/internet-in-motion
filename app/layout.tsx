import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Internet in Motion — Networking, visually explained";
const description = "Follow a website request through DNS, packets, routing, protocols, and performance in eight interactive chapters.";
const canonicalUrl = "https://daniissac.com/internet-in-motion/";
const socialImage = "https://daniissac.com/internet-in-motion/og.png";
const basePath = process.env.GITHUB_PAGES === "1" ? "/internet-in-motion" : "";

export const metadata: Metadata = {
  metadataBase: new URL("https://daniissac.com"),
  title,
  description,
  applicationName: "Internet in Motion",
  alternates: { canonical: canonicalUrl },
  icons: { icon: `${basePath}/favicon.svg` },
  openGraph: {
    title,
    description,
    type: "website",
    url: canonicalUrl,
    siteName: "Internet in Motion",
    images: [{ url: socialImage, width: 1728, height: 910, alt: "Internet in Motion request-and-response network illustration" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
