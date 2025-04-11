import { clerkMiddleware } from "@clerk/nextjs/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware((auth, req) => {
  // Allow public access to these routes
  const publicRoutes = [
    "/",
    "/astrology",
    "/success",
    "/birthchart",
    "/api/birthchart",
    "/api/calculate"
  ];
  
  if (publicRoutes.includes(req.nextUrl.pathname)) {
    return;
  }
  
  // Protect all other routes
  auth.protect();
});

export const config = {
  // Protects all routes, including api/trpc
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 