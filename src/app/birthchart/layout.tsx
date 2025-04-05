import React from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/ui/navbar";

export const metadata: Metadata = {
  title: 'Birth Chart Calculator',
  description: 'Lightning fast astrological calculations.'
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function BirthChartLayout({
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