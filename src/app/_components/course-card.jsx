// components/CourseCard.tsx
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Progress,
  Spinner,
} from "@heroui/react";
import { Rating } from "@smastrom/react-rating";
import { useTranslations, useLocale } from "next-intl";
import {
  EllipsisVerticalIcon,
  HeartIcon as HeartSolid,
} from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const MAX_DESCRIPTION_LENGTH = 80;

export function CourseCard({
  course,
  showProgress = false,
  progress = 0,
  isFavorite: initialIsFavorite = false,
  onEdit,
}) {
  const t = useTranslations("CourseCard");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const utils = api.useUtils();
  const router = useRouter();
  const { data: session } = useSession();

  // Get favorite status only if user is logged in
  const { data: favoriteStatus } = api.user.isCourseFavorited.useQuery(
    { courseId: course?.id ?? "" },
    { enabled: !!course?.id && !!session?.user }
  );

  // Mutations for course actions
  const { mutate: updateCourse } = api.course.updateCourse.useMutation({
    onSuccess: () => {
      toast.success(t("course_updated"));
      utils.instructor.getMyCourses.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const { mutate: deleteCourse } = api.course.deleteCourse.useMutation({
    onSuccess: () => {
      toast.success(t("course_deleted"));
      utils.instructor.getMyCourses.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const { mutate: toggleFavorite, isLoading: isTogglingFavorite } =
    api.user.toggleFavoriteCourse.useMutation({
      onSuccess: (data) => {
        toast.success(
          data.isFavorited
            ? t("added_to_favorites")
            : t("removed_from_favorites")
        );
        utils.user.isCourseFavorited.invalidate();
        utils.user.getFavoriteCourses.invalidate();
      },
      onError: (error) => toast.error(error.message),
    });

  const handleDraftToggle = () => {
    if (!course?.id) return;
    updateCourse({
      courseId: course.id,
      data: { isDraft: !course.isDraft },
    });
  };

  const handleDelete = () => {
    if (!course?.id) return;
    if (window.confirm(t("confirm_delete"))) {
      deleteCourse({ courseId: course.id });
    }
  };

  const handleFavoriteToggle = () => {
    if (!course || !session?.user) return;
    toggleFavorite({ courseId: course.id });
  };

  const truncateDescription = (text) => {
    if (!text) return "";
    if (text.length <= MAX_DESCRIPTION_LENGTH) return text;

    return text.slice(0, MAX_DESCRIPTION_LENGTH).trim() + "...";
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const optimizeImage = (imageUrl) => {
    if (!imageUrl || imageUrl.startsWith("https://placehold.co")) {
      return imageUrl;
    }

    // Add Bunny Optimizer parameters
    const params = new URLSearchParams({
      format: "webp", // Convert to WebP
      width: "800", // Set appropriate width
      quality: "90", // Optimize quality
    });

    return `${imageUrl}?${params.toString()}`;
  };

  const handleViewDetails = () => {
    if (!course?.title?.[locale]) return;
    const courseTitle = course.title[locale];

    router.push(`/${locale}/courses/${encodeURIComponent(courseTitle)}`);
  };

  return (
    <Card className="w-full font-rubik h-full flex flex-col">
      <CardBody className="p-0 flex-grow">
        <div className="relative">
          <img
            alt={course?.title?.[locale] || t("course_image")}
            className="w-full aspect-[4/3] md:aspect-video object-cover"
            src={optimizeImage(course?.image) || "https://placehold.co/600x400"}
          />
          {/* Course status badge */}
          {course?.isDraft ? (
            <div className="absolute top-2 left-2 bg-warning-100 text-warning-700 px-2 py-1 rounded-full text-xs">
              {t("draft")}
            </div>
          ) : null}
          {/* Favorite button - only show if user is logged in */}
          {session?.user ? (
            <Button
              isIconOnly
              className="absolute top-2 right-2 bg-white/50 backdrop-blur-sm"
              isDisabled={isTogglingFavorite}
              size="sm"
              variant="light"
              onPress={handleFavoriteToggle}
            >
              {isTogglingFavorite ? (
                <Spinner color="danger" size="sm" />
              ) : favoriteStatus?.isFavorited || initialIsFavorite ? (
                <HeartSolid className="h-5 w-5 text-[#d7544f]" />
              ) : (
                <HeartOutline className="h-5 w-5" />
              )}
            </Button>
          ) : null}
          {/* Action dropdown for owners/privileged instructors */}
          {course?.isOwner ||
          course?.permissions?.canUpdate ||
          course?.permissions?.canDelete ? (
            <div className="absolute top-2 right-12">
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  {course?.isOwner || course?.permissions?.canUpdate ? (
                    <>
                      <DropdownItem
                        key="toggle-draft"
                        onPress={handleDraftToggle}
                      >
                        {course?.isDraft ? t("publish") : t("unpublish")}
                      </DropdownItem>
                      <DropdownItem key="edit" onPress={onEdit}>
                        {t("edit")}
                      </DropdownItem>
                    </>
                  ) : null}
                  {course?.isOwner || course?.permissions?.canDelete ? (
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      onPress={handleDelete}
                    >
                      {t("delete")}
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "p-2 md:p-4 flex flex-col flex-grow",
            isRTL && "text-right"
          )}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <h3 className="font-bold text-base md:text-lg mb-1 md:mb-2 line-clamp-2">
            {course?.title?.[locale] || t("untitled")}
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-4 line-clamp-2">
            {truncateDescription(course?.description?.[locale] || "")}
          </p>
          <div
            className={cn("flex items-center gap-2 text-xs md:text-sm mt-auto")}
          >
            {course?.rating > 0 && (
              <div className={cn("flex items-center gap-1")}>
                <Rating
                  readOnly
                  style={{ maxWidth: 80 }}
                  value={course?.rating || 0}
                />
                <span className="font-semibold">
                  {t("rating", { rating: course?.rating || 0 })}
                </span>
                <span className="font-semibold">|</span>
              </div>
            )}
            <div
              className={cn(
                "flex items-center gap-1",
                isRTL && "flex-row-reverse"
              )}
            >
              <span className="text-gray-600">
                {t("priceLabel")}:{" "}
                {typeof course?.price === "number" ? course.price : "-"}{" "}
                {t("credits")}
              </span>
            </div>
          </div>
          {/* Last update information */}
          {course?.updatedAt && course?.updatedBy ? (
            <div className="mt-2 text-xs text-gray-500">
              {t("last_updated", {
                updatedBy: course.updatedBy,
                date: new Date(course.updatedAt).toLocaleDateString(locale),
                time: formatTime(course.updatedAt),
              })}
            </div>
          ) : null}
        </div>
        {/* Progress bar */}
        {showProgress ? (
          <div className="px-3 md:px-4 pb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs md:text-sm text-gray-600">
                {t("progress")}
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress
              aria-label="Course progress"
              className="h-1.5 md:h-2"
              classNames={{
                indicator: "bg-[#d7544f]",
              }}
              color="primary"
              value={progress}
            />
          </div>
        ) : null}
      </CardBody>
      <CardFooter
        className="pt-0 px-3 md:px-4 pb-3 md:pb-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Button
          className="w-full rounded-full text-[#d7544f] border-[#d7544f] hover:bg-[#d7544f] hover:text-white text-sm"
          variant="bordered"
          onPress={handleViewDetails}
        >
          {t("details")}
        </Button>
      </CardFooter>
    </Card>
  );
}
