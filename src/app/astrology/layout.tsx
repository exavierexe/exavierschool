import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavBar } from "@/components/ui/navbar";

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

export default function AstrologyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        <div>
          
        </div>
        {children}
    </>
  );
}
