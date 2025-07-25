"use client";

import { useParams } from "next/navigation";
import {
  Button,
  Tabs,
  Tab,
  Card,
  CardBody,
  Breadcrumbs,
  BreadcrumbItem,
  Accordion,
  AccordionItem,
  Avatar,
  Pagination,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@heroui/react";
import { Heart, ChevronDown, ChevronUp, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Rating } from "@smastrom/react-rating";
import { useState } from "react";
import { formatDistanceToNow, formatDistanceStrict } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { EditIcon } from "@/app/_components/EditIcon";
import { DeleteIcon } from "@/app/_components/DeleteIcon";
import { api } from "@/trpc/react";

export default function CourseDetails() {
  const params = useParams();
  const { data: session } = useSession();
  const isRTL = params.locale === "ar";
  const t = useTranslations("CourseDetails");
  const [currentPage, setCurrentPage] = useState(1);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const reviewsPerPage = 5;
  const utils = api.useUtils();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const { data: course, isLoading } = api.course.getCourseByTitle.useQuery({
    courseTitle: decodeURIComponent(params.courseName),
  });

  // Get favorite status only if user is logged in
  const { data: favoriteStatus } = api.user.isCourseFavorited.useQuery(
    { courseId: course?.id ?? "" },
    { enabled: !!course?.id && !!session?.user }
  );

  // Toggle favorite mutation
  const { mutate: toggleFavorite, isLoading: isTogglingFavorite } =
    api.user.toggleFavoriteCourse.useMutation({
      onSuccess: (data) => {
        toast.success(
          data.isFavorited
            ? t("added_to_favorites")
            : t("removed_from_favorites")
        );
        // Invalidate queries to refresh the data
        utils.user.isCourseFavorited.invalidate();
        utils.user.getFavoriteCourses.invalidate();
      },
      onError: (error) => toast.error(error.message),
    });

  // Get secure video URL and metadata if video ID exists
  const { data: videoData } = api.upload.getSecureVideoUrl.useQuery(
    { videoId: course?.overviewVideoId ?? "" },
    { enabled: !!course?.overviewVideoId }
  );

  // Get user's wallet
  const { data: wallet } = api.wallet.getWallet.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Enroll in course mutation
  const { mutate: enrollInCourse, isLoading: isEnrolling } =
    api.course.enrollInCourse.useMutation({
      onSuccess: () => {
        toast.success(t("enrollment_success"));
        setShowEnrollModal(false);
        // Refresh course data and wallet
        utils.course.getCourseByTitle.invalidate();
        utils.wallet.getWallet.invalidate();
      },
      onError: (error) => toast.error(error.message),
    });

  // Check if user has already reviewed
  const hasReviewed =
    course?.Review?.some((review) => review.user?.id === session?.user?.id) ??
    false;

  // Calculate pagination for reviews
  const reviews = course?.Review ?? [];
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const currentReviews = reviews.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  );

  // Add review mutation
  const { mutate: addReview } = api.course.addReview.useMutation({
    onSuccess: () => {
      toast.success(t("review_submitted"));
      setRating(0);
      setComment("");
      setIsSubmittingReview(false);
      // Refresh course data to show the new review
      utils.course.getCourseByTitle.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmittingReview(false);
    },
  });

  // Add update review mutation
  const { mutate: updateReview } = api.course.updateReview.useMutation({
    onSuccess: () => {
      toast.success(t("review_updated"));
      setEditingReview(null);
      // Refresh course data to show the updated review
      utils.course.getCourseByTitle.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Add delete review mutation
  const { mutate: deleteReview } = api.course.deleteReview.useMutation({
    onSuccess: () => {
      toast.success(t("review_deleted"));
      setShowDeleteModal(false);
      setReviewToDelete(null);
      // Refresh course data to remove the deleted review
      utils.course.getCourseByTitle.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleFavoriteToggle = () => {
    if (!course || !session?.user) return;
    toggleFavorite({ courseId: course.id });
  };

  const handleEnrollment = () => {
    if (!course || !session?.user) return;

    // Check if user has sufficient balance
    if (wallet && wallet.balance < course.price) {
      toast.error(t("insufficient_balance"));

      return;
    }

    enrollInCourse({ courseId: course.id });
  };

  const handleReviewSubmit = () => {
    if (!rating) {
      toast.error(t("rating_required"));

      return;
    }

    setIsSubmittingReview(true);
    addReview({
      courseId: course.id,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const handleUpdateReview = () => {
    if (!editingReview.rating) {
      toast.error(t("rating_required"));

      return;
    }

    updateReview({
      reviewId: editingReview.id,
      rating: editingReview.rating,
      comment: editingReview.comment?.trim() || undefined,
    });
  };

  const handleDeleteReview = () => {
    if (!reviewToDelete) return;
    deleteReview({ reviewId: reviewToDelete.id });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  const courseTitle = course.translations.find(
    (t) => t.language === params.locale
  )?.courseTitle;
  const courseDescription = course.translations.find(
    (t) => t.language === params.locale
  )?.courseDescription;
  const courseBrief = course.translations.find(
    (t) => t.language === params.locale
  )?.courseBrief;
  const translation = course.translations.find(
    (t) => t.language === params.locale
  );
  const instructorName =
    course.owner?.translations.find((t) => t.language === params.locale)
      ?.instructorName || course.owner?.user?.name;

  const courseDetails = {
    title: courseTitle,
    description: courseDescription,
    brief: courseBrief,
    instructor: instructorName,
    rating: course.averageRating,
    lessons: course.totalLessons,
    courseDuration:
      course.courseStart && course.courseEnd
        ? formatDistanceStrict(
            new Date(course.courseStart),
            new Date(course.courseEnd),
            { locale: params.locale === "ar" ? ar : enUS }
          )
        : t("notSpecified"),
    totalDuration: course.totalDuration
      ? `${course.totalDuration} ${t("hours")}`
      : t("notSpecified"),
    students: course.enrolledStudents.length,
    language: t("language"),
    learningPoints: translation?.learningPoints || [],
    targetAudience: translation?.targetAudience || [],
    requirements: translation?.requirements || [],
  };

  const isEnrolled =
    course?.enrolledStudentIds?.includes(session?.user?.id || "") ?? false;

  return (
    <>
      <div className="bg-primary/30 pb-8">
        <div
          className="max-w-[1200px] mx-auto px-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Breadcrumb */}
          <div className="flex justify-between items-center py-4">
            <Breadcrumbs>
              <BreadcrumbItem href={`/${params.locale}`}>
                {t("home")}
              </BreadcrumbItem>
              <BreadcrumbItem href={`/${params.locale}/courses`}>
                {course.category?.translations.find(
                  (t) => t.language === params.locale
                )?.categoryName || t("programming")}
              </BreadcrumbItem>
              <BreadcrumbItem>{courseTitle}</BreadcrumbItem>
            </Breadcrumbs>
          </div>

          <div className="flex flex-col-reverse lg:flex-row-reverse gap-8">
            {/* Course Card */}
            <div className="w-full lg:w-[400px] lg:absolute relative">
              <Card className="w-full sticky top-4">
                <CardBody className="gap-4">
                  {/* Video Preview */}
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {/* Only show favorite button if user is logged in */}
                    {session?.user ? (
                      <Button
                        isIconOnly
                        className="absolute top-4 left-4 bg-white/80 z-10"
                        isDisabled={isTogglingFavorite}
                        variant="flat"
                        onPress={handleFavoriteToggle}
                      >
                        <Heart
                          className={
                            favoriteStatus?.isFavorited
                              ? "text-[#d7544f] fill-current"
                              : "text-primary"
                          }
                        />
                      </Button>
                    ) : null}
                    {course.overviewVideoId && videoData ? (
                      <iframe
                        allowFullScreen
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                        loading="lazy"
                        src={videoData.url}
                        style={{
                          border: 0,
                          position: "absolute",
                          top: 0,
                          height: "100%",
                          width: "100%",
                        }}
                        title={`${courseDetails.title} - Course Preview`}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          isIconOnly
                          className="w-12 h-12 bg-primary text-white rounded-full"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-lg">{t("courseDetails")}</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>{t("courseDurationLabel")}</span>
                      <div className="flex items-center gap-2">
                        <span>{courseDetails.courseDuration}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>{t("totalDurationLabel")}</span>
                      <span>{courseDetails.totalDuration}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>{t("lessonsCountLabel")}</span>
                      <span>{courseDetails.lessons}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>{t("languageLabel")}</span>
                      <span>{courseDetails.language}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>{t("priceLabel")}</span>
                      <span>
                        {course.price} {t("credits")}
                      </span>
                    </div>
                  </div>

                  {!isEnrolled ? (
                    <Button
                      className="w-full bg-primary text-white rounded-xl py-6 mt-4"
                      size="lg"
                      onPress={() => setShowEnrollModal(true)}
                    >
                      {t("enrollNow")}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full bg-success text-white rounded-xl py-6 mt-4"
                      size="lg"
                    >
                      {t("alreadyEnrolled")}
                    </Button>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <h1 className="text-2xl lg:text-4xl font-bold my-6 lg:my-10 mb-4">
                {courseDetails.title}
              </h1>
              <p className="text-gray-600 mb-4 lg:mb-6 text-base lg:text-lg leading-relaxed">
                {courseDetails.brief || courseDetails.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-6 lg:mb-8">
                {courseDetails.rating > 0 && (
                  <>
                    <Rating
                      readOnly
                      style={{ maxWidth: 100 }}
                      value={courseDetails.rating}
                    />
                    <span className="text-sm lg:text-base">
                      ({courseDetails.rating.toFixed(1)})
                    </span>
                    <span className="text-sm lg:text-base text-gray-600">
                      |
                    </span>
                  </>
                )}
                <span className="text-sm lg:text-base text-gray-600">
                  {courseDetails.instructor}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="max-w-[1200px] mx-auto px-4 min-h-screen pb-16"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex flex-col lg:flex-row-reverse gap-8">
          <div className="w-full lg:w-[400px] hidden lg:block" />
          <div className="flex-1">
            {/* Tabs */}
            <div className="mt-8">
              <Tabs
                aria-label="Course tabs"
                className="w-full"
                classNames={{
                  tabList:
                    "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                  cursor: "w-full bg-primary",
                  tab: "max-w-fit px-4 h-12",
                  tabContent: "group-data-[selected=true]:text-primary",
                }}
                variant="underlined"
              >
                <Tab key="overview" title={t("overview")}>
                  <div className="py-6">
                    <div className="border-b pb-6 mb-6">
                      <h2 className="text-xl font-bold mb-4">
                        {t("briefDescription")}
                      </h2>
                      <p className="text-gray-600">
                        {courseDetails.description}
                      </p>
                    </div>

                    {courseDetails.learningPoints.length > 0 && (
                      <div
                        className={`${courseDetails.targetAudience.length > 0 ? "border-b pb-6 mb-6" : ""}`}
                      >
                        <h2 className="text-xl font-bold mb-4">
                          {t("whatYouWillLearn")}
                        </h2>
                        <ul className="space-y-3">
                          {courseDetails.learningPoints.map((point, index) => (
                            <li
                              key={index}
                              className="flex gap-3 text-gray-600"
                            >
                              <span className="text-primary">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {courseDetails.targetAudience.length > 0 && (
                      <div
                        className={`${courseDetails.requirements.length > 0 ? "border-b pb-6 mb-6" : ""}`}
                      >
                        <h2 className="text-xl font-bold mb-4">
                          {t("targetAudience")}
                        </h2>
                        <ul className="space-y-3">
                          {courseDetails.targetAudience.map((point, index) => (
                            <li
                              key={index}
                              className="flex gap-3 text-gray-600"
                            >
                              <span className="text-primary">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {courseDetails.requirements.length > 0 && (
                      <div>
                        <h2 className="text-xl font-bold mb-4">
                          {t("requirements")}
                        </h2>
                        <ul className="space-y-3">
                          {courseDetails.requirements.map((point, index) => (
                            <li
                              key={index}
                              className="flex gap-3 text-gray-600"
                            >
                              <span className="text-primary">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-6 lg:mt-8 border-t pt-4 lg:pt-6">
                      <div className="flex flex-col items-start text-start">
                        <Avatar
                          alt={
                            course.owner?.translations.find(
                              (t) => t.language === params.locale
                            )?.instructorName || course.owner?.user?.name
                          }
                          className="w-12 h-12 lg:w-16 lg:h-16 mb-3 lg:mb-4"
                          src={
                            course.owner?.user?.image ||
                            "/instructors/abdullah.jpg"
                          }
                        />
                        <h3 className="text-lg lg:text-xl font-semibold mb-2">
                          {course.owner?.translations.find(
                            (t) => t.language === params.locale
                          )?.instructorName || course.owner?.user?.name}
                        </h3>
                        <p className="text-xs lg:text-sm mx-0 lg:mx-4 mb-3 lg:mb-4">
                          {
                            course.owner?.translations.find(
                              (t) => t.language === params.locale
                            )?.instructorJobTitle
                          }
                        </p>
                        <p className="text-gray-600 text-sm lg:text-base max-w-2xl">
                          {
                            course.owner?.translations.find(
                              (t) => t.language === params.locale
                            )?.instructorBio
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </Tab>
                <Tab key="content" title={t("content")}>
                  <div className="py-4 lg:py-6">
                    <h2 className="text-xl font-bold mb-4 lg:mb-6">
                      {t("courseStructure")}
                    </h2>
                    <div className="text-gray-600 mb-3 lg:mb-4 text-sm lg:text-base">
                      {course.units.length} {t("units")} -{" "}
                      {courseDetails.lessons} {t("lessons")}
                    </div>
                    <Accordion className="gap-2 lg:gap-4" variant="shadow">
                      {course.units.map((unit, unitIndex) => {
                        const unitTitle = unit.translations.find(
                          (t) => t.language === params.locale
                        )?.unitTitle;

                        return (
                          <AccordionItem
                            key={unitIndex}
                            aria-label={unitTitle}
                            className="rounded-lg mb-2 lg:mb-4"
                            indicator={({ isOpen }) =>
                              isOpen ? (
                                <ChevronUp className="text-primary" />
                              ) : (
                                <ChevronDown className="text-primary" />
                              )
                            }
                            title={
                              <div className="flex justify-between items-center py-1 lg:py-2">
                                <div className="flex-1">
                                  <h3 className="font-medium text-sm lg:text-base">
                                    {unitTitle}
                                  </h3>
                                  <p className="text-xs lg:text-sm text-gray-600">
                                    {unit.lessons.length} {t("lessons")}
                                  </p>
                                </div>
                              </div>
                            }
                          >
                            <div className="space-y-2 pt-2">
                              {unit.lessons.map((lesson, lessonIndex) => {
                                const lessonTitle = lesson.translations.find(
                                  (t) => t.language === params.locale
                                )?.lessonTitle;
                                const lessonDescription =
                                  lesson.translations.find(
                                    (t) => t.language === params.locale
                                  )?.lessonDescription;

                                return (
                                  <Link
                                    key={lessonIndex}
                                    href={`/${params.locale}/courses/${encodeURIComponent(courseTitle)}/lesson/${unit.id}/${lesson.order}`}
                                  >
                                    <div className="bg-white rounded-lg p-3 lg:p-4 hover:bg-gray-50 transition-colors">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                          <Button
                                            isIconOnly
                                            className="bg-primary/10 text-primary w-8 h-8 lg:w-9 lg:h-9"
                                            radius="full"
                                            size="sm"
                                          >
                                            <Play className="w-3 h-3 lg:w-4 lg:h-4" />
                                          </Button>
                                          <div className="min-w-0">
                                            <h4 className="font-medium text-sm lg:text-base truncate">
                                              {lessonTitle}
                                            </h4>
                                            {lessonDescription ? (
                                              <p className="text-xs lg:text-sm text-gray-600 truncate">
                                                {lessonDescription}
                                              </p>
                                            ) : null}
                                          </div>
                                        </div>
                                        <div className="flex items-center">
                                          {lessonIndex === 0 && (
                                            <span className="text-primary text-xs lg:text-sm whitespace-nowrap">
                                              {t("watch")}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </Tab>
                <Tab key="comments" title={t("comments")}>
                  <div className="py-6">
                    {/* Review Form - Only show for enrolled users who haven't reviewed */}
                    {isEnrolled && !hasReviewed ? (
                      <div className="mb-8 p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">
                          {t("write_review")}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              {t("rating")}*
                            </label>
                            <Rating
                              style={{ maxWidth: 180 }}
                              value={rating}
                              onChange={setRating}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              {t("comment")}
                            </label>
                            <Textarea
                              maxRows={6}
                              minRows={3}
                              placeholder={t("comment_placeholder")}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                            />
                          </div>
                          <Button
                            className="bg-primary text-white"
                            isLoading={isSubmittingReview}
                            onPress={handleReviewSubmit}
                          >
                            {t("submit_review")}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {/* Reviews List */}
                    <div className="space-y-4 lg:space-y-6">
                      {currentReviews.map((review, index) => (
                        <div key={index} className="border-b pb-4 lg:pb-6">
                          <div className="flex items-start gap-3 lg:gap-4">
                            <Avatar
                              alt={review.user?.name}
                              className="w-10 h-10 lg:w-12 lg:h-12"
                              src={
                                review.user?.image || "/instructors/ahmed.jpg"
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-start lg:items-center justify-between">
                                <div>
                                  <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2 mb-1">
                                    <span className="font-medium text-sm lg:text-base">
                                      {review.user?.name}
                                    </span>
                                    <span className="text-gray-500 text-xs lg:text-sm">
                                      {formatDistanceToNow(
                                        new Date(review.createdAt),
                                        {
                                          addSuffix: true,
                                          locale:
                                            params.locale === "ar" ? ar : enUS,
                                        }
                                      )}
                                    </span>
                                  </div>
                                  {editingReview?.id === review.id ? (
                                    <div className="space-y-4">
                                      <div>
                                        <Rating
                                          style={{ maxWidth: 180 }}
                                          value={editingReview.rating}
                                          onChange={(value) =>
                                            setEditingReview({
                                              ...editingReview,
                                              rating: value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Textarea
                                          maxRows={6}
                                          minRows={3}
                                          placeholder={t("comment_placeholder")}
                                          value={editingReview.comment || ""}
                                          onChange={(e) =>
                                            setEditingReview({
                                              ...editingReview,
                                              comment: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          color="primary"
                                          onPress={handleUpdateReview}
                                        >
                                          {t("submit_review")}
                                        </Button>
                                        <Button
                                          variant="light"
                                          onPress={() => setEditingReview(null)}
                                        >
                                          {t("cancel")}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <Rating
                                        readOnly
                                        className="mb-2"
                                        style={{ maxWidth: 80 }}
                                        value={review.rating}
                                      />
                                      <p className="text-gray-600">
                                        {review.comment}
                                      </p>
                                    </>
                                  )}
                                </div>
                                {session?.user?.id === review.userId &&
                                  !editingReview && (
                                    <div className="flex gap-2">
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onPress={() =>
                                          setEditingReview({
                                            id: review.id,
                                            rating: review.rating,
                                            comment: review.comment,
                                          })
                                        }
                                      >
                                        <EditIcon className="text-default-500" />
                                      </Button>
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onPress={() => {
                                          setReviewToDelete(review);
                                          setShowDeleteModal(true);
                                        }}
                                      >
                                        <DeleteIcon className="text-danger" />
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-center mt-8">
                      <Pagination
                        showControls
                        classNames={{
                          wrapper: "gap-2",
                          item: "w-8 h-8",
                        }}
                        initialPage={1}
                        page={currentPage}
                        total={totalPages}
                        variant="bordered"
                        onChange={setCurrentPage}
                      />
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Confirmation Modal */}
      <Modal
        isOpen={showEnrollModal}
        placement={isRTL ? "top-end" : "top-start"}
        onClose={() => setShowEnrollModal(false)}
      >
        <ModalContent>
          <ModalHeader>{t("confirm_enrollment")}</ModalHeader>
          <ModalBody>
            <p>{t("enrollment_confirmation", { price: course.price })}</p>
            {wallet && wallet.balance < course.price ? (
              <p className="text-danger">{t("insufficient_balance_warning")}</p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => setShowEnrollModal(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              isDisabled={wallet ? wallet.balance < course.price : null}
              isLoading={isEnrolling}
              onPress={handleEnrollment}
            >
              {t("confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Delete Review Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        placement={isRTL ? "top-end" : "top-start"}
        onClose={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
      >
        <ModalContent>
          <ModalHeader>{t("delete_review")}</ModalHeader>
          <ModalBody>
            <p>{t("confirm_delete_review")}</p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                setShowDeleteModal(false);
                setReviewToDelete(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button color="danger" onPress={handleDeleteReview}>
              {t("confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
