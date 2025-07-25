"use client";

import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

import { env } from "@/env";

let fpPromise;

export function FingerprintProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load({
        apiKey: env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY,
      });
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return children;
}

// Export the initialized FingerprintJS promise for use in other components
export { fpPromise };
