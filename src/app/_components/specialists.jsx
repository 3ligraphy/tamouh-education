// components/sections/Specialists.tsx
"use client";
import { Card, CardBody } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

import { api } from "@/trpc/react";

export function Specialists() {
  const t = useTranslations("Specialists");
  const locale = useLocale();
  const { data: specialists, isLoading } = api.specialist.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Don't render anything if there are no specialists or still loading
  if (isLoading) {
    return null;
  }

  if (!specialists || specialists.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16">
      <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-center">
        {t("title")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {specialists.map((specialist) => (
          <Card
            key={specialist.id}
            className="relative aspect-[3/4] overflow-hidden border-none"
          >
            <CardBody className="p-0">
              <div className="relative w-full h-full">
                <img
                  alt={specialist.name[locale]}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={specialist.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#a73d22]/60 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white text-center">
                  <h3 className="font-semibold text-base md:text-lg mb-0.5 md:mb-1">
                    {specialist.name[locale]}
                  </h3>
                  <p className="text-xs md:text-sm opacity-90">
                    {specialist.title[locale]}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
