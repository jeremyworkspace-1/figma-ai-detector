import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages that require a signed-in user
const isProtectedRoute = createRouteMatcher([
  "/",
  "/submissions",
  "/submissions/(.*)",
  "/new-scan",
  "/new-scan/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Redirects unauthenticated users to Clerk's sign-in page
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/(.*)",
    "/(api|trpc)(.*)",
  ],
};
