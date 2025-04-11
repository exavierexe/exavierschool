'use client';

import Image from "next/image";
import { NavBar } from "@/components/ui/navbar";
import { addUser } from "@/actions";
import { Button } from "@/components/ui/button";
import { CardWithForm } from "@/components/ui/cardwithform"
import cityscape from "./visuals/cityscape.jpg";
import desertscape from "./visuals/desertscape.jpg";
import officespace from "./visuals/officespace.jpg";
import secretscroll from "./visuals/secretscroll.jpg";
import venusbeach from "./visuals/venusbeach.jpg";
import healing from "./visuals/healing.jpg";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Astrology() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const result = await addUser(formData);
      
      if (result.success) {
        router.push('/success');
      } else {
        setError(result.error || 'Failed to submit form');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 pt-16 gap-16 sm:p-20 sm:pt-24 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
      </main>

      <section className="flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      
       <h1 className="text-4xl lg:text-7xl xl:text-8xl font-bold tracking-tight" >Astrology and Tarot</h1>
        
        <div className="text-left lg:text-2xl"> <br/>
        Astrological readings combined with tarot to help you understand your path in life. <br/> <br/>
        tropical zodiac + sidereal nakshatras <br/> <br/> 
        Decide on a topic, then fill out the form to get started.
        </div>
      
      </section>

      <br></br>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
          <form action={handleSubmit}>
            <CardWithForm disabled={isSubmitting} />
          </form>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
        <CardHeader className="text-4xl">General Reading</CardHeader>
        <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-2">
        <CardContent>
        <div className="text-left">
          Do you want some general insights about your day to day life and the near future? <br/> <br/>
          Maybe you are new to astrology and wondering how much it can reveal about yourself. <br/> <br/>
          This reading will satisfy your curiosity and give you a lot to explore. <br/> <br/>
          This is the best reading for beginners. It focus on the most practical information that you can take advantage of immediately. <br/> <br/>
          You will recieve a psychoanalysis and a forecast of major events ahead.
          </div>
        </CardContent>
      <Image src={cityscape} alt="Cityscape" width={500} height={500} className="mb-5 mt-5 rounded-lg"/>
      </CardFooter>
      </Card>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
        <CardHeader className="text-4xl">Love Reading and Marriage Prediction</CardHeader>
        <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-2">
        <Image src={venusbeach} alt="venus beach" width={500} height={500} className="mb-5 mt-5 rounded-lg"/>
        <CardContent>
        <div className="text-left">
          Do you want to know where to find the love of your life and how to attract them? <br/> <br/>
          Maybe you already have multiple options and cant decide which person to choose? <br/> <br/>
          Are you looking to understand your spouse and overcome challenges? <br/> <br/>
          This is reading will help you make informed decisions in your relationships and create a social life of abundance. <br/> <br/> 
          It is also possible to predict the exact days that you are most likely to get married.
        </div>
      </CardContent>
     
      </CardFooter>
      </Card>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
      <CardHeader className="text-4xl">Business and Career Reading</CardHeader>
      <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-2">
      <CardContent>
        <div className="text-left">
          Do you want to make more money and find your purpose in life? <br/> <br/>
          Do you want to know what career path you should pursue, make the most of your skills, and overcome your unique challenges? <br/> <br/>
          If you have a business, this will help you get the most out of your marketing efforts and find the best people to partner with. <br/> <br/>
          If you have a clear idea of what you want to do, this reading will illustrate how to execute your plan effectively.
        </div>
      </CardContent>
      <Image src={officespace} alt="office space" width={500} height={500} className="mb-5 mt-5 rounded-lg"/>
      </CardFooter>
      </Card>
      </section>

      
      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
      <CardHeader className="text-4xl">Occult Mythical Reading</CardHeader>
        <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-2">
        <Image src={secretscroll} alt="secret scroll" width={500} height={500} className="mb-5 mt-5 rounded-lg"/>
        <CardContent>
          <div className="text-left">
          This reading is intended for mature audiences. <br/> <br/>
          If you want answers about your soul&apos;s journey or your experiences with the supernatural, this reading is for you. <br/> <br/>
          You will get this most out of this if you possess a form of intuition or at least have an understanding of the occult, mythology, and religion. <br/> <br/>
          This will detail the archetypal forces you have access to and how they influence your life. <br/> <br/>
          You will also learn how to balance these forces with occult practices and create your own mythology. 
          </div>
      </CardContent>
      </CardFooter>
      </Card>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
      <CardHeader className="text-4xl">Health and Natural Medicine</CardHeader>
        <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-2">
        <Image src={healing} alt="secret scroll" width={500} height={500} className="mb-5 mt-5 rounded-lg"/>
        <CardContent>
          <div className="text-left">
          Do you have chronic pain or a lack of energy? <br/> <br/>
          Maybe you want to finally hit your weight loss goals. <br/> <br/>
          Or maybe you want better hair, skin, and nails. <br/> <br/>
          This will reading will identify your problems and show you how to maintain perfect health. <br/> <br/>
          You will learn how to exercise, eat healthily, and natural remedies for your health issues.<br/> <br/>
          </div>
      </CardContent>
      </CardFooter>
      </Card>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
      <Card>
      <CardHeader className="text-4xl">Pricing Tiers</CardHeader>
      <CardContent>If your request is approved, you will recieve an invoice prior to the reading. Readings will take place over the phone on whatsapp.</CardContent>
        <CardFooter className="grid grid-cols-1 shrink-0 gap-4 md:grid-cols-3">
        <Card>
        <CardContent>
          <CardHeader className="text-2xl">Essential - $50</CardHeader>
          <div className="text-left">
          15+ minute recorded phone session <br/> <br/>
          Full report of your house lords and planet aspects, as they relate to your topic <br/> <br/>
          Major transits for the next 30 days <br/> <br/>
          3 card tarot spread <br/> <br/>
          This is a convenient option if you need to get straight to the point and make a quick decision. <br/> <br/>
          </div>
      </CardContent>
      </Card>
      <Card>
      <CardContent>
      <CardHeader className="text-2xl">Deluxe - $150</CardHeader>
          <div className="text-left">
          45+ minute recorded phone session <br/> <br/>
          Extended report of house lords, planet aspects, and divisional charts, as they relate to your topic<br/> <br/>
          Major transits for the next 90 days <br/> <br/>
          6 card tarot spread <br/> <br/>
          Select this if you want to go really in depth. You will get all of your questions answered.<br/> <br/>
          </div>
      </CardContent>
      </Card>
      <Card>
      <CardContent>
      <CardHeader className="text-2xl">Ultra - $350</CardHeader>

          <div className="text-left">
          90+ minute recorded phone sessions x2<br/> <br/>
          Extended report of house lords, planet aspects, and divisional charts, as they relate to your topic<br/> <br/>
          Major transits for the next 365 days <br/> <br/>
          6 card tarot spreads x2<br/> <br/>
          Your reading will be prioritized.<br/> <br/> <br/>
          </div>
      </CardContent>
      </Card>
      </CardFooter>
      </Card>
      </section>

      <section className="min-h-screen flex items-center row-span-2 justify-center text-center text-balance flex-col gap-8 px-9">
          <form action={handleSubmit}>
            <CardWithForm disabled={isSubmitting} />
          </form>
      </section>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        
      </footer>
    </div>
  );
}
