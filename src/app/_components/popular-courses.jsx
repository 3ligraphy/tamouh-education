// components/sections/PopularCourses.tsx
"use client";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { CourseCard } from "./course-card";

import { api } from "@/trpc/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function PopularCourses() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const sectionT = useTranslations("PopularCourses");
  const { data: session } = useSession();
  const { data: courses, isLoading } = api.course.getPopularCourses.useQuery({
    studentType: session?.user?.studentType,
  });
  const [carouselApi, setCarouselApi] = useState();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Effect for handling carousel API events
  useEffect(() => {
    if (!carouselApi) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    carouselApi.on("select", updateScrollButtons);

    return () => {
      carouselApi.off("select", updateScrollButtons);
    };
  }, [carouselApi]);

  // Separate effect for handling initial state when courses load
  useEffect(() => {
    if (!carouselApi || !courses) return;

    // Set initial scroll state based on number of courses
    setCanScrollNext(courses.length > 4);
    setCanScrollPrev(false);
  }, [carouselApi, courses]);

  const scrollPrev = () => {
    if (carouselApi) {
      isRTL ? carouselApi.scrollNext() : carouselApi.scrollPrev();
    }
  };

  const scrollNext = () => {
    if (carouselApi) {
      isRTL ? carouselApi.scrollPrev() : carouselApi.scrollNext();
    }
  };

  return (
    <div className="py-6 md:py-10 relative">
      <div className="w-full absolute overflow-hidden h-full">
        {/* Mobile SVG */}
        <svg
          className="md:hidden w-full h-[65%] origin-top"
          fill="none"
          height="668"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1515 668"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 99.0449C371.91 -172.88 1217.26 222.372 1515 31.1254V631.014C1012.63 770.554 541.297 457.683 0 631.014V99.0449Z"
            fill="#C96346"
            fillOpacity="0.3"
          />
        </svg>
        {/* Desktop SVG */}
        <svg
          className="hidden md:block w-full h-full md:scale-100"
          fill="none"
          height="668"
          preserveAspectRatio="none"
          viewBox="0 0 1515 668"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 99.0449C371.91 -172.88 1217.26 222.372 1515 31.1254V631.014C1012.63 770.554 541.297 457.683 0 631.014V99.0449Z"
            fill="#C96346"
            fillOpacity="0.3"
          />
        </svg>
      </div>
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16 overflow-hidden relative z-10">
        <div className="flex justify-between items-center mb-8 font-rubik">
          <h2 className="text-2xl font-bold">{sectionT("title")}</h2>
        </div>

        <div className="relative">
          <Carousel
            className="w-full"
            opts={{
              align: "center",
              loop: false,
              direction: isRTL ? "rtl" : "ltr",
            }}
            setApi={setCarouselApi}
          >
            <CarouselContent className="-ml-1 md:-ml-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <CarouselItem
                    key={index}
                    className="pl-1 md:pl-4 basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  >
                    <div className="w-full h-[300px] md:h-[400px] bg-gray-200 animate-pulse rounded-lg" />
                  </CarouselItem>
                ))
              ) : courses && courses.length > 0 ? (
                courses.map((course) => (
                  <CarouselItem
                    key={course.id}
                    className="pl-1 md:pl-4 basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  >
                    <div className="p-1">
                      <CourseCard course={course} />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="pl-1 md:pl-4 basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <div className="p-1">
                    <div className="w-full h-[300px] md:h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
                      <p className="text-gray-500">No courses available</p>
                    </div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {!isLoading && courses?.length > 1 && (
              <>
                <CarouselPrevious
                  className="absolute left-1 md:-left-4 top-1/2 -translate-y-1/2"
                  disabled={isRTL ? !canScrollNext : !canScrollPrev}
                  onClick={scrollPrev}
                />
                <CarouselNext
                  className="absolute right-1 md:-right-4 top-1/2 -translate-y-1/2"
                  disabled={isRTL ? !canScrollPrev : !canScrollNext}
                  onClick={scrollNext}
                />
              </>
            )}
          </Carousel>
        </div>
      </section>
    </div>
  );
}
