export function getBaseUrl() {
  if (process.env.VERCEL_ENV === "development") {
    return "http://localhost:3000";
  } else {
    return process.env.NEXTAUTH_URL || "https://hightopfurniture.com";
  }
}
