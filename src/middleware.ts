import { authMiddleware } from "@clerk/nextjs/server";
import { syncUser } from "./actions";

export default authMiddleware({
  async afterAuth(auth, req, evt) {
    // If the user is logged in, ensure they exist in our database
    if (auth.userId) {
      try {
        await syncUser(auth.userId);
      } catch (error) {
        console.error("Error syncing user in middleware:", error);
        // Don't throw the error - we want the request to continue even if sync fails
      }
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 