"use client";

// app/[locale]/page.jsx
import { HeroSection } from "../_components/hero-section";
import { PopularCourses } from "../_components/popular-courses";
import { RecentCourses } from "../_components/recent-courses";
import { Specialists } from "../_components/specialists";
import { FilteredCourses } from "../_components/filtered-courses";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <PopularCourses />
      <RecentCourses />
      <FilteredCourses />
      <Specialists />
    </main>
  );
}
