"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Textarea,
  Button,
  Switch,
  Progress,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { IoCloudUploadOutline, IoAddCircleOutline } from "react-icons/io5";
import { useSession } from "next-auth/react";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

const VideoPlayer = ({ videoId, title }) => {
  const t = useTranslations("instructor_dashboard");
  const { getVideoUrl } = useFileUpload();
  const { data, isLoading, isError } = getVideoUrl(videoId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-gray-500">{t("video_processing")}</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <p className="text-sm text-red-500">
          Error loading video. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingTop: "56.25%" }}>
      <iframe
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowFullScreen={true}
        loading="lazy"
        src={data.url}
        style={{
          border: 0,
          position: "absolute",
          top: 0,
          height: "100%",
          width: "100%",
        }}
        title={title}
      />
    </div>
  );
};

const UnitCard = ({ unit, index, t, onUnitChange }) => {
  const [lessons, setLessons] = useState(
    unit.lessons || [
      {
        id: 1,
        title: "",
        description: "",
        videoId: "",
        pdfUrl: [],
      },
    ]
  );
  const { uploadFile, progress } = useFileUpload();
  const [uploadingLessonIndex, setUploadingLessonIndex] = useState(null);
  const [uploadingPdfIndex, setUploadingPdfIndex] = useState(null);

  const handleVideoUpload = async (file, lessonIndex) => {
    try {
      setUploadingLessonIndex(lessonIndex);
      const { videoId } = await uploadFile(file, "video");

      handleLessonChange(lessonIndex, "videoId", videoId);
    } catch (error) {
      toast.error(t("lessons_section.upload_lesson_video_error"));
      console.error("Video upload failed:", error);
    } finally {
      setUploadingLessonIndex(null);
    }
  };

  const handlePdfUpload = async (files, lessonIndex) => {
    try {
      setUploadingPdfIndex(lessonIndex);
      const uploadPromises = files.map((file) => uploadFile(file, "pdf"));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((result) => result.cdnUrl);

      // Get existing PDFs and append new ones
      const currentPdfs = lessons[lessonIndex].pdfUrl || [];

      handleLessonChange(lessonIndex, "pdfUrls", [...currentPdfs, ...newUrls]);
      toast.success(t("lessons_section.pdfs_uploaded"));
    } catch (error) {
      toast.error(t("lessons_section.pdf_upload_failed"));
      console.error("PDF upload failed:", error);
    } finally {
      setUploadingPdfIndex(null);
    }
  };

  const addLesson = () => {
    setLessons([
      ...lessons,
      {
        id: lessons.length + 1,
        title: "",
        description: "",
        videoId: "",
        pdfUrl: [],
      },
    ]);
  };

  const handleLessonChange = (lessonIndex, field, value) => {
    const newLessons = [...lessons];

    if (field === "pdfUrls") {
      // For adding new PDFs, but keep the field name as pdfUrl to match schema
      newLessons[lessonIndex] = {
        ...newLessons[lessonIndex],
        pdfUrl: value, // This is already an array from handlePdfUpload
      };
    } else {
      newLessons[lessonIndex] = {
        ...newLessons[lessonIndex],
        [field]: value,
      };
    }
    setLessons(newLessons);
    onUnitChange(index, { ...unit, lessons: newLessons });
  };

  return (
    <Card className="mb-4 border-2 border-gray-200">
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary">
              {t("unit")} {index + 1}
            </span>
          </div>
          <Input
            isRequired
            label={t("unit_name")}
            placeholder={t("enter_unit_name")}
            value={unit.name}
            onChange={(e) =>
              onUnitChange(index, { ...unit, name: e.target.value })
            }
          />
          <Textarea
            isRequired
            label={t("unit_description")}
            maxRows={4}
            placeholder={t("enter_unit_description")}
            value={unit.description}
            onChange={(e) =>
              onUnitChange(index, { ...unit, description: e.target.value })
            }
          />
          <div className="text-xs text-gray-400 text-right">
            {unit.description.length}/2000
          </div>

          {/* Lessons Section */}
          <div className="mt-4">
            <div className="text-lg font-semibold text-primary mb-4">
              {t("lessons")}
            </div>
            {lessons.map((lesson, lessonIndex) => (
              <Card key={lesson.id} className="mb-4 bg-gray-50">
                <CardBody>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {t("lesson")} {lessonIndex + 1}
                      </span>
                    </div>
                    <Input
                      isRequired
                      label={t("lesson_title")}
                      placeholder={t("enter_lesson_title")}
                      value={lesson.title}
                      onChange={(e) =>
                        handleLessonChange(lessonIndex, "title", e.target.value)
                      }
                    />
                    <Textarea
                      isRequired
                      label={t("lesson_description")}
                      maxRows={4}
                      placeholder={t("enter_lesson_description")}
                      value={lesson.description}
                      onChange={(e) =>
                        handleLessonChange(
                          lessonIndex,
                          "description",
                          e.target.value
                        )
                      }
                    />

                    {/* Video Upload Section */}
                    <div className="bg-primary/5 rounded-lg p-4">
                      <button
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={uploadingLessonIndex === lessonIndex}
                        onClick={async (e) => {
                          e.preventDefault();
                          const input = document.createElement("input");

                          input.type = "file";
                          input.accept = "video/*";
                          input.onchange = async (e) => {
                            const file = e.target.files[0];

                            if (file) {
                              await handleVideoUpload(file, lessonIndex);
                            }
                          };
                          input.click();
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div className="mb-2">
                            <IoCloudUploadOutline className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm text-gray-600">
                            {t("upload_lesson_video")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("video_formats")}
                          </p>
                        </div>
                      </button>
                      {uploadingLessonIndex === lessonIndex && (
                        <Progress
                          className="mt-2"
                          color="primary"
                          size="sm"
                          value={progress}
                        />
                      )}
                      {lesson.videoId ? (
                        <div className="mt-4">
                          <div className="aspect-video w-full">
                            <VideoPlayer
                              title={lesson.title}
                              videoId={lesson.videoId}
                            />
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            {t("video_uploaded")}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* PDF Upload Section */}
                    <div className="bg-primary/5 rounded-lg p-4">
                      <button
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={uploadingPdfIndex === lessonIndex}
                        onClick={(e) => {
                          e.preventDefault();
                          const input = document.createElement("input");

                          input.type = "file";
                          input.accept = "application/pdf";
                          input.multiple = true;
                          input.onchange = async (e) => {
                            const files = Array.from(e.target.files);

                            if (files.length > 0) {
                              await handlePdfUpload(files, lessonIndex);
                            }
                          };
                          input.click();
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div className="mb-2">
                            <IoCloudUploadOutline className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm text-gray-600">
                            {lesson.pdfUrl?.length > 0
                              ? t("lessons_section.add_more_pdfs")
                              : t("lessons_section.upload_lesson_pdfs")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("lessons_section.pdf_formats")}
                          </p>
                        </div>
                      </button>

                      {uploadingPdfIndex === lessonIndex && (
                        <Progress
                          className="mt-2"
                          color="primary"
                          size="sm"
                          value={progress}
                        />
                      )}

                      {lesson.pdfUrl?.length > 0 ? (
                        <div className="mt-4">
                          <div className="flex flex-col gap-4">
                            {lesson.pdfUrl.map((url, pdfIndex) => (
                              <div key={url} className="border rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                  <a
                                    className="text-primary hover:underline text-sm flex-grow"
                                    href={url}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                  >
                                    {t("lessons_section.view_pdf")}{" "}
                                    {pdfIndex + 1}
                                  </a>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    variant="light"
                                    onPress={() => {
                                      const newPdfUrls = lesson.pdfUrl.filter(
                                        (_, i) => i !== pdfIndex
                                      );

                                      handleLessonChange(
                                        lessonIndex,
                                        "pdfUrls",
                                        newPdfUrls
                                      );
                                    }}
                                  >
                                    {t("buttons.remove")}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}

            <Button
              className="w-full border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10"
              onPress={addLesson}
            >
              <IoAddCircleOutline className="text-xl" />
              <span className="ml-2">{t("add_lesson")}</span>
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// Unit Creation Component
const UnitCreation = ({ t, setActiveStep, courseId, handleCreateCourse }) => {
  const [units, setUnits] = useState([
    { id: 1, name: "", description: "", lessons: [] },
  ]);
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addUnitMutation = api.course.addUnit.useMutation({
    onSuccess: () => {
      toast.success(t("units_saved_successfully"));
    },
    onError: (error) => {
      toast.error(error.message || t("error_saving_units"));
      setIsSubmitting(false);
    },
  });

  const validateUnits = () => {
    for (const unit of units) {
      if (!unit.name || !unit.description) {
        toast.error(t("unit_fields_required"));

        return false;
      }

      if (!unit.lessons || unit.lessons.length === 0) {
        toast.error(t("unit_requires_lessons"));

        return false;
      }

      for (const lesson of unit.lessons) {
        if (!lesson.title || !lesson.description || !lesson.videoId) {
          toast.error(t("lesson_fields_required"));

          return false;
        }
      }
    }

    return true;
  };

  const handleSaveUnits = async (shouldPublish = false) => {
    if (!validateUnits()) return;

    try {
      setIsSubmitting(true);

      // First create the course if it doesn't exist
      let finalCourseId = courseId;

      if (!courseId) {
        const result = await handleCreateCourse(shouldPublish);

        if (!result?.id) {
          toast.error(t("error_creating_course"));

          return;
        }
        finalCourseId = result.id;
      }

      // Then add the units
      try {
        for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          const formattedLessons = unit.lessons
            .filter(
              (lesson) => lesson.title && lesson.description && lesson.videoId
            )
            .map((lesson, index) => ({
              order: index + 1,
              videoId: lesson.videoId,
              pdfUrl: lesson.pdfUrl || null,
              isVisible: shouldPublish,
              translations: [
                {
                  language: "en",
                  lessonTitle: lesson.title,
                  lessonDescription: lesson.description,
                },
                {
                  language: "ar",
                  lessonTitle: lesson.title,
                  lessonDescription: lesson.description,
                },
              ],
            }));

          await addUnitMutation.mutateAsync({
            courseId: finalCourseId,
            unit: {
              order: i + 1,
              isVisible: shouldPublish,
              translations: [
                {
                  language: "en",
                  unitTitle: unit.name,
                  unitDescription: unit.description,
                },
                {
                  language: "ar",
                  unitTitle: unit.name,
                  unitDescription: unit.description,
                },
              ],
              lessons: formattedLessons,
            },
          });
        }

        if (shouldPublish) {
          toast.success(t("course_published_successfully"));
          // TODO: Add navigation to courses list
        } else {
          toast.success(t("units_saved_successfully"));
        }
      } catch (error) {
        console.error("Failed to save units:", error);
        toast.error(error.message || t("error_saving_units"));
        throw error; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error("Failed to save course or units:", error);
      toast.error(error.message || t("error_saving_course"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnitChange = (index, updatedUnit) => {
    const newUnits = [...units];

    newUnits[index] = updatedUnit;
    setUnits(newUnits);
  };

  const addUnit = () => {
    setUnits([
      ...units,
      { id: units.length + 1, name: "", description: "", lessons: [] },
    ]);
  };

  return (
    <Card className="mb-6">
      <CardBody>
        <div className="space-y-6">
          {/* Course Visibility Toggle */}
          <div className="flex justify-between items-center bg-default-100 p-4 rounded-lg">
            <div className="flex flex-col gap-0">
              <span className="text-lg font-semibold">
                {t("course_visibility")}
              </span>
              <span className="text-sm text-gray-500">
                {t("visibility_description")}
              </span>
            </div>
            <Switch
              color="primary"
              defaultSelected={isVisible}
              size="lg"
              onChange={(checked) => setIsVisible(checked)}
            >
              <span className="text-sm">
                {isVisible ? t("visible") : t("hidden")}
              </span>
            </Switch>
          </div>

          <div className="text-2xl font-bold text-primary mb-4">
            {t("first_unit")}
          </div>

          {units.map((unit, index) => (
            <UnitCard
              key={unit.id}
              index={index}
              t={t}
              unit={unit}
              onUnitChange={handleUnitChange}
            />
          ))}

          <Button
            className="w-full border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10"
            onPress={addUnit}
          >
            <IoAddCircleOutline className="text-xl" />
            <span className="ml-2">{t("add_unit")}</span>
          </Button>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6 gap-4">
            <Button
              className="text-primary"
              isDisabled={isSubmitting}
              variant="light"
              onPress={() => setActiveStep(1)}
            >
              {t("back")}
            </Button>
            <div className="flex gap-2">
              <Button
                className="text-primary border-primary"
                isDisabled={isSubmitting}
                variant="bordered"
                onPress={() => handleSaveUnits(false)}
              >
                {t("save_draft")}
              </Button>
              <Button
                className="bg-primary text-white"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                onPress={() => handleSaveUnits(true)}
              >
                {t("publish_course")}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

const CourseCreation = () => {
  // Move all hooks to the top of the component
  const t = useTranslations("instructor_dashboard");
  const { locale } = useParams();
  const isRTL = locale === "ar";
  const { uploadFile, isUploading, progress, getVideoUrl } = useFileUpload();
  const { data: session } = useSession();
  const { data: instructorData, isLoading: isLoadingPermissions } =
    api.instructor.getMyPermissions.useQuery(undefined, {
      enabled: session?.user?.role === "INSTRUCTOR",
    });
  const { data: instructors } = api.instructor.getAllInstructors.useQuery(
    undefined,
    {
      enabled: session?.user?.role === "ADMIN",
    }
  );
  const createCourseMutation = api.course.create.useMutation({
    onError: (error) => {
      toast.error(error.message || t("error_creating_course"));
      setIsSubmitting(false);
    },
  });
  const { data: categories } = api.category.getAll.useQuery();
  const {
    getRootProps: getThumbnailRootProps,
    getInputProps: getThumbnailInputProps,
  } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles[0]) {
        await handleThumbnailUpload(acceptedFiles[0]);
      }
    },
  });

  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [courseData, setCourseData] = useState({
    name: "",
    nameAr: "",
    category: "",
    level: "",
    language: "",
    timezone: "",
    startDate: "",
    endDate: "",
    courseDuration: "",
    courseDescription: "",
    courseDescriptionAr: "",
    thumbnailUrl: "",
    overviewVideoUrl: "",
    overviewVideoId: "",
    courseType: "",
    id: null,
    price: 0,
    ownerId: "",
    learningPoints: {
      en: [""],
      ar: [""],
    },
    targetAudience: {
      en: [""],
      ar: [""],
    },
    requirements: {
      en: [""],
      ar: [""],
    },
  });

  // Always call getVideoUrl hook, but only use the result when needed
  const overviewVideoUrlResult = getVideoUrl(courseData.overviewVideoId || "");
  const overviewVideoUrl = courseData.overviewVideoId
    ? overviewVideoUrlResult.data?.url
    : null;

  const canCreateCourses =
    (session?.user?.role === "ADMIN" ||
      (session?.user?.role === "INSTRUCTOR" &&
        instructorData?.permissions?.canCreateCourses)) ??
    false;

  const validateCourseData = () => {
    if (!courseData.thumbnailUrl) {
      toast.error(t("thumbnail_required"));

      return false;
    }

    // Add owner validation for admin users
    if (session?.user?.role === "ADMIN" && !courseData.ownerId) {
      toast.error(t("owner_required"));

      return false;
    }

    const requiredFields = [
      "name",
      "nameAr",
      "category",
      "level",
      "language",
      "timezone",
      "startDate",
      "endDate",
      "courseDuration",
      "courseDescription",
      "courseDescriptionAr",
      "courseType",
    ];

    for (const field of requiredFields) {
      if (!courseData[field]) {
        toast.error(t("all_fields_required"));

        return false;
      }
    }

    // Validate course duration is a positive number
    const duration = parseInt(courseData.courseDuration);

    if (isNaN(duration) || duration <= 0) {
      toast.error(t("invalid_course_duration"));

      return false;
    }

    // Validate price is a non-negative number
    const price = parseFloat(courseData.price);

    if (isNaN(price) || price < 0) {
      toast.error(t("invalid_price"));

      return false;
    }

    const startDate = new Date(courseData.startDate);
    const endDate = new Date(courseData.endDate);

    if (startDate >= endDate) {
      toast.error(t("invalid_date_range"));

      return false;
    }

    if (!courseData.briefEn || !courseData.briefAr) {
      toast.error(t("course_brief_required"));

      return false;
    }

    return true;
  };

  const handleCreateCourse = async (shouldPublish = false) => {
    if (!validateCourseData()) return;

    try {
      setIsSubmitting(true);
      const formattedStartDate = new Date(courseData.startDate).toISOString();
      const formattedEndDate = new Date(courseData.endDate).toISOString();

      // For admin users, owner is required and will be the instructor
      // For instructors, they will be both owner and instructor
      const owner =
        session?.user?.role === "ADMIN" ? courseData.ownerId : undefined;
      const instructorIds = owner ? [owner] : [];

      const result = await createCourseMutation.mutateAsync({
        courseLanguage: courseData.language,
        courseLevel: courseData.level,
        courseTimezone: courseData.timezone,
        courseStart: formattedStartDate,
        courseEnd: formattedEndDate,
        courseTotalMinutes: parseInt(courseData.courseDuration),
        thumbnailUrl: courseData.thumbnailUrl,
        overviewVideoUrl: courseData.overviewVideoUrl,
        overviewVideoId: courseData.overviewVideoId,
        isDraft: !shouldPublish,
        isShown: shouldPublish,
        categoryName: courseData.category,
        courseType: courseData.courseType,
        price: parseFloat(courseData.price),
        ownerId: owner,
        instructorIds: instructorIds,
        translations: [
          {
            language: "en",
            courseTitle: courseData.name,
            courseDescription: courseData.courseDescription,
            courseBrief: courseData.briefEn || "",
            learningPoints: courseData.learningPoints.en.filter(Boolean),
            targetAudience: courseData.targetAudience.en.filter(Boolean),
            requirements: courseData.requirements.en.filter(Boolean),
          },
          {
            language: "ar",
            courseTitle: courseData.nameAr,
            courseDescription: courseData.courseDescriptionAr,
            courseBrief: courseData.briefAr || "",
            learningPoints: courseData.learningPoints.ar.filter(Boolean),
            targetAudience: courseData.targetAudience.ar.filter(Boolean),
            requirements: courseData.requirements.ar.filter(Boolean),
          },
        ],
      });

      // Handle success here instead of in onSuccess
      setCourseData((prev) => ({ ...prev, id: result.id }));
      toast.success(
        shouldPublish
          ? t("course_published_successfully")
          : t("course_created_successfully")
      );
      if (shouldPublish) {
        // TODO: Add navigation to courses list
      } else {
        setActiveStep(2);
      }

      return result;
    } catch (error) {
      console.error("Failed to create course:", error);
      toast.error(error.message || t("error_creating_course"));

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbnailUpload = async (file) => {
    try {
      const { cdnUrl } = await uploadFile(file, "image");

      setCourseData({ ...courseData, thumbnailUrl: cdnUrl });
      toast.success(t("thumbnail_uploaded_successfully"));
    } catch (error) {
      toast.error(t("thumbnail_upload_failed"));
      console.error("Thumbnail upload failed:", error);
    }
  };

  // Add these helper functions for managing arrays of points
  const handleArrayFieldChange = (field, language, index, value) => {
    setCourseData((prev) => {
      const newArray = [...prev[field][language]];

      newArray[index] = value;

      // Add a new empty field if this is the last one and it's not empty
      if (index === newArray.length - 1 && value.trim() !== "") {
        newArray.push("");
      }
      // Remove empty fields except the last one
      const filtered = newArray.filter(
        (item, i) => item.trim() !== "" || i === newArray.length - 1
      );

      return {
        ...prev,
        [field]: {
          ...prev[field],
          [language]: filtered,
        },
      };
    });
  };

  return (
    <div className="w-full h-full">
      {isLoadingPermissions && session?.user?.role === "INSTRUCTOR" ? (
        <Card className="w-full p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </Card>
      ) : canCreateCourses ? (
        <div className="flex flex-col gap-6 w-full">
          {/* Progress Steps */}
          <Card className="my-4 p-4 flex justify-center w-full lg:w-1/2 self-center items-center">
            <CardBody>
              <div className="flex items-center justify-between px-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 ${
                      activeStep >= 1
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300"
                    } flex items-center justify-center text-sm mb-2`}
                  >
                    1
                  </div>
                  <div
                    className={`text-sm ${
                      activeStep >= 1 ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {t("course_basics")}
                  </div>
                </div>

                <div className="flex-1 border-t-2 border-dashed border-gray-300 h-0 relative top-[-15px]" />

                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 ${
                      activeStep >= 2
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300"
                    } flex items-center justify-center text-sm mb-2`}
                  >
                    2
                  </div>
                  <div
                    className={`text-sm ${
                      activeStep >= 2 ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {t("course_units")}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Course Creation Forms */}
          {activeStep === 1 ? (
            <Card className="w-full">
              <CardBody>
                <div className="space-y-6">
                  {/* Thumbnail Upload Section */}
                  <div className="bg-primary/10 rounded-lg p-4 lg:p-6 text-center">
                    <div
                      {...getThumbnailRootProps()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 lg:p-8 cursor-pointer hover:border-primary transition-colors"
                    >
                      <input {...getThumbnailInputProps()} />
                      {courseData.thumbnailUrl ? (
                        <div className="flex flex-col items-center">
                          <img
                            alt="Course thumbnail"
                            className="w-48 h-48 object-cover rounded-lg mb-2"
                            src={courseData.thumbnailUrl}
                          />
                          <p className="text-sm text-gray-600">
                            {t("click_to_change_thumbnail")}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="mb-2">
                            <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                          </div>
                          <p className="text-sm text-gray-600">
                            {t("upload_thumbnail")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("image_formats")}
                          </p>
                        </div>
                      )}
                    </div>
                    {isUploading ? (
                      <Progress
                        className="mt-2"
                        color="primary"
                        size="sm"
                        value={progress}
                      />
                    ) : null}
                  </div>

                  {/* Overview Video Upload Section */}
                  <div className="bg-primary/10 rounded-lg p-4 lg:p-6 text-center">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 lg:p-8 cursor-pointer hover:border-primary transition-colors">
                      <button
                        className="w-full"
                        disabled={isUploading}
                        onClick={async (e) => {
                          e.preventDefault();
                          const input = document.createElement("input");

                          input.type = "file";
                          input.accept = "video/*";
                          input.onchange = async (e) => {
                            const file = e.target.files[0];

                            if (file) {
                              try {
                                const { cdnUrl, videoId } = await uploadFile(
                                  file,
                                  "video"
                                );

                                setCourseData({
                                  ...courseData,
                                  overviewVideoUrl: cdnUrl,
                                  overviewVideoId: videoId,
                                });
                                toast.success(
                                  t("overview_video_uploaded_successfully")
                                );
                              } catch (error) {
                                toast.error(t("overview_video_upload_failed"));
                                console.error(
                                  "Overview video upload failed:",
                                  error
                                );
                              }
                            }
                          };
                          input.click();
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <div className="mb-2">
                            <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                          </div>
                          {courseData.overviewVideoUrl ? (
                            <>
                              <p className="text-sm text-gray-600 mb-2">
                                {t("overview_video_uploaded")}
                              </p>
                              <p className="text-xs text-primary">
                                {t("click_to_change_video")}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600">
                                {t("upload_overview_video")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("video_formats")}
                              </p>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                    {isUploading ? (
                      <Progress
                        className="mt-2"
                        color="primary"
                        size="sm"
                        value={progress}
                      />
                    ) : null}
                    {courseData.overviewVideoId ? (
                      <div className="mt-4">
                        <div className="aspect-video w-full">
                          <VideoPlayer
                            title={t("course_overview_video")}
                            videoId={courseData.overviewVideoId}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Course Details Form */}
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Right Column */}
                    <div className="flex-1 flex flex-col gap-4 w-full">
                      {session?.user?.role === "ADMIN" && (
                        <Autocomplete
                          isRequired
                          defaultSelectedKey={selectedOwner}
                          label={t("select_owner")}
                          selectedKey={selectedOwner}
                          value={
                            instructors?.find((i) => i.id === selectedOwner)
                              ?.user?.name || ""
                          }
                          onSelectionChange={(newOwnerId) => {
                            if (newOwnerId) {
                              setSelectedOwner(newOwnerId);
                              setCourseData((prev) => ({
                                ...prev,
                                ownerId: newOwnerId,
                              }));
                            }
                          }}
                        >
                          {instructors?.map((instructor) => (
                            <AutocompleteItem
                              key={instructor.id}
                              textValue={instructor?.user?.name || ""}
                            >
                              <div className="flex flex-col">
                                <span className="text-small">
                                  {instructor?.user?.name || ""}
                                </span>
                                <span className="text-tiny text-default-400">
                                  {instructor?.user?.email || ""}
                                </span>
                              </div>
                            </AutocompleteItem>
                          ))}
                        </Autocomplete>
                      )}
                      <Input
                        isRequired
                        label={t("course_name_en")}
                        placeholder={t("course_name_en")}
                        value={courseData.name}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            name: e.target.value,
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("course_name_ar")}
                        placeholder={t("course_name_ar")}
                        value={courseData.nameAr}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            nameAr: e.target.value,
                          })
                        }
                      />
                      <Textarea
                        isRequired
                        label={t("course_brief_en")}
                        placeholder={t("enter_course_brief_en")}
                        value={courseData.briefEn}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            briefEn: e.target.value,
                          })
                        }
                      />
                      <Textarea
                        isRequired
                        label={t("course_brief_ar")}
                        placeholder={t("enter_course_brief_ar")}
                        value={courseData.briefAr}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            briefAr: e.target.value,
                          })
                        }
                      />

                      <Select
                        isRequired
                        label={t("course_level")}
                        placeholder={t("course_level")}
                        selectedKeys={
                          courseData.level ? [courseData.level] : []
                        }
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            level: e.target.value,
                          })
                        }
                      >
                        <SelectItem key="BEGINNER" value="BEGINNER">
                          {t("options.levels.beginner")}
                        </SelectItem>
                        <SelectItem key="INTERMEDIATE" value="INTERMEDIATE">
                          {t("options.levels.intermediate")}
                        </SelectItem>
                        <SelectItem key="ADVANCED" value="ADVANCED">
                          {t("options.levels.advanced")}
                        </SelectItem>
                      </Select>

                      <Select
                        isRequired
                        label={t("timezone")}
                        placeholder={t("timezone")}
                        selectedKeys={
                          courseData.timezone ? [courseData.timezone] : []
                        }
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            timezone: e.target.value,
                          })
                        }
                      >
                        <SelectItem key="asia_kuwait" value="asia_kuwait">
                          {t("options.timezones.asia_kuwait")}
                        </SelectItem>
                        <SelectItem key="africa_cairo" value="africa_cairo">
                          {t("options.timezones.africa_cairo")}
                        </SelectItem>
                      </Select>

                      <Input
                        isRequired
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-small text-default-400">
                              {t("minutes")}
                            </span>
                          </div>
                        }
                        label={t("course_duration")}
                        min="1"
                        placeholder={t("enter_course_duration_minutes")}
                        type="number"
                        value={courseData.courseDuration}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            courseDuration: e.target.value,
                          })
                        }
                      />

                      <Input
                        isRequired
                        label={t("course_price")}
                        min="0"
                        placeholder={t("enter_course_price")}
                        startContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-default-400 text-small">
                              $
                            </span>
                          </div>
                        }
                        step="0.01"
                        type="number"
                        value={courseData.price}
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                    {/* Left Column */}
                    <div className="flex-1 flex flex-col gap-4 w-full">
                      <Select
                        isRequired
                        label={t("category")}
                        placeholder={t("select_category")}
                        selectedKeys={
                          courseData.category ? [courseData.category] : []
                        }
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            category: e.target.value,
                          })
                        }
                      >
                        {categories?.map((category) => {
                          const categoryTranslation =
                            category.translations?.find(
                              (t) => t.language === locale
                            ) ||
                            category.translations?.find(
                              (t) => t.language === "en"
                            );

                          if (!categoryTranslation) return null;

                          return (
                            <SelectItem
                              key={
                                category.translations.find(
                                  (t) => t.language === "en"
                                )?.categoryName
                              }
                              value={
                                category.translations.find(
                                  (t) => t.language === "en"
                                )?.categoryName
                              }
                            >
                              {categoryTranslation.categoryName}
                            </SelectItem>
                          );
                        })}
                      </Select>

                      <Select
                        isRequired
                        label={t("language")}
                        placeholder={t("language")}
                        selectedKeys={
                          courseData.language ? [courseData.language] : []
                        }
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            language: e.target.value,
                          })
                        }
                      >
                        <SelectItem key="ar" value="ar">
                          العربية
                        </SelectItem>
                        <SelectItem key="en" value="en">
                          English
                        </SelectItem>
                      </Select>

                      <Select
                        isRequired
                        label={t("course_type")}
                        placeholder={t("select_course_type")}
                        selectedKeys={
                          courseData.courseType ? [courseData.courseType] : []
                        }
                        onChange={(e) =>
                          setCourseData({
                            ...courseData,
                            courseType: e.target.value,
                          })
                        }
                      >
                        <SelectItem
                          key="UNIVERSITY_STUDENT"
                          value="UNIVERSITY_STUDENT"
                        >
                          {t("options.course_types.university_student")}
                        </SelectItem>
                        <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
                          {t("options.course_types.school_student")}
                        </SelectItem>
                      </Select>

                      <div className="flex flex-col lg:flex-row gap-2">
                        <Input
                          isRequired
                          className="flex-1 w-full"
                          classNames={{
                            label: "translate-y-[-12px]",
                            input: "pt-6",
                          }}
                          label={t("start_date")}
                          type="datetime-local"
                          value={courseData.startDate}
                          onChange={(e) =>
                            setCourseData({
                              ...courseData,
                              startDate: e.target.value,
                            })
                          }
                        />

                        <Input
                          isRequired
                          className="flex-1 w-full"
                          classNames={{
                            label: "translate-y-[-12px]",
                            input: "pt-6",
                          }}
                          label={t("end_date")}
                          min={courseData.startDate}
                          type="datetime-local"
                          value={courseData.endDate}
                          onChange={(e) =>
                            setCourseData({
                              ...courseData,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="relative">
                        <Textarea
                          isRequired
                          label={t("course_description_en")}
                          maxLength={2000}
                          maxRows={4}
                          placeholder={t("course_description_en")}
                          value={courseData.courseDescription}
                          onChange={(e) =>
                            setCourseData({
                              ...courseData,
                              courseDescription: e.target.value,
                            })
                          }
                        />
                        <div className="text-xs text-gray-400 text-right mt-1">
                          {courseData.courseDescription.length}/2000
                        </div>
                      </div>

                      <div className="relative">
                        <Textarea
                          isRequired
                          label={t("course_description_ar")}
                          maxLength={2000}
                          maxRows={4}
                          placeholder={t("course_description_ar")}
                          value={courseData.courseDescriptionAr}
                          onChange={(e) =>
                            setCourseData({
                              ...courseData,
                              courseDescriptionAr: e.target.value,
                            })
                          }
                        />
                        <div className="text-xs text-gray-400 text-right mt-1">
                          {courseData.courseDescriptionAr.length}/2000
                        </div>
                      </div>

                      {/* Learning Points Section */}
                      <div className="space-y-4 p-4 lg:p-0 bg-gray-50 lg:bg-transparent rounded-lg">
                        <div className="text-lg font-semibold">
                          {t("what_you_will_learn")}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("english")}
                            </div>
                            {courseData.learningPoints.en.map(
                              (point, index) => (
                                <Input
                                  key={index}
                                  className="w-full"
                                  placeholder={t("enter_learning_point")}
                                  startContent="•"
                                  value={point}
                                  onChange={(e) =>
                                    handleArrayFieldChange(
                                      "learningPoints",
                                      "en",
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("arabic")}
                            </div>
                            {courseData.learningPoints.ar.map(
                              (point, index) => (
                                <Input
                                  key={index}
                                  className="w-full"
                                  placeholder={t("enter_learning_point_ar")}
                                  startContent="•"
                                  value={point}
                                  onChange={(e) =>
                                    handleArrayFieldChange(
                                      "learningPoints",
                                      "ar",
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Target Audience Section */}
                      <div className="space-y-4 p-4 lg:p-0 bg-gray-50 lg:bg-transparent rounded-lg">
                        <div className="text-lg font-semibold">
                          {t("target_audience")}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("english")}
                            </div>
                            {courseData.targetAudience.en.map(
                              (point, index) => (
                                <Input
                                  key={index}
                                  className="w-full"
                                  placeholder={t("enter_target_audience")}
                                  startContent="•"
                                  value={point}
                                  onChange={(e) =>
                                    handleArrayFieldChange(
                                      "targetAudience",
                                      "en",
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("arabic")}
                            </div>
                            {courseData.targetAudience.ar.map(
                              (point, index) => (
                                <Input
                                  key={index}
                                  className="w-full"
                                  placeholder={t("enter_target_audience_ar")}
                                  startContent="•"
                                  value={point}
                                  onChange={(e) =>
                                    handleArrayFieldChange(
                                      "targetAudience",
                                      "ar",
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Requirements Section */}
                      <div className="space-y-4 p-4 lg:p-0 bg-gray-50 lg:bg-transparent rounded-lg">
                        <div className="text-lg font-semibold">
                          {t("requirements")}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("english")}
                            </div>
                            {courseData.requirements.en.map((point, index) => (
                              <Input
                                key={index}
                                className="w-full"
                                placeholder={t("enter_requirement")}
                                startContent="•"
                                value={point}
                                onChange={(e) =>
                                  handleArrayFieldChange(
                                    "requirements",
                                    "en",
                                    index,
                                    e.target.value
                                  )
                                }
                              />
                            ))}
                          </div>
                          <div className="space-y-2 bg-white lg:bg-transparent p-3 lg:p-0 rounded-lg">
                            <div className="text-sm font-medium">
                              {t("arabic")}
                            </div>
                            {courseData.requirements.ar.map((point, index) => (
                              <Input
                                key={index}
                                className="w-full"
                                placeholder={t("enter_requirement_ar")}
                                startContent="•"
                                value={point}
                                onChange={(e) =>
                                  handleArrayFieldChange(
                                    "requirements",
                                    "ar",
                                    index,
                                    e.target.value
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Step 1 */}
                  <div className="flex flex-col lg:flex-row justify-between mt-6 gap-4">
                    <Button
                      className="text-primary w-full lg:w-auto"
                      isDisabled={isSubmitting}
                      variant="light"
                    >
                      {t("return_to_courses")}
                    </Button>
                    <div className="flex flex-col lg:flex-row gap-2">
                      <Button
                        className="text-primary border-primary w-full lg:w-auto"
                        isDisabled={isSubmitting}
                        variant="bordered"
                        onPress={() => setActiveStep(2)}
                      >
                        {t("save_and_continue")}
                      </Button>
                      <Button
                        className="bg-primary text-white w-full lg:w-auto"
                        isDisabled={isSubmitting}
                        isLoading={isSubmitting}
                        onPress={() => handleCreateCourse(true)}
                      >
                        {t("publish_course")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <UnitCreation
              courseId={courseData.id}
              handleCreateCourse={handleCreateCourse}
              setActiveStep={setActiveStep}
              t={t}
            />
          )}
        </div>
      ) : (
        <Card className="w-full p-6">
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-700 mb-2">
              {t("no_create_permission")}
            </div>
            <p className="text-gray-500">{t("contact_admin_for_permission")}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CourseCreation;
