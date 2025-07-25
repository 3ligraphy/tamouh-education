import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

//REMOVE ANY SUBSCRIPTION RELATED LOGIC - WE NOW OPERATE ON A CREDIT SYSTEM
import { routing } from "./i18n/routing";

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/signin",
  "/signup",
  "/courses",
  "/courses/[^/]+$",
  "/dashboard",
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/callback",
];
const ADMIN_PAGES = ["/admin-dashboard"];
const INSTRUCTOR_PAGES = ["/instructor-dashboard"];

const locales = routing.locales;

// Create a regex pattern for public pages that includes all locales
const PUBLIC_PATHS = PUBLIC_PAGES.map((page) => {
  // Special handling for course pages to ensure they match correctly
  if (page === "/courses/[^/]+$") {
    return new RegExp(`^/(${locales.join("|")})?/courses/[^/]+/?$`);
  }

  return new RegExp(`^/(${locales.join("|")})?(${page})?/?$`);
});
const ADMIN_PATHS = ADMIN_PAGES.map(
  (page) => new RegExp(`^/(${locales.join("|")})${page}(/.*)?$`)
);
const INSTRUCTOR_PATHS = INSTRUCTOR_PAGES.map(
  (page) => new RegExp(`^/(${locales.join("|")})?(${page})/?.*$`)
);

async function middleware(request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName: "next-auth.session-token",
  });

  // Enhanced debug logging
  console.log("Middleware Debug:", {
    path: request.nextUrl.pathname,
    hasToken: !!token,
    userId: token?.id,
    tokenRole: token?.role,
    authSecret: !!process.env.AUTH_SECRET,
    cookies: request.cookies.getAll().map((c) => c.name),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isLessonPath: request.nextUrl.pathname.includes("/lesson/"),
  });

  const pathname = request.nextUrl.pathname;
  let locale = "ar"; // default to ar

  // Extract locale from pathname
  const localeMatch = pathname.match(new RegExp(`^/(${locales.join("|")})`));

  if (localeMatch) {
    locale = localeMatch[1];
  }

  // Check if this is a lesson page
  const lessonMatch = pathname.match(/\/courses\/([^/]+)\/lesson\//);

  if (lessonMatch && token) {
    // Enhanced debug for lesson access
    console.log("Lesson Access Debug:", {
      userId: token.id,
      userRole: token.role,
      lessonPath: pathname,
      timestamp: new Date().toISOString(),
    });

    // If user is admin or instructor, allow access to all lessons
    if (token.role === "ADMIN" || token.role === "INSTRUCTOR") {
      console.log("Granting admin/instructor access to lesson");

      return createMiddleware(routing)(request);
    }

    // For regular users, we'll check enrollment through the API route
    const courseTitle = decodeURIComponent(lessonMatch[1]);

    try {
      // Make an API call to check enrollment
      const enrollmentCheckUrl = new URL("/api/check-enrollment", request.url);

      enrollmentCheckUrl.searchParams.set("userId", token.id);
      enrollmentCheckUrl.searchParams.set("courseTitle", courseTitle);

      const response = await fetch(enrollmentCheckUrl.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.API_SECRET_KEY}`,
        },
      });

      if (response.ok) {
        const { isEnrolled } = await response.json();

        // Enhanced debug for enrollment check
        console.log("Enrollment Check Debug:", {
          userId: token.id,
          courseTitle,
          isEnrolled,
          timestamp: new Date().toISOString(),
        });

        if (isEnrolled) {
          console.log("Granting enrolled user access to lesson");

          return createMiddleware(routing)(request);
        }
      }

      // User is not enrolled or check failed, redirect to course overview page
      console.log("Redirecting non-enrolled user to course overview");

      return NextResponse.redirect(
        new URL(
          `/${locale}/courses/${encodeURIComponent(courseTitle)}`,
          request.url
        )
      );
    } catch (error) {
      console.error("Error checking course enrollment:", {
        error,
        userId: token.id,
        path: pathname,
        timestamp: new Date().toISOString(),
      });

      // On error, redirect to course overview page to be safe
      return NextResponse.redirect(
        new URL(
          `/${locale}/courses/${encodeURIComponent(courseTitle)}`,
          request.url
        )
      );
    }
  }

  const isPublicPage = PUBLIC_PATHS.some((path) => path.test(pathname));
  const isAdminPage = ADMIN_PATHS.some((path) => path.test(pathname));
  const isInstructorPage = INSTRUCTOR_PATHS.some((path) => path.test(pathname));

  // Allow access to public pages without any checks
  if (isPublicPage) {
    return createMiddleware(routing)(request);
  }

  // Handle non-authenticated users - redirect to signin
  if (!token) {
    const signinUrl = new URL(`/${locale}/signin`, request.url);

    signinUrl.searchParams.set("callbackUrl", request.url);

    return NextResponse.redirect(signinUrl);
  }

  // Early return for admins as they have access to everything
  if (token.role === "ADMIN") {
    return createMiddleware(routing)(request);
  }

  // Handle role-specific redirects
  if (isAdminPage) {
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  if (isInstructorPage && token.role !== "INSTRUCTOR") {
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  // Allow access for all other valid requests
  return createMiddleware(routing)(request);
}

export default middleware;

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*|static).*)"],
};
