"use client";
import React, { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Select,
  Button,
  Input,
  SelectItem,
  Pagination,
  Spinner,
} from "@heroui/react";
import { useSession } from "next-auth/react";

import { api } from "@/trpc/react";
import { CourseCard } from "@/app/_components/course-card";

const CoursesPage = () => {
  const t = useTranslations("CoursesPage");
  const locale = useLocale();
  const { data: session } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const rowsPerPage = 12;

  // Get categories
  const { data: categories } = api.category.getAll.useQuery();

  // Get courses with filters
  const { data: courses, isLoading } = api.course.getFilteredCourses.useQuery({
    languages: selectedLanguage ? [selectedLanguage] : undefined,
    subjects: selectedCategory ? [selectedCategory] : undefined,
    page: currentPage,
    pageSize: rowsPerPage,
    studentType: session?.user?.studentType,
  });

  // Calculate pagination
  const pages = Math.ceil((courses?.totalCourses ?? 0) / rowsPerPage);

  // Get current page items
  const currentCourses = useMemo(() => {
    if (!courses?.courses) return [];

    return courses.courses;
  }, [courses]);

  return (
    <>
      {/* Search Header */}
      <div
        className="w-full py-8 relative bg-cover bg-center mb-8"
        style={{
          backgroundImage: 'url("/courses-banner.png")',
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-[1400px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white">
              {t("Search for your favorite course")}
            </h2>
            <Input
              className="w-full max-w-[400px] mx-auto"
              classNames={{
                base: "max-w-full h-12",
                mainWrapper: "h-full",
                input: "text-base",
                inputWrapper:
                  "h-full font-normal text-default-500 bg-white shadow-sm hover:bg-default-100 border-2 border-gray-200 hover:border-primary/50 rounded-xl",
              }}
              placeholder={t("Search for a course")}
              startContent={
                <svg
                  className="text-gray-400 flex-shrink-0"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21.7 20.3L18 16.6C19.3 15 20 13.1 20 11C20 6.6 16.4 3 12 3C7.6 3 4 6.6 4 11C4 15.4 7.6 19 12 19C14.1 19 16 18.3 17.6 17L21.3 20.7C21.5 20.9 21.7 21 22 21C22.3 21 22.5 20.9 22.7 20.7C23.1 20.3 23.1 19.7 21.7 20.3ZM6 11C6 7.7 8.7 5 12 5C15.3 5 18 7.7 18 11C18 14.3 15.3 17 12 17C8.7 17 6 14.3 6 11Z"
                    fill="currentColor"
                  />
                </svg>
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Filter Section */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8 max-w-6xl mx-auto relative">
            <Select
              className="w-full"
              classNames={{
                trigger: "bg-white rounded-xl shadow-sm h-10 md:h-12",
                value: "text-center text-sm md:text-base",
              }}
              label={t("Language")}
              labelPlacement="outside"
              placeholder={t("Language")}
              selectedKeys={selectedLanguage ? [selectedLanguage] : []}
              variant="bordered"
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <SelectItem key="">{t("All Languages")}</SelectItem>
              <SelectItem key="ar" value="ar">
                {t("Arabic")}
              </SelectItem>
              <SelectItem key="en" value="en">
                {t("English")}
              </SelectItem>
            </Select>

            <Select
              className="w-full"
              classNames={{
                trigger: "bg-white rounded-xl shadow-sm h-10 md:h-12",
                value: "text-center text-sm md:text-base",
              }}
              label={t("Category")}
              labelPlacement="outside"
              placeholder={t("Category")}
              selectedKeys={selectedCategory ? [selectedCategory] : []}
              variant="bordered"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <SelectItem key="">{t("All Categories")}</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.translations.find((t) => t.language === locale)
                    ?.categoryName || category.id}
                </SelectItem>
              ))}
            </Select>

            <Select
              className="w-full"
              classNames={{
                trigger: "bg-white rounded-xl shadow-sm h-10 md:h-12",
                value: "text-center text-sm md:text-base",
              }}
              label={t("Duration")}
              labelPlacement="outside"
              placeholder={t("Duration")}
              selectedKeys={selectedDuration ? [selectedDuration] : []}
              variant="bordered"
              onChange={(e) => setSelectedDuration(e.target.value)}
            >
              <SelectItem key="">{t("All Durations")}</SelectItem>
              <SelectItem key="short">{t("Less than 4 weeks")}</SelectItem>
              <SelectItem key="medium">{t("1-3 months")}</SelectItem>
              <SelectItem key="long">{t("More than 3 months")}</SelectItem>
            </Select>

            <Button
              className="bg-primary hover:bg-primary/90 text-white px-12 py-2 rounded-xl font-medium h-12 self-end"
              onPress={() => {
                setSearchQuery("");
                setSelectedLanguage("");
                setSelectedCategory("");
                setSelectedDuration("");
              }}
            >
              {t("Reset Filters")}
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : !courses?.courses.length ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ||
              selectedLanguage ||
              selectedCategory ||
              selectedDuration
                ? t("No courses found")
                : t("No courses available yet")}
            </h3>
            <p className="text-gray-500">
              {searchQuery ||
              selectedLanguage ||
              selectedCategory ||
              selectedDuration
                ? t("Try adjusting your filters or search query")
                : t("Please check back later for new courses")}
            </p>
          </div>
        ) : (
          <>
            {/* Courses Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {currentCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <Pagination
                showControls
                classNames={{
                  wrapper: "gap-1",
                  item: "w-10 h-10",
                  next: "bg-transparent",
                  prev: "bg-transparent",
                }}
                initialPage={1}
                page={currentPage}
                total={pages}
                onChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CoursesPage;
