"use client";
import { useState } from "react";
import {
  Card,
  Checkbox,
  CheckboxGroup,
  Button,
  Select,
  SelectItem,
  AccordionItem,
  Accordion,
  Pagination,
} from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

import { CourseCard } from "./course-card";

import { api } from "@/trpc/react";

export function FilteredCourses() {
  const t = useTranslations("Filters");
  const locale = useLocale();
  const { data: session } = useSession();
  const [selectedLevel, setSelectedLevel] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState([]);
  const [selectedRating, setSelectedRating] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State to store the filters that should be applied
  const [appliedFilters, setAppliedFilters] = useState({
    levels: [],
    languages: [],
    subjects: [],
    ratings: [],
    sortBy: "newest",
    page: 1,
  });

  // Get categories from the database
  const { data: categories } = api.category.getAll.useQuery();

  // Fetch courses with applied filters
  const { data: coursesData, isLoading } =
    api.course.getFilteredCourses.useQuery({
      ...appliedFilters,
      page: currentPage,
      studentType: session?.user?.studentType,
    });

  const handleReset = () => {
    setSelectedLevel([]);
    setSelectedLanguage([]);
    setSelectedSubject([]);
    setSelectedRating([]);
    setSortBy("newest");
    setCurrentPage(1);
    setAppliedFilters({
      levels: [],
      languages: [],
      subjects: [],
      ratings: [],
      sortBy: "newest",
      page: 1,
    });
  };

  const handleApply = () => {
    setCurrentPage(1);
    setAppliedFilters({
      levels: selectedLevel.length > 0 ? selectedLevel : undefined,
      languages: selectedLanguage.length > 0 ? selectedLanguage : undefined,
      subjects: selectedSubject.length > 0 ? selectedSubject : undefined,
      ratings: selectedRating.length > 0 ? selectedRating : undefined,
      sortBy,
      page: 1,
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setAppliedFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  return (
    <section className="w-full py-6 md:py-12 px-4 md:px-8 relative">
      <div className="w-full absolute inset-0 overflow-hidden">
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
            fillOpacity="0.1"
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
            fillOpacity="0.1"
          />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4 flex justify-between items-center">
          <Button
            color="primary"
            startContent={<Menu size={20} />}
            variant="flat"
            onPress={() => setIsFilterOpen(!isFilterOpen)}
          >
            {t("Filters")}
          </Button>
          <Select
            className="w-32"
            label={t("Sort by")}
            selectedKeys={[sortBy]}
            size="sm"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <SelectItem key="newest" value="newest">
              {t("Newest")}
            </SelectItem>
            <SelectItem key="popular" value="popular">
              {t("Most Popular")}
            </SelectItem>
            <SelectItem key="rating" value="rating">
              {t("Highest Rated")}
            </SelectItem>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <Card
            className={`p-6 w-full md:w-64 h-fit ${isFilterOpen ? "block" : "hidden"} md:block`}
          >
            <h3 className="text-lg font-semibold mb-2">{t("Filters")}</h3>
            <div className="space-y-6">
              {/* Level Filter */}
              <Accordion selectionMode="multiple">
                <AccordionItem
                  classNames={{
                    title: "text-lg font-semibold",
                  }}
                  title={`${t("Level")}`}
                >
                  <CheckboxGroup
                    value={selectedLevel}
                    onValueChange={setSelectedLevel}
                  >
                    <Checkbox value="beginner">{t("Beginner")}</Checkbox>
                    <Checkbox value="intermediate">
                      {t("Intermediate")}
                    </Checkbox>
                    <Checkbox value="advanced">{t("Advanced")}</Checkbox>
                  </CheckboxGroup>
                </AccordionItem>

                {/* Language Filter */}
                <AccordionItem
                  classNames={{
                    title: "text-lg font-semibold",
                  }}
                  title={t("Language")}
                >
                  <CheckboxGroup
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <Checkbox value="ar">{t("Arabic")}</Checkbox>
                    <Checkbox value="en">{t("English")}</Checkbox>
                  </CheckboxGroup>
                </AccordionItem>

                {/* Subject Filter */}
                <AccordionItem
                  classNames={{
                    title: "text-lg font-semibold",
                  }}
                  title={t("Subject")}
                >
                  <CheckboxGroup
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    {categories?.map((category) => (
                      <Checkbox
                        key={category.id}
                        value={
                          category.translations.find((t) => t.language === "en")
                            ?.categoryName || ""
                        }
                      >
                        {category.translations.find(
                          (t) => t.language === locale
                        )?.categoryName ||
                          category.translations.find((t) => t.language === "en")
                            ?.categoryName ||
                          t("Loading")}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </AccordionItem>

                {/* Rating Filter */}
                <AccordionItem
                  classNames={{
                    title: "text-lg font-semibold",
                  }}
                  title={t("Rating")}
                >
                  <CheckboxGroup
                    value={selectedRating}
                    onValueChange={setSelectedRating}
                  >
                    <Checkbox value="5">
                      <span className="text-lg">
                        <span className="text-yellow-400">★★★★★</span>
                      </span>
                    </Checkbox>
                    <Checkbox value="4">
                      <span className="text-lg">
                        <span className="text-yellow-400">★★★★</span>
                        <span className="text-gray-300">★</span>
                      </span>
                    </Checkbox>
                    <Checkbox value="3">
                      <span className="text-lg">
                        <span className="text-yellow-400">★★★</span>
                        <span className="text-gray-300">★★</span>
                      </span>
                    </Checkbox>
                    <Checkbox value="2">
                      <span className="text-lg">
                        <span className="text-yellow-400">★★</span>
                        <span className="text-gray-300">★★★</span>
                      </span>
                    </Checkbox>
                  </CheckboxGroup>
                </AccordionItem>
              </Accordion>
              <div className="flex gap-2 flex-row">
                <Button
                  className="w-full"
                  color="primary"
                  onPress={handleReset}
                >
                  {t("Reset")}
                </Button>
                <Button
                  className="w-full"
                  color="primary"
                  onPress={handleApply}
                >
                  {t("Apply")}
                </Button>
              </div>
            </div>
          </Card>

          {/* Courses Grid */}
          <div className="flex-1">
            <div className="hidden md:flex justify-between items-center mb-6">
              <Select
                className="w-48"
                label={t("Sort by")}
                selectedKeys={[sortBy]}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <SelectItem key="newest" value="newest">
                  {t("Newest")}
                </SelectItem>
                <SelectItem key="popular" value="popular">
                  {t("Most Popular")}
                </SelectItem>
                <SelectItem key="rating" value="rating">
                  {t("Highest Rated")}
                </SelectItem>
              </Select>
              <p className="text-default-500">
                {coursesData?.pagination?.totalCourses ?? 0} {t("Results")}
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {!coursesData?.courses?.length ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-xl font-semibold text-gray-600 mb-2">
                      {t("No courses found")}
                    </p>
                    <p className="text-gray-500">
                      {t(
                        "Try adjusting your filters or check back later for new courses"
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {coursesData.courses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                )}

                {(coursesData?.pagination?.totalPages ?? 0) > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination
                      className="overflow-x-auto max-w-full"
                      page={currentPage}
                      size="sm"
                      total={coursesData?.pagination?.totalPages ?? 1}
                      onChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
