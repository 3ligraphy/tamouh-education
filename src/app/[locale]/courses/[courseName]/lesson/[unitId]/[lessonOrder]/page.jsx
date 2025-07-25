"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play, Menu, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@heroui/spinner";
import {
  Button,
  Card,
  CardBody,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  Tabs,
  Tab,
} from "@heroui/react";

import { api } from "@/trpc/react";

export default function LessonPage() {
  const params = useParams();
  const isRTL = params.locale === "ar";
  const t = useTranslations("LessonPage");
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Get the course first to check enrollment
  const { data: course } = api.course.getCourseByTitle.useQuery({
    courseTitle: params.courseName,
  });

  // Get current user to check enrollment
  const { data: currentUser } = api.user.getCurrent.useQuery();

  const isEnrolled =
    course && currentUser && course.enrolledStudentIds.includes(currentUser.id);

  const { data: lesson, isLoading } = api.course.getLessonByOrder.useQuery({
    unitId: params.unitId,
    lessonOrder: parseInt(params.lessonOrder),
  });

  // Get secure video URL if video ID exists and user is enrolled
  const { data: videoData } = api.upload.getSecureVideoUrl.useQuery(
    { videoId: lesson?.videoId ?? "" },
    { enabled: !!lesson?.videoId && isEnrolled }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!lesson) {
    return <div>Lesson not found</div>;
  }

  if (!isEnrolled) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Card className="max-w-lg mx-4">
          <CardBody className="text-center space-y-4">
            <h1 className="text-xl font-bold">{t("enrollmentRequired")}</h1>
            <p className="text-gray-600">{t("enrollmentMessage")}</p>
            <Link
              href={`/${params.locale}/courses/${encodeURIComponent(params.courseName)}`}
            >
              <Button className="mt-4" color="primary">
                {t("goToCourse")}
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const lessonTitle = lesson.translations.find(
    (t) => t.language === params.locale
  )?.lessonTitle;
  const lessonDescription = lesson.translations.find(
    (t) => t.language === params.locale
  )?.lessonDescription;

  const courseTitle = lesson.unit.course.translations.find(
    (t) => t.language === params.locale
  )?.courseTitle;

  const units = lesson.unit.course.units;
  const currentUnitIndex = units.findIndex(
    (unit) => unit.id === lesson.unit.id
  );
  const currentLessonIndex = units[currentUnitIndex].lessons.findIndex(
    (l) => l.id === lesson.id
  );

  // Calculate next and previous lessons
  let nextLesson = null;
  let prevLesson = null;

  if (currentLessonIndex < units[currentUnitIndex].lessons.length - 1) {
    // Next lesson in same unit
    nextLesson = units[currentUnitIndex].lessons[currentLessonIndex + 1];
  } else if (currentUnitIndex < units.length - 1) {
    // First lesson of next unit
    nextLesson = units[currentUnitIndex + 1].lessons[0];
  }

  if (currentLessonIndex > 0) {
    // Previous lesson in same unit
    prevLesson = units[currentUnitIndex].lessons[currentLessonIndex - 1];
  } else if (currentUnitIndex > 0) {
    // Last lesson of previous unit
    const prevUnit = units[currentUnitIndex - 1];

    prevLesson = prevUnit.lessons[prevUnit.lessons.length - 1];
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-4 mb-4">
        <div className="max-w-[1200px] mx-auto flex items-center gap-4">
          <Button
            isIconOnly
            className="bg-transparent hover:bg-gray-100"
            variant="light"
            onPress={onOpen}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-medium">{courseTitle}</h1>
        </div>
      </header>

      <div className="flex">
        {/* Playlist Drawer */}
        <Drawer
          isOpen={isOpen}
          placement={isRTL ? "right" : "left"}
          size="sm"
          onClose={onClose}
        >
          <DrawerContent>
            <DrawerHeader className="flex flex-col gap-1">
              <h4 className="text-lg font-medium">{courseTitle}</h4>
              <p className="text-sm text-gray-600">{t("courseContent")}</p>
            </DrawerHeader>
            <DrawerBody>
              <div className="space-y-4">
                {units.map((unit, unitIndex) => {
                  const unitTitle = unit.translations.find(
                    (t) => t.language === params.locale
                  )?.unitTitle;

                  return (
                    <div key={unit.id} className="space-y-2">
                      <h3 className="font-medium text-lg">
                        {t("unit")} {unitIndex + 1}: {unitTitle}
                      </h3>
                      <div className="space-y-2">
                        {unit.lessons.map((lesson) => {
                          const lessonTitle = lesson.translations.find(
                            (t) => t.language === params.locale
                          )?.lessonTitle;

                          return (
                            <Link
                              key={lesson.id}
                              href={`/${params.locale}/courses/${encodeURIComponent(courseTitle)}/lesson/${unit.id}/${lesson.order}`}
                            >
                              <div
                                className={`p-3 rounded-lg transition-colors ${
                                  lesson.id === params.lessonId
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Play className="w-4 h-4" />
                                  <span className="text-sm">{lessonTitle}</span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Main Content */}
        <div className="flex-1 px-4">
          <div className="max-w-[1200px] mx-auto">
            {/* Video Player */}
            <Card className="mb-8">
              <CardBody className="p-0">
                <div className="aspect-video bg-black">
                  {videoData ? (
                    <iframe
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      className="w-full h-full"
                      src={videoData.url}
                      title={lessonTitle}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {t("videoNotAvailable")}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Lesson Info */}
            {lesson.pdfUrl ? (
              <Tabs
                aria-label="Lesson content"
                className="mb-8"
                variant="underlined"
              >
                <Tab key="description" title={t("description")}>
                  <Card>
                    <CardBody>
                      <h1 className="text-2xl font-bold mb-4">{lessonTitle}</h1>
                      <p className="text-gray-600">{lessonDescription}</p>
                    </CardBody>
                  </Card>
                </Tab>
                <Tab key="materials" title={t("materials")}>
                  <Card>
                    <CardBody>
                      {lesson.pdfUrl && lesson.pdfUrl.length > 0 ? (
                        <div className="space-y-8">
                          {lesson.pdfUrl.map((url, index) => (
                            <div key={index} className="space-y-4">
                              <div className="flex gap-4 items-center">
                                <h3 className="text-lg font-medium">
                                  {t("material")} {index + 1}
                                </h3>
                                <div className="flex gap-2">
                                  <Button
                                    as="a"
                                    color="primary"
                                    href={url}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    variant="flat"
                                  >
                                    {t("viewPdf")}
                                  </Button>
                                  <Button
                                    download
                                    as="a"
                                    color="primary"
                                    href={url}
                                  >
                                    {t("downloadPdf")}
                                  </Button>
                                </div>
                              </div>
                              <iframe
                                className="w-full h-[600px]"
                                src={url}
                                title={`${lessonTitle} - PDF ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-600">
                          {t("noMaterialsAvailable")}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Tab>
              </Tabs>
            ) : (
              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">{lessonTitle}</h1>
                <p className="text-gray-600">{lessonDescription}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              {prevLesson ? (
                <Link
                  href={`/${params.locale}/courses/${encodeURIComponent(
                    courseTitle
                  )}/lesson/${prevLesson.unitId}/${prevLesson.order}`}
                >
                  <Button
                    className="flex items-center gap-2"
                    variant="bordered"
                  >
                    {isRTL ? <ChevronRight /> : <ChevronLeft />}
                    {t("previousLesson")}
                  </Button>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  href={`/${params.locale}/courses/${encodeURIComponent(
                    courseTitle
                  )}/lesson/${nextLesson.unitId}/${nextLesson.order}`}
                >
                  <Button className="flex items-center gap-2" color="primary">
                    {t("nextLesson")}
                    {isRTL ? <ChevronLeft /> : <ChevronRight />}
                  </Button>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
