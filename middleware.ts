import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/api/history(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Wrap everything in try-catch to handle offline scenarios
  try {
    // Only enforce authentication on protected routes
    if (isProtectedRoute(req)) {
      try {
        await auth.protect();
      } catch (error) {
        // If authentication fails (e.g., offline), allow anonymous access
        // The individual API routes will handle the lack of userId gracefully
        console.log("Authentication failed, allowing anonymous access:", error);
      }
    }
  } catch (error) {
    // If there's any middleware error (e.g., network issues), continue without blocking
    console.log("Middleware error, continuing without authentication:", error);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
