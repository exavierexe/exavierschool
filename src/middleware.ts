import { clerkMiddleware } from "@clerk/nextjs/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware((auth, req) => {
  // Allow public access to these routes
  if (["/", "/astrology", "/success"].includes(req.nextUrl.pathname)) {
    return;
  }
  
  // Allow server actions and static files to work
  if (req.nextUrl.pathname.startsWith('/_next') || 
      req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.includes('actions') ||
      req.nextUrl.pathname.endsWith('.js') ||
      req.nextUrl.pathname.endsWith('.css') ||
      req.nextUrl.pathname.endsWith('.png') ||
      req.nextUrl.pathname.endsWith('.jpg') ||
      req.nextUrl.pathname.endsWith('.svg')) {
    return;
  }
  
  // Protect all other routes
  auth.protect();
});

export const config = {
  // Protects all routes, including api/trpc
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 