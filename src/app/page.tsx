"use client";
import Image from "next/image";
import Link from "next/link";
import { NavBar } from "@/components/ui/navbar";
import { addUser } from "@/actions";
import { Button } from "@/components/ui/button";
import { CardWithForm } from "@/components/ui/cardwithform";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";
import { hero } from "@/components/ui/heroimage";


import heroimage from "../public/visuals/heroimage.jpg";
export default function Home() {


  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] ">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
       
        <section className="min-h-screen flex items-center justify-center text-center text-balance flex-col gap-8 px-9">
          <h1 className="text-6xl lg:text-7xl xl:text-8xl font-bold tacking-tight">Realize Your Potential</h1>
          <p className="text-lg lg:text-3xl max-w-screen-xl">Insights and techniques for personal growth.</p>        
          
          

          <div className="flex flex-col gap-10 w-full max-w-6xl mt-8">
            {/* Chart Section */}
            <div className="flex justify-center w-full">
              <div className="bg-gray-900/70 backdrop-blur-sm p-6 rounded-xl border border-gray-800 w-full max-w-4xl">
                
              </div>
            </div>
            
            {/* Buttons Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/astrology" className="w-full">
                <Button className="text-lg p-6 rounded-xl flex gap-2 w-full">
                  Get a reading<ArrowRightIcon className="size-5" />
                </Button>
              </Link>
              
              <Link href="/birthchart" className="w-full">
                <Button className="text-lg p-6 rounded-xl flex gap-2 w-full">
                  Birth Chart Calculator<ArrowRightIcon className="size-5" />
                </Button>
              </Link>
              
              <Link href="/divination" className="w-full">
                <Button className="text-lg p-6 rounded-xl flex gap-2 w-full">
                  Tarot self service<ArrowRightIcon className="size-5" />
                </Button>
              </Link>
              <SignedIn>
              <Link href="/account" className="w-full">
                <Button className="text-lg p-6 rounded-xl flex gap-2 w-full" variant="outline">
                  Manage Your Account<ArrowRightIcon className="size-5" />
                </Button>
              </Link>
              </SignedIn>
             <SignedOut>
                <SignUpButton>
                <Button className="text-lg p-6 rounded-xl flex gap-2 w-full" variant="outline">
                  Sign Up<ArrowRightIcon className="size-5" />
                </Button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </section>
      </main>
      <div className="justify-items-center row-start-4 flex gap-6 flex-wrap items-center justify-center">
      <Link href="https://discord.gg/zcqkTFRn"><Button>Join Discord</Button></Link>
      <Link href="https://www.youtube.com/@exavierx"><Button>YouTube</Button></Link>
        </div>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
       
      </footer>
    </div>
  );
}
