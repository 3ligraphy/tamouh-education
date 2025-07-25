"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, Tab, Spinner } from "@heroui/react";
import { BookOpenIcon, HeartIcon } from "@heroicons/react/24/outline";

import { api } from "@/trpc/react";
import { CourseCard } from "@/app/_components/course-card";

export default function StudentDashboard() {
  const t = useTranslations("student_dashboard");
  const [selectedTab, setSelectedTab] = useState("enrolled");

  // Fetch enrolled courses
  const { data: enrolledCourses, isLoading: isLoadingEnrolled } =
    api.student.getEnrolledCourses.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  // Fetch favorite courses
  const { data: favoriteCourses, isLoading: isLoadingFavorites } =
    api.student.getFavoriteCourses.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  const renderContent = () => {
    if (selectedTab === "enrolled") {
      if (isLoadingEnrolled) {
        return (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        );
      }

      if (!enrolledCourses?.length) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("no_enrolled_courses")}</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
          {enrolledCourses.map((course) => (
            <CourseCard
              key={course.id}
              showProgress
              course={{
                ...course,
                title: {
                  en:
                    course.translations.find((t) => t.language === "en")
                      ?.courseTitle || "",
                  ar:
                    course.translations.find((t) => t.language === "ar")
                      ?.courseTitle || "",
                },
                description: {
                  en:
                    course.translations.find((t) => t.language === "en")
                      ?.courseDescription || "",
                  ar:
                    course.translations.find((t) => t.language === "ar")
                      ?.courseDescription || "",
                },
              }}
              isFavorite={favoriteCourses?.some((fc) => fc.id === course.id)}
              progress={course.courseProgress[0]?.progress ?? 0}
            />
          ))}
        </div>
      );
    }

    if (isLoadingFavorites) {
      return (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      );
    }

    if (!favoriteCourses?.length) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">{t("no_favorite_courses")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
        {favoriteCourses.map((course) => (
          <CourseCard
            key={course.id}
            showProgress
            course={{
              ...course,
              title: {
                en:
                  course.translations.find((t) => t.language === "en")
                    ?.courseTitle || "",
                ar:
                  course.translations.find((t) => t.language === "ar")
                    ?.courseTitle || "",
              },
              description: {
                en:
                  course.translations.find((t) => t.language === "en")
                    ?.courseDescription || "",
                ar:
                  course.translations.find((t) => t.language === "ar")
                    ?.courseDescription || "",
              },
            }}
            isFavorite={true}
            progress={course.courseProgress?.progress ?? 0}
            updatedAt={course.updatedAt}
            updatedBy={course.updatedBy}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      <Tabs
        aria-label="Dashboard tabs"
        classNames={{
          tabList:
            "gap-6 w-full relative rounded-none p-0 border-b border-divider",
          cursor: "w-full bg-[#d7544f]",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-[#d7544f]",
        }}
        color="primary"
        selectedKey={selectedTab}
        variant="underlined"
        onSelectionChange={setSelectedTab}
      >
        <Tab
          key="enrolled"
          title={
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="h-4 w-4" />
              <span>{t("enrolled_courses")}</span>
              <span className="ml-2">({enrolledCourses?.length ?? 0})</span>
            </div>
          }
        />
        <Tab
          key="favorites"
          title={
            <div className="flex items-center space-x-2">
              <HeartIcon className="h-4 w-4" />
              <span>{t("favorite_courses")}</span>
              <span className="ml-2">({favoriteCourses?.length ?? 0})</span>
            </div>
          }
        />
      </Tabs>

      {renderContent()}
    </div>
  );
}
