import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/ui/navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider"
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exavier's School of Occult Sciences",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
    <html lang="en">
      <ClerkProvider>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <ThemeProvider>
        <div className="fixed top-0 left-0 right-0 z-50">
          <NavBar/>
        </div>
        <div className="pt-16"> {/* Add padding top to move content below navbar */}
          {children}
        </div>
        </ThemeProvider>
      </body>
      </ClerkProvider>
    </html>
    
  );
}
