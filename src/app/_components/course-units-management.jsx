"use client";

import { useState, useRef } from "react";
import {
  Button,
  Input,
  Switch,
  Textarea,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Tooltip,
  Progress,
  Tabs,
  Tab,
  Divider,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  PlusIcon,
  ArrowsUpDownIcon,
  TrashIcon,
  VideoCameraIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { IoCloudUploadOutline } from "react-icons/io5";
import { toast } from "sonner";

import { EditIcon } from "./EditIcon";
import QuizManagement from "./quiz-management";

import { useFileUpload } from "@/app/_hooks/useFileUpload";
import { api } from "@/trpc/react";

// Sortable Unit Component
function SortableUnit({ unit, onEdit, onDelete, children }) {
  const t = useTranslations("admin_dashboard");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} className="rounded-lg border" style={style}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2" {...attributes} {...listeners}>
          <ArrowsUpDownIcon className="h-4 w-4 cursor-move" />
          <span>
            {unit.translations.find((t) => t.language === "en")?.unitTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={t("units.edit_tooltip")}>
            <Button
              isIconOnly
              color="primary"
              size="sm"
              variant="light"
              onPress={() => onEdit(unit)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip color="danger" content={t("units.delete_tooltip")}>
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={() => onDelete(unit)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="border-t p-4">{children}</div>
    </div>
  );
}

// Add VideoPlayer component
const VideoPlayer = ({ videoId, title }) => {
  const t = useTranslations("admin_dashboard");
  const { getVideoUrl } = useFileUpload();
  const { data, isLoading, isError } = getVideoUrl(videoId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-gray-500">
            {t("lessons.video_processing")}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data?.url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-100 rounded-lg">
        <p className="text-sm text-red-500">{t("lessons.video_error")}</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden">
      <iframe
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowFullScreen={true}
        loading="lazy"
        src={data.url}
        style={{
          border: 0,
          width: "100%",
          height: "100%",
        }}
        title={title}
      />
    </div>
  );
};

// Sortable Lesson Component
function SortableLesson({ lesson, onEdit, onDelete }) {
  const t = useTranslations("admin_dashboard");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} className="rounded-lg border bg-white" style={style}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2" {...attributes} {...listeners}>
          <ArrowsUpDownIcon className="h-4 w-4 cursor-move" />
          <div className="flex flex-col">
            <span>
              {
                lesson.translations.find((t) => t.language === "en")
                  ?.lessonTitle
              }
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {lesson.videoId ? (
                <span className="flex items-center gap-1">
                  <VideoCameraIcon className="h-3 w-3" />
                  {t("lessons.video_uploaded")}
                </span>
              ) : null}
              {lesson.hasQuiz && lesson.quiz ? (
                <span className="flex items-center gap-1 text-blue-600">
                  <AcademicCapIcon className="h-3 w-3" />
                  Quiz
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={t("lessons.edit_tooltip")}>
            <Button
              isIconOnly
              color="primary"
              size="sm"
              variant="light"
              onPress={() => onEdit(lesson)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip color="danger" content={t("lessons.delete_tooltip")}>
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={() => onDelete(lesson)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default function CourseUnitsManagement({ courseId }) {
  const t = useTranslations("admin_dashboard");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [reorderedUnits, setReorderedUnits] = useState(null);
  const [reorderedLessons, setReorderedLessons] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const {
    uploadFile: uploadVideo,
    isUploading: isUploadingVideo,
    progress: videoProgress,
  } = useFileUpload();
  const {
    uploadFile: uploadPdf,
    isUploading: isUploadingPdf,
    progress: pdfProgress,
  } = useFileUpload();
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const videoInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    isOpen: isUnitModalOpen,
    onOpen: onUnitModalOpen,
    onClose: onUnitModalClose,
  } = useDisclosure();

  const {
    isOpen: isLessonModalOpen,
    onOpen: onLessonModalOpen,
    onClose: onLessonModalClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();

  const [formData, setFormData] = useState({
    title_en: "",
    title_ar: "",
    description_en: "",
    description_ar: "",
    isVisible: true,
    videoId: "",
    pdfUrl: [],
  });
  
  const [selectedLessonTab, setSelectedLessonTab] = useState("details");

  // Fetch course units with proper error handling
  const { data: units = [], isLoading } = api.course.getCourseUnits.useQuery(
    { courseId },
    {
      enabled: !!courseId,
      refetchOnWindowFocus: false,
    }
  );

  // Mutations with proper context
  const utils = api.useContext();

  const { mutate: createUnit } = api.course.createUnit.useMutation({
    onSuccess: () => {
      toast.success(t("units.unit_created"));
      utils.course.getCourseUnits.invalidate({ courseId });
      onUnitModalClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateUnit } = api.course.updateUnit.useMutation({
    onSuccess: () => {
      toast.success(t("units.unit_updated"));
      utils.course.getCourseUnits.invalidate({ courseId });
      onUnitModalClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteUnit } = api.course.deleteUnit.useMutation({
    onSuccess: () => {
      toast.success(t("units.unit_deleted"));
      utils.course.getCourseUnits.invalidate({ courseId });
      onDeleteModalClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: createLesson, isLoading: isCreatingLesson } =
    api.course.createLesson.useMutation({
      onSuccess: () => {
        console.log("Lesson created successfully");
        setIsSavingLesson(false);
        toast.success(t("lessons.lesson_created"));
        utils.course.getCourseUnits.invalidate({ courseId });
        resetForm();
        onLessonModalClose();
      },
      onError: (error) => {
        console.error("Error creating lesson:", error);
        setIsSavingLesson(false);
        toast.error(error.message);
      },
    });

  const { mutate: updateLesson, isLoading: isUpdatingLesson } =
    api.course.updateLesson.useMutation({
      onSuccess: () => {
        console.log("Lesson updated successfully");
        setIsSavingLesson(false);
        toast.success(t("lessons.lesson_updated"));
        utils.course.getCourseUnits.invalidate({ courseId });
        resetForm();
        onLessonModalClose();
      },
      onError: (error) => {
        console.error("Error updating lesson:", error);
        setIsSavingLesson(false);
        toast.error(error.message);
      },
    });

  const { mutate: deleteLesson } = api.course.deleteLesson.useMutation({
    onSuccess: () => {
      toast.success(t("lessons.lesson_deleted"));
      utils.course.getCourseUnits.invalidate({ courseId });
      onDeleteModalClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: reorderUnits } = api.course.reorderUnits.useMutation({
    onSuccess: () => {
      toast.success(t("units.units_reordered"));
      utils.course.getCourseUnits.invalidate({ courseId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: reorderLessons } = api.course.reorderLessons.useMutation({
    onSuccess: () => {
      toast.success(t("lessons.lessons_reordered"));
      utils.course.getCourseUnits.invalidate({ courseId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title_en: "",
      title_ar: "",
      description_en: "",
      description_ar: "",
      isVisible: true,
      videoId: "",
      pdfUrl: [],
    });
    setSelectedUnit(null);
    setSelectedLesson(null);
    setIsAddingLesson(false);
    setSelectedLessonTab("details");
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Check if the dragged item is a unit
    const draggedUnit = units.find((unit) => unit.id === active.id);

    if (draggedUnit) {
      const oldIndex = units.findIndex((unit) => unit.id === active.id);
      const newIndex = units.findIndex((unit) => unit.id === over.id);

      const newOrder = arrayMove(units, oldIndex, newIndex);

      setReorderedUnits(newOrder);
      setHasChanges(true);

      return;
    }

    // Check if the dragged item is a lesson
    for (const unit of units) {
      const draggedLesson = unit.lessons?.find(
        (lesson) => lesson.id === active.id
      );

      if (draggedLesson) {
        const oldIndex = unit.lessons.findIndex(
          (lesson) => lesson.id === active.id
        );
        const newIndex = unit.lessons.findIndex(
          (lesson) => lesson.id === over.id
        );

        const newLessonOrder = arrayMove(unit.lessons, oldIndex, newIndex);

        setReorderedLessons({
          ...reorderedLessons,
          [unit.id]: newLessonOrder,
        });
        setHasChanges(true);
        break;
      }
    }
  };

  const handleApplyChanges = () => {
    if (reorderedUnits) {
      reorderUnits({
        courseId,
        unitIds: reorderedUnits.map((unit) => unit.id),
      });
    }

    Object.entries(reorderedLessons).forEach(([unitId, lessons]) => {
      reorderLessons({
        unitId,
        lessonIds: lessons.map((lesson) => lesson.id),
      });
    });

    setReorderedUnits(null);
    setReorderedLessons({});
    setHasChanges(false);
  };

  const handleAddUnit = () => {
    setIsAddingUnit(true);
    setSelectedUnit(null);
    resetForm();
    onUnitModalOpen();
  };

  const handleEditUnit = (unit) => {
    setIsAddingUnit(false);
    setSelectedUnit(unit);
    setFormData({
      title_en:
        unit.translations.find((t) => t.language === "en")?.unitTitle || "",
      title_ar:
        unit.translations.find((t) => t.language === "ar")?.unitTitle || "",
      description_en:
        unit.translations.find((t) => t.language === "en")?.unitDescription ||
        "",
      description_ar:
        unit.translations.find((t) => t.language === "ar")?.unitDescription ||
        "",
      isVisible: unit.isVisible,
    });
    onUnitModalOpen();
  };

  const handleAddLesson = (unit) => {
    console.log("Adding lesson for unit:", unit);
    setIsAddingLesson(true);
    setSelectedUnit(unit);
    setSelectedLesson(null);
    setFormData({
      title_en: "",
      title_ar: "",
      description_en: "",
      description_ar: "",
      isVisible: true,
      videoId: "",
      pdfUrl: [],
    });
    onLessonModalOpen();
  };

  const handleEditLesson = (unit, lesson) => {
    console.log("Editing lesson:", lesson, "for unit:", unit);
    setIsAddingLesson(false);
    setSelectedUnit(unit);
    setSelectedLesson(lesson);
    setFormData({
      title_en:
        lesson.translations.find((t) => t.language === "en")?.lessonTitle || "",
      title_ar:
        lesson.translations.find((t) => t.language === "ar")?.lessonTitle || "",
      description_en:
        lesson.translations.find((t) => t.language === "en")
          ?.lessonDescription || "",
      description_ar:
        lesson.translations.find((t) => t.language === "ar")
          ?.lessonDescription || "",
      isVisible: lesson.isVisible,
      videoId: lesson.videoId || "",
      pdfUrl: lesson.pdfUrl || [],
    });
    onLessonModalOpen();
  };

  const handleDeleteUnit = (unit) => {
    setSelectedUnit(unit);
    setSelectedLesson(null);
    onDeleteModalOpen();
  };

  const handleDeleteLesson = (unit, lesson) => {
    setSelectedUnit(unit);
    setSelectedLesson(lesson);
    onDeleteModalOpen();
  };

  const handleVideoUpload = async (file) => {
    try {
      const { videoId } = await uploadVideo(file, "video");

      setFormData({ ...formData, videoId });
      toast.success(t("lessons.video_uploaded"));
    } catch (error) {
      toast.error(t("lessons.video_upload_failed"));
      console.error("Video upload failed:", error);
    }
  };

  // Add new function for PDF upload
  const handlePdfUpload = async (files) => {
    try {
      const uploadPromises = files.map((file) => uploadPdf(file, "pdf"));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((result) => result.cdnUrl);

      setFormData((prev) => ({
        ...prev,
        pdfUrl: [...prev.pdfUrl, ...newUrls],
      }));
      toast.success(t("lessons.pdfs_uploaded"));
    } catch (error) {
      toast.error(t("lessons.pdf_upload_failed"));
      console.error("PDF upload failed:", error);
    }
  };

  const handleSaveLesson = () => {
    console.log("handleSaveLesson called");
    console.log("isAddingLesson:", isAddingLesson);
    console.log("selectedUnit:", selectedUnit);
    console.log("selectedLesson:", selectedLesson);
    console.log("formData:", formData);

    try {
      // Validate required fields
      if (!formData.title_en?.trim()) {
        toast.error(t("lessons.title_en_required"));

        return;
      }
      if (!formData.title_ar?.trim()) {
        toast.error(t("lessons.title_ar_required"));

        return;
      }
      if (!formData.description_en?.trim()) {
        toast.error(t("lessons.description_en_required"));

        return;
      }
      if (!formData.description_ar?.trim()) {
        toast.error(t("lessons.description_ar_required"));

        return;
      }

      setIsSavingLesson(true);

      if (isAddingLesson && selectedUnit) {
        console.log("Creating new lesson...");
        const data = {
          unitId: selectedUnit.id,
          data: {
            translations: [
              {
                language: "en",
                lessonTitle: formData.title_en.trim(),
                lessonDescription: formData.description_en.trim(),
              },
              {
                language: "ar",
                lessonTitle: formData.title_ar.trim(),
                lessonDescription: formData.description_ar.trim(),
              },
            ],
            isVisible: formData.isVisible,
            videoId: formData.videoId,
            pdfUrl: formData.pdfUrl,
          },
        };

        console.log("Mutation data:", data);
        createLesson(data);
      } else if (selectedLesson) {
        console.log("Updating existing lesson...");
        const data = {
          lessonId: selectedLesson.id,
          data: {
            translations: [
              {
                language: "en",
                lessonTitle: formData.title_en.trim(),
                lessonDescription: formData.description_en.trim(),
              },
              {
                language: "ar",
                lessonTitle: formData.title_ar.trim(),
                lessonDescription: formData.description_ar.trim(),
              },
            ],
            isVisible: formData.isVisible,
            videoId: formData.videoId,
            pdfUrl: formData.pdfUrl,
          },
        };

        console.log("Mutation data:", data);
        updateLesson(data);
      } else {
        console.error("Invalid state: neither adding nor editing a lesson");
        setIsSavingLesson(false);
        toast.error(t("lessons.invalid_state"));
      }
    } catch (error) {
      console.error("Error in handleSaveLesson:", error);
      setIsSavingLesson(false);
      toast.error(t("lessons.save_error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayUnits = reorderedUnits || units;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">{t("units.title")}</h2>
        <div className="flex gap-2">
          {hasChanges ? (
            <Button color="primary" onPress={handleApplyChanges}>
              {t("buttons.apply_changes")}
            </Button>
          ) : null}
          <Button
            color="primary"
            endContent={<PlusIcon className="h-4 w-4" />}
            onPress={handleAddUnit}
          >
            {t("units.add_unit")}
          </Button>
        </div>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4">
          <SortableContext
            items={displayUnits.map((unit) => unit.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayUnits?.map((unit) => (
              <SortableUnit
                key={unit.id}
                unit={unit}
                onDelete={handleDeleteUnit}
                onEdit={handleEditUnit}
              >
                <div className="flex flex-col gap-2">
                  <SortableContext
                    items={
                      (reorderedLessons[unit.id] || unit.lessons)?.map(
                        (lesson) => lesson.id
                      ) || []
                    }
                    strategy={verticalListSortingStrategy}
                  >
                    {(reorderedLessons[unit.id] || unit.lessons)?.map(
                      (lesson) => (
                        <SortableLesson
                          key={lesson.id}
                          lesson={lesson}
                          onDelete={(lesson) =>
                            handleDeleteLesson(unit, lesson)
                          }
                          onEdit={(lesson) => handleEditLesson(unit, lesson)}
                        />
                      )
                    )}
                  </SortableContext>
                  <Button
                    className="mt-2"
                    color="primary"
                    endContent={<PlusIcon className="h-4 w-4" />}
                    size="sm"
                    variant="light"
                    onPress={() => handleAddLesson(unit)}
                  >
                    {t("lessons.add_lesson")}
                  </Button>
                </div>
              </SortableUnit>
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Unit Modal */}
      <Modal isOpen={isUnitModalOpen} onClose={onUnitModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {isAddingUnit ? t("units.add_unit") : t("units.edit_unit")}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label={t("units.title_en")}
                    value={formData.title_en}
                    onChange={(e) =>
                      setFormData({ ...formData, title_en: e.target.value })
                    }
                  />
                  <Input
                    label={t("units.title_ar")}
                    value={formData.title_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, title_ar: e.target.value })
                    }
                  />
                  <Textarea
                    label={t("units.description_en")}
                    value={formData.description_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_en: e.target.value,
                      })
                    }
                  />
                  <Textarea
                    label={t("units.description_ar")}
                    value={formData.description_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_ar: e.target.value,
                      })
                    }
                  />
                  <Switch
                    isSelected={formData.isVisible}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isVisible: value })
                    }
                  >
                    {t("units.visible")}
                  </Switch>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  {t("buttons.cancel")}
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    if (isAddingUnit) {
                      createUnit({
                        courseId,
                        data: {
                          translations: [
                            {
                              language: "en",
                              unitTitle: formData.title_en,
                              unitDescription: formData.description_en,
                            },
                            {
                              language: "ar",
                              unitTitle: formData.title_ar,
                              unitDescription: formData.description_ar,
                            },
                          ],
                          isVisible: formData.isVisible,
                        },
                      });
                    } else if (selectedUnit) {
                      updateUnit({
                        unitId: selectedUnit.id,
                        data: {
                          translations: [
                            {
                              language: "en",
                              unitTitle: formData.title_en,
                              unitDescription: formData.description_en,
                            },
                            {
                              language: "ar",
                              unitTitle: formData.title_ar,
                              unitDescription: formData.description_ar,
                            },
                          ],
                          isVisible: formData.isVisible,
                        },
                      });
                    }
                  }}
                >
                  {t("buttons.save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        isDismissable={false}
        isOpen={isLessonModalOpen}
        scrollBehavior="inside"
        size="2xl"
        onClose={onLessonModalClose}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {isAddingLesson
                  ? t("lessons.add_lesson")
                  : t("lessons.edit_lesson")}
              </ModalHeader>
              <ModalBody>
                <Tabs
                  selectedKey={selectedLessonTab}
                  onSelectionChange={setSelectedLessonTab}
                  aria-label="Lesson management tabs"
                  variant="underlined"
                >
                  <Tab key="details" title={t("lessons.lesson_details")}>
                    <div className="py-4">
                      <div className="flex flex-col gap-4">
                  <Input
                    isRequired
                    label={t("lessons.title_en")}
                    value={formData.title_en}
                    onChange={(e) =>
                      setFormData({ ...formData, title_en: e.target.value })
                    }
                  />
                  <Input
                    isRequired
                    label={t("lessons.title_ar")}
                    value={formData.title_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, title_ar: e.target.value })
                    }
                  />
                  <Textarea
                    isRequired
                    label={t("lessons.description_en")}
                    value={formData.description_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_en: e.target.value,
                      })
                    }
                  />
                  <Textarea
                    isRequired
                    label={t("lessons.description_ar")}
                    value={formData.description_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_ar: e.target.value,
                      })
                    }
                  />
                  {/* Video Upload Section */}
                  <div className="bg-primary/5 rounded-lg p-4">
                    <button
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploadingVideo || isUploadingPdf}
                      onClick={(e) => {
                        e.preventDefault();
                        videoInputRef.current?.click();
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="mb-2">
                          <IoCloudUploadOutline className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-gray-600">
                          {formData.videoId
                            ? t("lessons.change_video")
                            : t("lessons.upload_lesson_video")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("lessons.video_formats")}
                        </p>
                      </div>
                    </button>
                    <input
                      ref={videoInputRef}
                      accept="video/*"
                      className="hidden"
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                          await handleVideoUpload(file);
                        }
                      }}
                    />

                    {/* Video Upload Progress */}
                    {isUploadingVideo ? (
                      <div className="mt-4">
                        <Progress
                          aria-label="Video Upload Progress"
                          classNames={{
                            base: "max-w-md",
                            track: "drop-shadow-md border border-default",
                            indicator:
                              "bg-gradient-to-r from-primary to-primary-600",
                            label:
                              "tracking-wider font-medium text-default-600",
                            value: "text-primary-600",
                          }}
                          color="primary"
                          size="sm"
                          value={videoProgress}
                        />
                        <p className="text-sm text-center mt-2">
                          {t("lessons.uploading_video")} (
                          {Math.round(videoProgress)}%)
                        </p>
                      </div>
                    ) : null}

                    {/* Video Preview */}
                    {formData.videoId && !isUploadingVideo ? (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">
                          {t("lessons.video_preview")}
                        </p>
                        <div className="max-w-2xl mx-auto">
                          <VideoPlayer
                            title={formData.title_en}
                            videoId={formData.videoId}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* PDF Upload Section */}
                  <div className="bg-primary/5 rounded-lg p-4 mt-4">
                    <button
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploadingVideo || isUploadingPdf}
                      onClick={(e) => {
                        e.preventDefault();
                        pdfInputRef.current?.click();
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="mb-2">
                          <IoCloudUploadOutline className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-gray-600">
                          {formData.pdfUrl.length > 0
                            ? t("lessons.add_more_pdfs")
                            : t("lessons.upload_lesson_pdfs")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("lessons.pdf_formats")}
                        </p>
                      </div>
                    </button>
                    <input
                      ref={pdfInputRef}
                      multiple
                      accept="application/pdf"
                      className="hidden"
                      type="file"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);

                        if (files.length > 0) {
                          await handlePdfUpload(files);
                        }
                      }}
                    />

                    {/* PDF Upload Progress */}
                    {isUploadingPdf ? (
                      <div className="mt-4">
                        <Progress
                          aria-label="PDF Upload Progress"
                          classNames={{
                            base: "max-w-md",
                            track: "drop-shadow-md border border-default",
                            indicator:
                              "bg-gradient-to-r from-primary to-primary-600",
                            label:
                              "tracking-wider font-medium text-default-600",
                            value: "text-primary-600",
                          }}
                          color="primary"
                          size="sm"
                          value={pdfProgress}
                        />
                        <p className="text-sm text-center mt-2">
                          {t("lessons.uploading_pdf")} (
                          {Math.round(pdfProgress)}%)
                        </p>
                      </div>
                    ) : null}

                    {/* PDF Previews */}
                    {formData.pdfUrl.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">
                          {t("lessons.pdf_previews")}
                        </p>
                        <div className="flex flex-col gap-4">
                          {formData.pdfUrl.map((pdfUrl, index) => (
                            <div key={pdfUrl} className="border rounded-lg p-4">
                              {/* PDF Preview iframe */}
                              <div className="w-full h-[500px] border rounded-lg overflow-hidden mb-4">
                                <iframe
                                  className="w-full h-full"
                                  src={`${pdfUrl}#toolbar=0`}
                                  title={`${formData.title_en} - PDF ${index + 1}`}
                                />
                              </div>
                              {/* PDF Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  as="a"
                                  color="primary"
                                  href={pdfUrl}
                                  rel="noopener noreferrer"
                                  size="sm"
                                  target="_blank"
                                >
                                  {t("lessons.view_pdf_full")}
                                </Button>
                                <Button
                                  download
                                  as="a"
                                  color="primary"
                                  href={pdfUrl}
                                  size="sm"
                                  variant="bordered"
                                >
                                  {t("lessons.download_pdf")}
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      pdfUrl: prev.pdfUrl.filter(
                                        (_, i) => i !== index
                                      ),
                                    }));
                                  }}
                                >
                                  {t("buttons.remove")}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                      <Switch
                        isSelected={formData.isVisible}
                        onValueChange={(value) =>
                          setFormData({ ...formData, isVisible: value })
                        }
                      >
                        {t("lessons.visible")}
                      </Switch>
                      </div>
                    </div>
                  </Tab>
                  
                  {/* Quiz Management Tab - Only show for existing lessons with video */}
                  {!isAddingLesson && selectedLesson && formData.videoId && (
                    <Tab key="quiz" title={t("lessons.quiz_management")}>
                      <div className="py-4">
                        <QuizManagement
                          lessonId={selectedLesson.id}
                          existingQuiz={selectedLesson.quiz}
                        />
                      </div>
                    </Tab>
                  )}
                </Tabs>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  {t("buttons.cancel")}
                </Button>
                <Button
                  color="primary"
                  isDisabled={
                    isSavingLesson || isCreatingLesson || isUpdatingLesson
                  }
                  isLoading={
                    isSavingLesson || isCreatingLesson || isUpdatingLesson
                  }
                  onPress={handleSaveLesson}
                >
                  {t("buttons.save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} size="sm" onClose={onDeleteModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {selectedLesson
                  ? t("lessons.delete_lesson")
                  : t("units.delete_unit")}
              </ModalHeader>
              <ModalBody>
                <p>
                  {selectedLesson
                    ? t("lessons.delete_confirmation")
                    : t("units.delete_confirmation")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  {t("buttons.cancel")}
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    if (selectedLesson) {
                      deleteLesson({ lessonId: selectedLesson.id });
                    } else if (selectedUnit) {
                      deleteUnit({ unitId: selectedUnit.id });
                    }
                  }}
                >
                  {t("buttons.delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
