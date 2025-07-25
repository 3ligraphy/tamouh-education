"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Pagination,
  Tabs,
  Tab,
  Button,
  Input,
  Textarea,
  Switch,
  useDisclosure,
  Chip,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Divider,
  Progress,
  Select,
  SelectItem,
} from "@heroui/react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { IoCloudUploadOutline } from "react-icons/io5";

import { CourseCard } from "./course-card";
import CourseUnitsManagement from "./course-units-management";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

// Add VideoPlayer component
const VideoPlayer = ({ videoId, title }) => {
  const t = useTranslations("instructor_dashboard");
  const { getVideoUrl } = useFileUpload();
  const { data, isLoading, isError } = getVideoUrl(videoId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-gray-500">
            {t("messages.video_processing")}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data?.url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <p className="text-sm text-red-500">{t("messages.video_error")}</p>
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

// Add timezone helper functions
const normalizeTimezone = (timezone) => {
  if (!timezone) return "";

  return timezone.toLowerCase().replace("/", "_");
};

const denormalizeTimezone = (timezone) => {
  if (!timezone) return "";
  const [region, city] = timezone.split("_");

  if (!city) return timezone;

  return `${region.charAt(0).toUpperCase()}${region.slice(1)}/${city.charAt(0).toUpperCase()}${city.slice(1)}`;
};

export function InstructorCourses() {
  const t = useTranslations("instructor_dashboard");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState("my_courses");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [formData, setFormData] = useState({
    title_en: "",
    title_ar: "",
    description_en: "",
    description_ar: "",
    courseBrief_en: "",
    courseBrief_ar: "",
    courseLevel: "",
    courseType: "",
    courseTimezone: "",
    courseStart: "",
    courseEnd: "",
    isPublished: true,
    isVisible: true,
    thumbnailUrl: "",
    overviewVideoId: "",
    price: 0,
    courseTotalMinutes: 0,
    learningPoints_en: [],
    learningPoints_ar: [],
    targetAudience_en: [],
    targetAudience_ar: [],
    requirements_en: [],
    requirements_ar: [],
  });
  const coursesPerPage = 8;

  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const {
    data: courses,
    isLoading,
    refetch,
  } = api.instructor.getMyCourses.useQuery();
  const { mutate: updateCourse } = api.course.updateCourse.useMutation({
    onSuccess: () => {
      toast.success(t("messages.course_updated"));
      refetch();
      onEditClose();
    },
    onError: (error) => {
      toast.error(error.message || t("messages.error_updating"));
    },
  });

  const { uploadFile, isUploading, progress } = useFileUpload();

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

  const handleThumbnailUpload = async (file) => {
    try {
      const { cdnUrl } = await uploadFile(file, "image");

      setFormData({ ...formData, thumbnailUrl: cdnUrl });
      toast.success(t("messages.thumbnail_uploaded"));
    } catch (error) {
      toast.error(t("messages.thumbnail_upload_failed"));
      console.error("Thumbnail upload failed:", error);
    }
  };

  const handleEditCourse = (course) => {
    try {
      setSelectedCourse(course);

      setFormData({
        title_en: course.title?.en || "",
        title_ar: course.title?.ar || "",
        description_en: course.description?.en || "",
        description_ar: course.description?.ar || "",
        courseBrief_en: course.courseBrief?.en || "",
        courseBrief_ar: course.courseBrief?.ar || "",
        courseLevel: course.courseLevel || "",
        courseType: course.courseType || "",
        courseTimezone: normalizeTimezone(course.courseTimezone) || "",
        courseStart: course.courseStart
          ? new Date(course.courseStart).toISOString().split(".")[0]
          : "",
        courseEnd: course.courseEnd
          ? new Date(course.courseEnd).toISOString().split(".")[0]
          : "",
        isPublished: !course.isDraft,
        isVisible: course.isShown,
        thumbnailUrl: course.thumbnailUrl || "",
        overviewVideoId: course.overviewVideoId || "",
        price: parseFloat(course.price) || 0,
        courseTotalMinutes: course.courseTotalMinutes || 0,
        learningPoints_en: course.learningPoints?.en || [],
        learningPoints_ar: course.learningPoints?.ar || [],
        targetAudience_en: course.targetAudience?.en || [],
        targetAudience_ar: course.targetAudience?.ar || [],
        requirements_en: course.requirements?.en || [],
        requirements_ar: course.requirements?.ar || [],
      });
      onEditOpen();
    } catch (error) {
      console.error("Error opening edit modal:", error);
      toast.error(t("messages.error_updating"));
    }
  };

  const handleUpdateCourse = () => {
    if (selectedCourse) {
      const updateData = {
        courseLanguage: selectedCourse.courseLanguage,
        categoryName: selectedCourse.category?.translations.find(
          (t) => t.language === "en"
        )?.categoryName,
        translations: [
          {
            language: "en",
            courseTitle: formData.title_en,
            courseDescription: formData.description_en,
            courseBrief: formData.courseBrief_en,
            learningPoints: formData.learningPoints_en,
            targetAudience: formData.targetAudience_en,
            requirements: formData.requirements_en,
          },
          {
            language: "ar",
            courseTitle: formData.title_ar,
            courseDescription: formData.description_ar,
            courseBrief: formData.courseBrief_ar,
            learningPoints: formData.learningPoints_ar,
            targetAudience: formData.targetAudience_ar,
            requirements: formData.requirements_ar,
          },
        ],
        courseLevel: formData.courseLevel,
        courseType: formData.courseType,
        courseTimezone: formData.courseTimezone,
        courseStart: formData.courseStart
          ? new Date(formData.courseStart).toISOString()
          : null,
        courseEnd: formData.courseEnd
          ? new Date(formData.courseEnd).toISOString()
          : null,
        isDraft: !formData.isPublished,
        isShown: formData.isVisible,
        thumbnailUrl: formData.thumbnailUrl,
        overviewVideoId: formData.overviewVideoId,
        price: parseFloat(formData.price) || 0,
        courseTotalMinutes: parseInt(formData.courseTotalMinutes) || 0,
      };

      updateCourse({
        courseId: selectedCourse.id,
        data: updateData,
      });
    }
  };

  // Add video upload handlers
  const handleVideoUpload = async (file) => {
    try {
      const { videoId } = await uploadFile(file, "video");

      setFormData({ ...formData, overviewVideoId: videoId });
      toast.success(t("messages.video_uploaded"));
    } catch (error) {
      toast.error(t("messages.video_upload_failed"));
      console.error("Video upload failed:", error);
    }
  };

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } =
    useDropzone({
      accept: { "video/*": [".mp4", ".mov", ".avi", ".wmv"] },
      maxFiles: 1,
      onDrop: async (acceptedFiles) => {
        if (acceptedFiles[0]) {
          await handleVideoUpload(acceptedFiles[0]);
        }
      },
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!courses?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          {t("no_courses")}
        </h3>
        <p className="text-gray-500">{t("create_course_message")}</p>
      </div>
    );
  }

  // Filter courses based on selected tab
  const filteredCourses = courses.filter((course) => {
    switch (selectedTab) {
      case "my_courses":
        return course.isOwner && !course.isDraft;
      case "assigned_courses":
        return !course.isOwner && !course.isDraft;
      case "draft_courses":
        return course.isDraft;
      default:
        return false;
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const currentCourses = filteredCourses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage
  );

  // Reset to first page when changing tabs
  const handleTabChange = (key) => {
    setSelectedTab(key);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      <Tabs
        aria-label="Course categories"
        selectedKey={selectedTab}
        onSelectionChange={handleTabChange}
      >
        <Tab key="my_courses" title={t("course_tabs.my_courses")} />
        <Tab key="assigned_courses" title={t("course_tabs.assigned_courses")} />
        <Tab key="draft_courses" title={t("course_tabs.draft_courses")} />
      </Tabs>

      {currentCourses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => handleEditCourse(course)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                showControls
                classNames={{
                  next: "bg-transparent",
                  prev: "bg-transparent",
                }}
                initialPage={1}
                page={currentPage}
                total={totalPages}
                onChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500">{t("no_courses")}</p>
        </div>
      )}

      {/* Edit Drawer */}
      <Drawer
        isDismissable={false}
        isOpen={isEditOpen}
        placement="right"
        size="2xl"
        onClose={() => {
          try {
            onEditClose();
            setSelectedCourse(null);
          } catch (error) {
            console.error("Error closing edit drawer:", error);
          }
        }}
      >
        <DrawerContent>
          {selectedCourse ? (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">{t("edit_drawer.title")}</h2>
              </DrawerHeader>
              <DrawerBody>
                <Tabs aria-label="Course edit tabs">
                  <Tab key="details" title={t("edit_drawer.tabs.details")}>
                    <div className="flex flex-col gap-6">
                      {/* Thumbnail Upload Section */}
                      <div className="bg-primary/10 rounded-lg p-6 text-center">
                        <div
                          {...getThumbnailRootProps()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-primary transition-colors"
                        >
                          <input {...getThumbnailInputProps()} />
                          {formData.thumbnailUrl ? (
                            <div className="flex flex-col items-center">
                              <img
                                alt={t("edit_drawer.thumbnail.preview")}
                                className="w-48 h-48 object-cover rounded-lg mb-2"
                                src={formData.thumbnailUrl}
                              />
                              <p className="text-sm text-gray-600">
                                {t("edit_drawer.thumbnail.change")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="mb-2">
                                <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("edit_drawer.thumbnail.upload")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("edit_drawer.thumbnail.formats")}
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

                      {/* Video Upload Section */}
                      <div className="bg-primary/10 rounded-lg p-6 text-center">
                        <div
                          {...getVideoRootProps()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-primary transition-colors"
                        >
                          <input {...getVideoInputProps()} />
                          {formData.overviewVideoId ? (
                            <div className="flex flex-col items-center">
                              <div className="w-full max-w-2xl mx-auto mb-4">
                                <VideoPlayer
                                  title={
                                    formData.title_en ||
                                    t("messages.video_preview")
                                  }
                                  videoId={formData.overviewVideoId}
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("messages.change_video")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="mb-2">
                                <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("messages.upload_video")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("messages.video_formats")}
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

                      {/* Course Type and Level */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label={t("edit_drawer.fields.course_type")}
                          selectedKeys={[formData.courseType]}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
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
                          <SelectItem
                            key="SCHOOL_STUDENT"
                            value="SCHOOL_STUDENT"
                          >
                            {t("options.course_types.school_student")}
                          </SelectItem>
                        </Select>
                        <Select
                          label={t("edit_drawer.fields.course_level")}
                          selectedKeys={[formData.courseLevel]}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              courseLevel: e.target.value,
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
                      </div>

                      {/* Course Timezone and Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                          label={t("edit_drawer.fields.course_timezone")}
                          selectedKeys={
                            formData.courseTimezone
                              ? [formData.courseTimezone]
                              : []
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              courseTimezone: normalizeTimezone(e.target.value),
                            })
                          }
                        >
                          <SelectItem key="africa_cairo" value="africa_cairo">
                            {t("options.timezones.africa_cairo")}
                          </SelectItem>
                          <SelectItem key="asia_kuwait" value="asia_kuwait">
                            {t("options.timezones.asia_kuwait")}
                          </SelectItem>
                        </Select>
                        <Input
                          label={t("edit_drawer.fields.start_date")}
                          type="datetime-local"
                          value={formData.courseStart}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              courseStart: e.target.value,
                            })
                          }
                        />
                        <Input
                          label={t("edit_drawer.fields.end_date")}
                          type="datetime-local"
                          value={formData.courseEnd}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              courseEnd: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Basic Information */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.basic_info")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <Input
                            label={t("edit_drawer.fields.title_en")}
                            value={formData.title_en}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                title_en: e.target.value,
                              })
                            }
                          />
                          <Input
                            label={t("edit_drawer.fields.title_ar")}
                            value={formData.title_ar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                title_ar: e.target.value,
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              label={t("edit_drawer.fields.price")}
                              min={0}
                              type="number"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <Input
                              label={t("edit_drawer.fields.total_minutes")}
                              min={0}
                              type="number"
                              value={formData.courseTotalMinutes}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  courseTotalMinutes:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Divider />

                      {/* Course Status */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.status")}
                        </h3>
                        <div className="flex gap-4">
                          <Switch
                            isSelected={formData.isPublished}
                            size="lg"
                            onValueChange={(value) =>
                              setFormData({ ...formData, isPublished: value })
                            }
                          >
                            {t("edit_drawer.fields.published")}
                          </Switch>
                          <Switch
                            isSelected={formData.isVisible}
                            size="lg"
                            onValueChange={(value) =>
                              setFormData({ ...formData, isVisible: value })
                            }
                          >
                            {t("edit_drawer.fields.visible")}
                          </Switch>
                        </div>
                      </div>

                      <Divider />

                      {/* Descriptions */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.descriptions")}
                        </h3>
                        <div className="flex flex-col gap-4">
                          <Textarea
                            label={t("edit_drawer.fields.description_en")}
                            minRows={3}
                            value={formData.description_en}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description_en: e.target.value,
                              })
                            }
                          />
                          <Textarea
                            label={t("edit_drawer.fields.description_ar")}
                            minRows={3}
                            value={formData.description_ar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description_ar: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <Divider />

                      {/* Course Brief */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.course_brief")}
                        </h3>
                        <div className="flex flex-col gap-4">
                          <Textarea
                            label={t("edit_drawer.fields.course_brief_en")}
                            minRows={2}
                            value={formData.courseBrief_en}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                courseBrief_en: e.target.value,
                              })
                            }
                          />
                          <Textarea
                            label={t("edit_drawer.fields.course_brief_ar")}
                            minRows={2}
                            value={formData.courseBrief_ar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                courseBrief_ar: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <Divider />

                      {/* Learning Points */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.learning_points")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label={t("edit_drawer.fields.learning_points_en")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_learning_point_en"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    learningPoints_en: [
                                      ...formData.learningPoints_en,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.learningPoints_en.map(
                                (point, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        learningPoints_en:
                                          formData.learningPoints_en.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {point}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <Input
                              label={t("edit_drawer.fields.learning_points_ar")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_learning_point_ar"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    learningPoints_ar: [
                                      ...formData.learningPoints_ar,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.learningPoints_ar.map(
                                (point, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        learningPoints_ar:
                                          formData.learningPoints_ar.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {point}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Divider />

                      {/* Target Audience */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.target_audience")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label={t("edit_drawer.fields.target_audience_en")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_target_audience_en"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    targetAudience_en: [
                                      ...formData.targetAudience_en,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.targetAudience_en.map(
                                (audience, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        targetAudience_en:
                                          formData.targetAudience_en.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {audience}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <Input
                              label={t("edit_drawer.fields.target_audience_ar")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_target_audience_ar"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    targetAudience_ar: [
                                      ...formData.targetAudience_ar,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.targetAudience_ar.map(
                                (audience, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        targetAudience_ar:
                                          formData.targetAudience_ar.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {audience}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Divider />
                      {/* Requirements */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_drawer.requirements")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label={t("edit_drawer.fields.requirements_en")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_requirement_en"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    requirements_en: [
                                      ...formData.requirements_en,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.requirements_en.map(
                                (requirement, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        requirements_en:
                                          formData.requirements_en.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {requirement}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <Input
                              label={t("edit_drawer.fields.requirements_ar")}
                              placeholder={t(
                                "edit_drawer.placeholders.add_requirement_ar"
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    requirements_ar: [
                                      ...formData.requirements_ar,
                                      e.target.value,
                                    ],
                                  });
                                  e.target.value = "";
                                }
                              }}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {formData.requirements_ar.map(
                                (requirement, index) => (
                                  <Chip
                                    key={index}
                                    onClose={() => {
                                      setFormData({
                                        ...formData,
                                        requirements_ar:
                                          formData.requirements_ar.filter(
                                            (_, i) => i !== index
                                          ),
                                      });
                                    }}
                                  >
                                    {requirement}
                                  </Chip>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tab>
                  <Tab key="units" title={t("edit_drawer.tabs.units")}>
                    <CourseUnitsManagement courseId={selectedCourse.id} />
                  </Tab>
                </Tabs>
              </DrawerBody>
              <DrawerFooter>
                <div className="flex justify-end gap-2">
                  <Button color="danger" variant="light" onPress={onEditClose}>
                    {t("edit_drawer.buttons.cancel")}
                  </Button>
                  <Button color="primary" onPress={handleUpdateCourse}>
                    {t("edit_drawer.buttons.save")}
                  </Button>
                </div>
              </DrawerFooter>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
