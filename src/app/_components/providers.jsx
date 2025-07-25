// app/providers.jsx

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NextIntlClientProvider, useMessages } from "next-intl";

import { FingerprintProvider } from "./fp-provider";
import SessionValidator from "./session-validator";

import { TRPCReactProvider } from "@/trpc/react";

export function Providers({ children, session, locale }) {
  const messages = useMessages();

  return (
    <TRPCReactProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <SessionProvider session={session}>
          <HeroUIProvider>
            <ThemeProvider attribute="class" defaultTheme="light">
              <FingerprintProvider>
                <SessionValidator />
                {children}
              </FingerprintProvider>
              <Toaster richColors position="top-center" />
            </ThemeProvider>
          </HeroUIProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </TRPCReactProvider>
  );
}
