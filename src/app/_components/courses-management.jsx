"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Textarea,
  Switch,
  Pagination,
  Tooltip,
  Spinner,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Divider,
  Autocomplete,
  AutocompleteItem,
  Tabs,
  Tab,
  Progress,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { IoCloudUploadOutline } from "react-icons/io5";
import clsx from "clsx";
import { FilterIcon } from "lucide-react";

import { EyeIcon } from "./EyeIcon";
import { EditIcon } from "./EditIcon";
import { DeleteIcon } from "./DeleteIcon";
import CourseUnitsManagement from "./course-units-management";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

const ROWS_PER_PAGE = 10;

// Add VideoPlayer component
const VideoPlayer = ({ videoId, title }) => {
  const t = useTranslations("courses-management");
  const { getVideoUrl } = useFileUpload();
  const { data, isLoading, isError } = getVideoUrl(videoId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-gray-500">
            {t("edit_modal.video.processing")}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data?.url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <p className="text-sm text-red-500">{t("edit_modal.video.error")}</p>
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

const normalizeTimezone = (timezone) => {
  if (!timezone) return "";

  // Convert old format (with slash) to new format (with underscore)
  return timezone.toLowerCase().replace("/", "_");
};

export default function CoursesManagement() {
  const t = useTranslations("courses-management");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [coursePermissions, setCoursePermissions] = useState({});
  const [instructorSearchQuery, setInstructorSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const { uploadFile, isUploading, progress } = useFileUpload();
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
    isPublished: false,
    isVisible: false,
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

  // Modals state
  const {
    isOpen: isViewOpen,
    onOpen: onViewOpen,
    onClose: onViewClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Fetch courses with pagination and filters
  const {
    data: coursesData,
    refetch,
    isLoading,
  } = api.course.getAllCoursesAdmin.useQuery(
    {
      page,
      pageSize: ROWS_PER_PAGE,
      searchQuery,
      statusFilter,
      typeFilter,
      languageFilter,
    },
    {
      keepPreviousData: true,
    }
  );

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } =
    api.category.getAll.useQuery(undefined, {
      onError: (error) => {
        console.error("Error loading categories:", error);
        toast.error(t("messages.error_loading_categories"));
      },
    });

  // Fetch instructors
  const { data: instructors } = api.instructor.getAllInstructors.useQuery();

  // Update pagination logic to use backend data
  const pages = coursesData?.pagination.totalPages || 1;

  // Remove the filtering logic since it's now handled by the backend
  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (type, value) => {
    setPage(1); // Reset to first page when changing filters
    switch (type) {
      case "status":
        setStatusFilter(value);
        break;
      case "type":
        setTypeFilter(value);
        break;
      case "language":
        setLanguageFilter(value);
        break;
      default:
        break;
    }
  };

  const { mutate: updateCourse } = api.course.updateCourseAdmin.useMutation({
    onSuccess: () => {
      toast.success(t("messages.course_updated"));
      refetch();
      onEditClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const { mutate: deleteCourse, isLoading: isDeleting } =
    api.course.deleteCourseAdmin.useMutation({
      onSuccess: () => {
        toast.success(t("delete_modal.success"));
        refetch();
        onDeleteClose();
      },
      onError: (error) => {
        toast.error(error.message || t("delete_modal.error"));
      },
    });

  const handleViewCourse = (course) => {
    setSelectedCourse(course);
    onViewOpen();
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);

    return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
  };

  const handleThumbnailUpload = async (file) => {
    try {
      const { cdnUrl } = await uploadFile(file, "image");

      setFormData({ ...formData, thumbnailUrl: cdnUrl });
      toast.success(t("edit_modal.thumbnail.success"));
    } catch (error) {
      toast.error(t("edit_modal.thumbnail.error"));
      console.error("Thumbnail upload failed:", error);
    }
  };

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

  const handleVideoUpload = async (file) => {
    try {
      const { videoId } = await uploadFile(file, "video");

      setFormData({ ...formData, overviewVideoId: videoId });
      toast.success(t("edit_modal.video.success"));
    } catch (error) {
      toast.error(t("edit_modal.video.error"));
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

  const handleEditCourse = (course) => {
    try {
      if (!course?.translations) {
        throw new Error("Course translations not found");
      }

      setSelectedCourse(course);
      setSelectedCategory(course.categoryId);
      setSelectedOwner(course.ownerId);

      // Get the non-owner instructors
      const nonOwnerInstructors =
        course.instructors?.filter((i) => i.id !== course.ownerId) || [];

      // Set selected instructors
      setSelectedInstructors(nonOwnerInstructors.map((i) => i.id));

      // Set up initial permissions from existing course permissions
      const initialPermissions = {};

      nonOwnerInstructors.forEach((instructor) => {
        // Get the permissions for this instructor from the course permissions
        const permission = instructor.coursePermissions?.[0];

        // Set the permissions, using the actual values from the database
        initialPermissions[instructor.id] = {
          canUpdate: permission?.canUpdate ?? false,
          canDelete: permission?.canDelete ?? false,
        };
      });

      // Set the course permissions state
      setCoursePermissions(initialPermissions);

      setFormData({
        title_en:
          course.translations?.find((t) => t.language === "en")?.courseTitle ||
          "",
        title_ar:
          course.translations?.find((t) => t.language === "ar")?.courseTitle ||
          "",
        description_en:
          course.translations?.find((t) => t.language === "en")
            ?.courseDescription || "",
        description_ar:
          course.translations?.find((t) => t.language === "ar")
            ?.courseDescription || "",
        courseBrief_en:
          course.translations?.find((t) => t.language === "en")?.courseBrief ||
          "",
        courseBrief_ar:
          course.translations?.find((t) => t.language === "ar")?.courseBrief ||
          "",
        courseLevel: course.courseLevel || "",
        courseType: course.courseType || "",
        courseTimezone: normalizeTimezone(course.courseTimezone) || "",
        courseStart: formatDateForInput(course.courseStart),
        courseEnd: formatDateForInput(course.courseEnd),
        isPublished: !course.isDraft,
        isVisible: course.isShown,
        thumbnailUrl: course.thumbnailUrl || "",
        overviewVideoId: course.overviewVideoId || "",
        price: parseFloat(course.price) || 0,
        courseTotalMinutes: course.courseTotalMinutes || 0,
        learningPoints_en:
          course.translations?.find((t) => t.language === "en")
            ?.learningPoints || [],
        learningPoints_ar:
          course.translations?.find((t) => t.language === "ar")
            ?.learningPoints || [],
        targetAudience_en:
          course.translations?.find((t) => t.language === "en")
            ?.targetAudience || [],
        targetAudience_ar:
          course.translations?.find((t) => t.language === "ar")
            ?.targetAudience || [],
        requirements_en:
          course.translations?.find((t) => t.language === "en")?.requirements ||
          [],
        requirements_ar:
          course.translations?.find((t) => t.language === "ar")?.requirements ||
          [],
      });
      onEditOpen();
    } catch (error) {
      console.error("Error opening edit drawer:", error);
      toast.error(t("messages.error_updating"));
    }
  };

  const handleDeleteCourse = (course) => {
    setSelectedCourse(course);
    onDeleteOpen();
  };

  const handleUpdateCourse = () => {
    if (selectedCourse) {
      // Find the selected owner's instructor bio
      const selectedOwnerInstructor = instructors?.find(
        (i) => i.id === selectedOwner
      );
      const ownerBioEn =
        selectedOwnerInstructor?.translations?.find((t) => t.language === "en")
          ?.instructorBio || "";
      const ownerBioAr =
        selectedOwnerInstructor?.translations?.find((t) => t.language === "ar")
          ?.instructorBio || "";

      // Prepare instructor permissions only if there are additional instructors
      const instructorPermissions =
        selectedInstructors.length > 0
          ? selectedInstructors
              .filter((instructorId) => coursePermissions[instructorId]) // Only include instructors that have permissions set
              .map((instructorId) => ({
                instructorId,
                courseId: selectedCourse.id,
                canUpdate: coursePermissions[instructorId]?.canUpdate ?? false,
                canDelete: coursePermissions[instructorId]?.canDelete ?? false,
              }))
          : [];

      const updateData = {
        courseLanguage: selectedCourse.courseLanguage,
        categoryName: selectedCourse.category?.translations.find(
          (t) => t.language === "en"
        )?.categoryName,
        instructorBio: {
          en: ownerBioEn,
          ar: ownerBioAr,
        },
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
        ownerId: selectedOwner,
        instructorIds: selectedInstructors,
        instructorPermissions: instructorPermissions,
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

  const handleConfirmDelete = () => {
    if (selectedCourse) {
      deleteCourse({ courseId: selectedCourse.id });
    }
  };

  const getCategoryLabel = (categoryId, categories) => {
    if (!categories?.length || !categoryId) return "";
    const category = categories.find((c) => c.id === categoryId);
    const enTranslation = category?.translations?.find(
      (t) => t.language === "en"
    );
    const arTranslation = category?.translations?.find(
      (t) => t.language === "ar"
    );

    return enTranslation?.categoryName || arTranslation?.categoryName || "";
  };

  const getInstructorLabel = (instructorId, instructors) => {
    if (!instructors || !instructorId) return "";
    const instructor = instructors.find((i) => i.id === instructorId);

    return instructor?.user?.name || "";
  };

  // Add this new memoized value for available instructors
  const availableInstructors = useMemo(() => {
    if (!instructors) return [];

    return instructors.filter(
      (instructor) =>
        !selectedInstructors.includes(instructor.id) &&
        instructor.id !== selectedOwner
    );
  }, [instructors, selectedInstructors, selectedOwner]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder={t("search")}
            startContent={
              <MagnifyingGlassIcon className="h-6 w-6 text-default-300" />
            }
            value={searchQuery}
            onClear={() => handleSearch("")}
            onValueChange={handleSearch}
          />
          <Button
            className="sm:max-w-[100px]"
            color={showFilters ? "primary" : "default"}
            endContent={<FilterIcon className="h-6 w-6" />}
            variant={showFilters ? "flat" : "bordered"}
            onPress={() => setShowFilters(!showFilters)}
          >
            {t("filters.title")}
          </Button>
        </div>

        {/* Filters Section */}
        <div
          className={clsx(
            "grid gap-4 transition-all duration-200",
            showFilters
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 opacity-100"
              : "h-0 overflow-hidden opacity-0"
          )}
        >
          <Select
            className="w-full"
            label={t("filters.status.label")}
            selectedKeys={[statusFilter]}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.status.all")}
            </SelectItem>
            <SelectItem key="DRAFT" value="DRAFT">
              {t("filters.status.draft")}
            </SelectItem>
            <SelectItem key="PUBLISHED" value="PUBLISHED">
              {t("filters.status.published")}
            </SelectItem>
            <SelectItem key="HIDDEN" value="HIDDEN">
              {t("filters.status.hidden")}
            </SelectItem>
          </Select>

          <Select
            className="w-full"
            label={t("filters.type.label")}
            selectedKeys={[typeFilter]}
            onChange={(e) => handleFilterChange("type", e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.type.all")}
            </SelectItem>
            <SelectItem key="UNIVERSITY_STUDENT" value="UNIVERSITY_STUDENT">
              {t("edit_modal.options.course_types.university_student")}
            </SelectItem>
            <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
              {t("edit_modal.options.course_types.school_student")}
            </SelectItem>
          </Select>

          <Select
            className="w-full"
            label={t("filters.language.label")}
            selectedKeys={[languageFilter]}
            onChange={(e) => handleFilterChange("language", e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.language.all")}
            </SelectItem>
            <SelectItem key="Arabic" value="Arabic">
              {t("edit_modal.options.languages.arabic")}
            </SelectItem>
            <SelectItem key="English" value="English">
              {t("edit_modal.options.languages.english")}
            </SelectItem>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Spinner color="primary" label={t("loading")} size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            aria-label="Courses table"
            bottomContent={
              pages > 1 ? (
                <div className="flex w-full justify-center">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                  />
                </div>
              ) : null
            }
          >
            <TableHeader>
              <TableColumn>{t("table.title")}</TableColumn>
              <TableColumn>{t("table.owner")}</TableColumn>
              <TableColumn>{t("table.category")}</TableColumn>
              <TableColumn>{t("table.status")}</TableColumn>
              <TableColumn>{t("table.students")}</TableColumn>
              <TableColumn className="w-[100px] text-center">
                {t("table.actions")}
              </TableColumn>
            </TableHeader>
            <TableBody>
              {coursesData?.courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    {
                      course.translations.find((t) => t.language === "en")
                        ?.courseTitle
                    }
                  </TableCell>
                  <TableCell>{course.owner?.user?.name}</TableCell>
                  <TableCell>
                    {course.category?.translations.find(
                      (t) => t.language === "en"
                    )?.categoryName || "Uncategorized"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={
                        course.isDraft
                          ? "warning"
                          : course.isShown
                            ? "success"
                            : "danger"
                      }
                      variant="flat"
                    >
                      {course.isDraft
                        ? t("filters.status.draft")
                        : course.isShown
                          ? t("filters.status.published")
                          : t("filters.status.hidden")}
                    </Chip>
                  </TableCell>
                  <TableCell>{course.enrolledStudents.length}</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Tooltip content={t("actions.view")}>
                        <button
                          aria-label={t("actions.view")}
                          className="cursor-pointer text-lg text-default-400 hover:text-default-500"
                          onClick={() => handleViewCourse(course)}
                        >
                          <EyeIcon />
                        </button>
                      </Tooltip>
                      <Tooltip content={t("actions.edit")}>
                        <button
                          aria-label={t("actions.edit")}
                          className="cursor-pointer text-lg text-default-400 hover:text-default-500"
                          type="button"
                          onClick={() => handleEditCourse(course)}
                        >
                          <EditIcon />
                        </button>
                      </Tooltip>
                      <Tooltip color="danger" content={t("actions.delete")}>
                        <button
                          aria-label={t("actions.delete")}
                          className="cursor-pointer text-lg text-danger-400 hover:text-danger-500"
                          onClick={() => handleDeleteCourse(course)}
                        >
                          <DeleteIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Modal */}
      <Modal isOpen={isViewOpen} size="2xl" onClose={onViewClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("view_modal.title")}</ModalHeader>
              <ModalBody>
                {selectedCourse ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {t("view_modal.basic_info")}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">
                            {t("edit_modal.fields.title_en")}
                          </p>
                          <p>
                            {
                              selectedCourse.translations.find(
                                (t) => t.language === "en"
                              )?.courseTitle
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {t("edit_modal.fields.title_ar")}
                          </p>
                          <p>
                            {
                              selectedCourse.translations.find(
                                (t) => t.language === "ar"
                              )?.courseTitle
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{t("table.category")}</p>
                          <p>
                            {
                              selectedCourse.category?.translations.find(
                                (t) => t.language === "en"
                              )?.categoryName
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {t("view_modal.course_level")}
                          </p>
                          <p>
                            {t(
                              `edit_modal.options.levels.${selectedCourse.courseLevel}`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">
                        {t("view_modal.instructors")}
                      </h3>
                      {/* Display Owner First */}
                      {selectedCourse.owner ? (
                        <div className="mb-4 rounded-lg border p-3 bg-primary-50">
                          <div className="mb-2 flex items-center gap-2">
                            <p className="font-medium">
                              {selectedCourse.owner.user?.name}
                            </p>
                            <Chip color="primary" size="sm">
                              {t("table.owner")}
                            </Chip>
                          </div>
                          <p className="text-sm text-default-600">
                            {selectedCourse.owner.user?.email}
                          </p>
                        </div>
                      ) : null}
                      {/* Display Other Instructors */}
                      <div className="mt-2">
                        {selectedCourse.instructors
                          .filter(
                            (instructor) =>
                              instructor.id !== selectedCourse.ownerId
                          )
                          .map((instructor) => (
                            <div
                              key={instructor.id}
                              className="mb-4 rounded-lg border p-3"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <p className="font-medium">
                                  {instructor.user?.name}
                                </p>
                              </div>
                              <p className="text-sm text-default-600">
                                {instructor.user?.email}
                              </p>
                              <div className="mt-2 flex gap-4">
                                <div>
                                  <p className="text-sm text-default-500">
                                    {t("edit_modal.can_update")}
                                  </p>
                                  <p>
                                    {instructor.coursePermissions?.[0]
                                      ?.canUpdate
                                      ? "✓"
                                      : "✗"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-default-500">
                                    {t("edit_modal.can_delete")}
                                  </p>
                                  <p>
                                    {instructor.coursePermissions?.[0]
                                      ?.canDelete
                                      ? "✓"
                                      : "✗"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">
                        {t("view_modal.stats")}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">
                            {t("view_modal.enrolled_students")}
                          </p>
                          <p>{selectedCourse.enrolledStudents.length}</p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {t("view_modal.units_count")}
                          </p>
                          <p>{selectedCourse.units.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("view_modal.buttons.close")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

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
            setSelectedInstructors([]);
            setCoursePermissions({});
          } catch (error) {
            console.error("Error closing edit drawer:", error);
          }
        }}
      >
        <DrawerContent>
          {selectedCourse ? (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">{t("edit_modal.title")}</h2>
              </DrawerHeader>
              <DrawerBody>
                <Tabs aria-label="Course edit tabs">
                  <Tab key="details" title={t("edit_modal.tabs.details")}>
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
                                alt={t("edit_modal.thumbnail.preview")}
                                className="w-48 h-48 object-cover rounded-lg mb-2"
                                src={formData.thumbnailUrl}
                              />
                              <p className="text-sm text-gray-600">
                                {t("edit_modal.thumbnail.change")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="mb-2">
                                <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("edit_modal.thumbnail.upload")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("edit_modal.thumbnail.formats")}
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
                                    t("edit_modal.video.preview")
                                  }
                                  videoId={formData.overviewVideoId}
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("edit_modal.video.change")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="mb-2">
                                <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                              </div>
                              <p className="text-sm text-gray-600">
                                {t("edit_modal.video.upload")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("edit_modal.video.formats")}
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

                      {/* Basic Information */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_modal.basic_info")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <Input
                            label={t("edit_modal.fields.title_en")}
                            value={formData.title_en}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                title_en: e.target.value,
                              })
                            }
                          />
                          <Input
                            label={t("edit_modal.fields.title_ar")}
                            value={formData.title_ar}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                title_ar: e.target.value,
                              })
                            }
                          />
                          <Autocomplete
                            isRequired
                            defaultItems={categories || []}
                            defaultSelectedKey={selectedCourse?.categoryId}
                            errorMessage={
                              !selectedCategory &&
                              t("edit_modal.errors.category_required")
                            }
                            isDisabled={isCategoriesLoading}
                            isLoading={isCategoriesLoading}
                            label={t("table.category")}
                            placeholder={t(
                              "edit_modal.placeholders.select_category"
                            )}
                            selectedKey={selectedCategory}
                            value={getCategoryLabel(
                              selectedCategory,
                              categories
                            )}
                            onSelectionChange={(newValue) => {
                              setSelectedCategory(newValue);
                            }}
                          >
                            {(category) => {
                              const enTranslation =
                                category?.translations?.find(
                                  (t) => t.language === "en"
                                );
                              const arTranslation =
                                category?.translations?.find(
                                  (t) => t.language === "ar"
                                );

                              if (!enTranslation && !arTranslation) {
                                return null;
                              }

                              return (
                                <AutocompleteItem
                                  key={category.id}
                                  textValue={
                                    enTranslation?.categoryName ||
                                    arTranslation?.categoryName ||
                                    ""
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span className="text-small">
                                      {enTranslation?.categoryName || ""}
                                    </span>
                                    <span className="text-tiny text-default-400">
                                      {arTranslation?.categoryName || ""}
                                    </span>
                                  </div>
                                </AutocompleteItem>
                              );
                            }}
                          </Autocomplete>
                          <Select
                            label={t("edit_modal.fields.course_type")}
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
                              {t(
                                "edit_modal.options.course_types.university_student"
                              )}
                            </SelectItem>
                            <SelectItem
                              key="SCHOOL_STUDENT"
                              value="SCHOOL_STUDENT"
                            >
                              {t(
                                "edit_modal.options.course_types.school_student"
                              )}
                            </SelectItem>
                          </Select>
                          <Select
                            label={t("edit_modal.fields.course_level")}
                            selectedKeys={[formData.courseLevel]}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                courseLevel: e.target.value,
                              })
                            }
                          >
                            <SelectItem key="BEGINNER" value="BEGINNER">
                              {t("edit_modal.options.levels.beginner")}
                            </SelectItem>
                            <SelectItem key="INTERMEDIATE" value="INTERMEDIATE">
                              {t("edit_modal.options.levels.intermediate")}
                            </SelectItem>
                            <SelectItem key="ADVANCED" value="ADVANCED">
                              {t("edit_modal.options.levels.advanced")}
                            </SelectItem>
                          </Select>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                              label={t("edit_modal.fields.course_timezone")}
                              selectedKeys={
                                formData.courseTimezone
                                  ? [formData.courseTimezone]
                                  : []
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  courseTimezone: normalizeTimezone(
                                    e.target.value
                                  ),
                                })
                              }
                            >
                              <SelectItem
                                key="africa_cairo"
                                value="africa_cairo"
                              >
                                {t("edit_modal.options.timezones.africa_cairo")}
                              </SelectItem>
                              <SelectItem key="asia_kuwait" value="asia_kuwait">
                                {t("edit_modal.options.timezones.asia_kuwait")}
                              </SelectItem>
                            </Select>

                            <Input
                              label={t("edit_modal.fields.price")}
                              min={0}
                              placeholder={t(
                                "edit_modal.placeholders.enter_price"
                              )}
                              step={0.01}
                              type="number"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  price: parseFloat(e.target.value) || 0,
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
                          {t("edit_modal.status")}
                        </h3>
                        <div className="flex gap-4">
                          <Switch
                            isSelected={formData.isPublished}
                            size="lg"
                            onValueChange={(value) =>
                              setFormData({ ...formData, isPublished: value })
                            }
                          >
                            {t("edit_modal.fields.published")}
                          </Switch>
                          <Switch
                            isSelected={formData.isVisible}
                            size="lg"
                            onValueChange={(value) =>
                              setFormData({ ...formData, isVisible: value })
                            }
                          >
                            {t("edit_modal.fields.visible")}
                          </Switch>
                        </div>
                      </div>

                      <Divider />

                      {/* Descriptions */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_modal.descriptions")}
                        </h3>
                        <div className="flex flex-col gap-4">
                          <Textarea
                            label={t("edit_modal.fields.description_en")}
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
                            label={t("edit_modal.fields.description_ar")}
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

                      {/* Course Details */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_modal.course_details")}
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                          {/* Course Brief */}
                          <div>
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.fields.course_brief")}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Textarea
                                label={t("edit_modal.fields.course_brief_en")}
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
                                label={t("edit_modal.fields.course_brief_ar")}
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

                          {/* Course Duration */}
                          <div>
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.fields.course_duration")}
                            </h4>
                            <Input
                              label={t("edit_modal.fields.total_minutes")}
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

                          {/* Learning Points */}
                          <div>
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.fields.learning_points")}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Input
                                  label={t(
                                    "edit_modal.fields.learning_points_en"
                                  )}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_learning_point_en"
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
                                  label={t(
                                    "edit_modal.fields.learning_points_ar"
                                  )}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_learning_point_ar"
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

                          {/* Target Audience */}
                          <div>
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.fields.target_audience")}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Input
                                  label={t(
                                    "edit_modal.fields.target_audience_en"
                                  )}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_target_audience_en"
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
                                  label={t(
                                    "edit_modal.fields.target_audience_ar"
                                  )}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_target_audience_ar"
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

                          {/* Requirements */}
                          <div>
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.fields.requirements")}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Input
                                  label={t("edit_modal.fields.requirements_en")}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_requirement_en"
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
                                  label={t("edit_modal.fields.requirements_ar")}
                                  placeholder={t(
                                    "edit_modal.placeholders.add_requirement_ar"
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
                      </div>

                      <Divider />

                      {/* Course Dates */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_modal.course_dates")}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label={t("edit_modal.fields.start_date")}
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
                            label={t("edit_modal.fields.end_date")}
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
                      </div>

                      <Divider />

                      {/* Instructors */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">
                          {t("edit_modal.instructors")}
                        </h3>
                        <div className="mt-4 flex flex-col gap-4">
                          <Autocomplete
                            isRequired
                            defaultSelectedKey={selectedOwner}
                            label={t("edit_modal.select_owner")}
                            selectedKey={selectedOwner}
                            value={
                              instructors?.find((i) => i.id === selectedOwner)
                                ?.user?.name || ""
                            }
                            onSelectionChange={(newOwnerId) => {
                              if (newOwnerId) {
                                // If the new owner was previously an additional instructor, remove them
                                if (selectedInstructors.includes(newOwnerId)) {
                                  setSelectedInstructors(
                                    selectedInstructors.filter(
                                      (id) => id !== newOwnerId
                                    )
                                  );
                                  const newPermissions = {
                                    ...coursePermissions,
                                  };

                                  delete newPermissions[newOwnerId];
                                  setCoursePermissions(newPermissions);
                                }
                                setSelectedOwner(newOwnerId);
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

                          {/* Additional Instructors Section */}
                          <div className="mt-4">
                            <h4 className="mb-2 font-medium">
                              {t("edit_modal.additional_instructors")}
                            </h4>

                            {/* Instructor Search */}
                            <Autocomplete
                              label={t("edit_modal.search_instructors")}
                              value={instructorSearchQuery}
                              onInputChange={setInstructorSearchQuery}
                              onSelectionChange={(instructorId) => {
                                if (
                                  instructorId &&
                                  instructorId !== selectedOwner &&
                                  !selectedInstructors.includes(instructorId)
                                ) {
                                  setSelectedInstructors([
                                    ...selectedInstructors,
                                    instructorId,
                                  ]);
                                  setCoursePermissions({
                                    ...coursePermissions,
                                    [instructorId]: {
                                      canUpdate: false,
                                      canDelete: false,
                                    },
                                  });
                                }
                              }}
                            >
                              {availableInstructors.map((instructor) => (
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

                            {/* Selected Instructors List */}
                            <div className="mt-4 flex flex-col gap-4">
                              {selectedInstructors.map((instructorId) => {
                                const instructor = instructors?.find(
                                  (i) => i.id === instructorId
                                );

                                if (!instructor) return null;

                                return (
                                  <div
                                    key={instructorId}
                                    className="flex flex-col gap-2 rounded-lg border p-4"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">
                                          {instructor.user?.name}
                                        </p>
                                        <p className="text-sm text-default-400">
                                          {instructor.user?.email}
                                        </p>
                                      </div>
                                      <Button
                                        color="danger"
                                        size="sm"
                                        variant="light"
                                        onPress={() => {
                                          setSelectedInstructors(
                                            selectedInstructors.filter(
                                              (id) => id !== instructorId
                                            )
                                          );
                                          const newPermissions = {
                                            ...coursePermissions,
                                          };

                                          delete newPermissions[instructorId];
                                          setCoursePermissions(newPermissions);
                                        }}
                                      >
                                        {t("edit_modal.remove_instructor")}
                                      </Button>
                                    </div>

                                    {/* Permissions */}
                                    <div className="mt-2 flex gap-4">
                                      <Switch
                                        isSelected={
                                          coursePermissions[instructorId]
                                            ?.canUpdate
                                        }
                                        size="sm"
                                        onValueChange={(value) =>
                                          setCoursePermissions({
                                            ...coursePermissions,
                                            [instructorId]: {
                                              ...coursePermissions[
                                                instructorId
                                              ],
                                              canUpdate: value,
                                            },
                                          })
                                        }
                                      >
                                        {t("edit_modal.can_update")}
                                      </Switch>
                                      <Switch
                                        isSelected={
                                          coursePermissions[instructorId]
                                            ?.canDelete
                                        }
                                        size="sm"
                                        onValueChange={(value) =>
                                          setCoursePermissions({
                                            ...coursePermissions,
                                            [instructorId]: {
                                              ...coursePermissions[
                                                instructorId
                                              ],
                                              canDelete: value,
                                            },
                                          })
                                        }
                                      >
                                        {t("edit_modal.can_delete")}
                                      </Switch>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tab>
                  <Tab key="units" title={t("edit_modal.tabs.units")}>
                    <CourseUnitsManagement courseId={selectedCourse.id} />
                  </Tab>
                </Tabs>
              </DrawerBody>
              <DrawerFooter>
                <div className="flex justify-end gap-2">
                  <Button color="danger" variant="light" onPress={onEditClose}>
                    {t("edit_modal.buttons.cancel")}
                  </Button>
                  <Button color="primary" onPress={() => handleUpdateCourse()}>
                    {t("edit_modal.buttons.save")}
                  </Button>
                </div>
              </DrawerFooter>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} size="md" onClose={onDeleteClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("delete_modal.title")}</ModalHeader>
              <ModalBody>
                <p>
                  {t("delete_modal.message", {
                    title: selectedCourse?.translations.find(
                      (t) => t.language === "en"
                    )?.courseTitle,
                  })}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  isDisabled={isDeleting}
                  variant="light"
                  onPress={onClose}
                >
                  {t("delete_modal.buttons.cancel")}
                </Button>
                <Button
                  color="danger"
                  isLoading={isDeleting}
                  onPress={handleConfirmDelete}
                >
                  {t("delete_modal.buttons.confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
