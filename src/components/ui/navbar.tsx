"use client";
import { useState, useEffect } from "react";
import { BrandLogo } from "./brandlogo";
import { MainNav } from "./main-nav";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { Menu, X, User } from "lucide-react";

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isScrollingDown = currentScrollPos > prevScrollPos;
      
      // Only hide when scrolling down and past a threshold (e.g. 100px)
      if (isScrollingDown && currentScrollPos > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <header 
      className={`flex py-4 shadow-xl fixed top-0 w-full z-50 bg-gray-950 backdrop-blur-sm transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex w-full px-4 container">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex-shrink-0">
            <BrandLogo />
          </Link>
          
          {/* Desktop navigation - now on the same line */}
          <div className="hidden md:flex justify-center flex-1 px-4">
            <MainNav />
          </div>
          
          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={toggleMenu}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Account and Sign In buttons on desktop */}
          <div className="hidden md:flex items-center gap-4">
            <SignedIn>
              <Link href="/account" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white hover:bg-gray-800">
                <User className="mr-2 h-4 w-4" />
                Account
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            
            <SignedOut>
              <SignInButton>
                <button className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md">
                  Login
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className={`md:hidden flex flex-col gap-4 pt-4 absolute top-full left-0 w-full bg-gray-950 px-4 pb-4 shadow-lg ${isOpen ? 'flex' : 'hidden'}`}>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/astrology">Astrology</Link>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/divination">Divination</Link>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/magick">Magick</Link>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/alchemy">Alchemy</Link>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/library">Library</Link>
          <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors" href="/swisseph">Birth Chart</Link>
          
          <SignedIn>
            <Link className="text-lg p-2 hover:bg-gray-700 rounded transition-colors flex items-center" href="/account">
              <User className="mr-2 h-4 w-4" />
              Account
            </Link>
          </SignedIn>
          
          <SignedOut>
            <SignInButton>
              <button className="text-lg p-2 hover:bg-gray-700 rounded transition-colors w-full text-left">
                Login
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}