"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import clsx from "clsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
  Select,
  SelectItem,
  Spinner,
  User,
  Avatar,
  Divider,
  Pagination,
  Switch,
  Chip,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Phone, Mail, Upload, Filter, Award, Download, Eye } from "lucide-react";

import { api } from "@/trpc/react";
import { EyeIcon } from "@/app/_components/EyeIcon";
import { EditIcon } from "@/app/_components/EditIcon";
import { DeleteIcon } from "@/app/_components/DeleteIcon";
import { useFileUpload } from "@/app/_hooks/useFileUpload";
import PhoneInput from "@/app/_components/phone-input";

export default function AccountsManagement() {
  const t = useTranslations("admin_dashboard");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { uploadFile } = useFileUpload();
  const { data: session, status } = useSession();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    image: "",
    accountStatus: "",
    instructorName: {
      ar: "",
      en: "",
    },
    instructorBio: {
      ar: "",
      en: "",
    },
    instructorJobTitle: {
      ar: "",
      en: "",
    },
    address: "",
    instructorPermissions: {
      canCreateCourses: false,
    },
    studentType: "SCHOOL_STUDENT",
  });

  // Add Account Modal State
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "USER",
    password: "",
    image: "",
    studentType: "",
    // Instructor specific fields
    instructorBio: {
      ar: "",
      en: "",
    },
    instructorName: {
      ar: "",
      en: "",
    },
    instructorJobTitle: {
      ar: "",
      en: "",
    },
    address: "",
  });

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
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudentForCerts, setSelectedStudentForCerts] = useState(null);
  const { 
    isOpen: isCertModalOpen, 
    onOpen: onCertModalOpen, 
    onClose: onCertModalClose 
  } = useDisclosure();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      notFound();
    }
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const rowsPerPage = 10;

  // Fetch users data
  const { data: users, isLoading: isLoadingUsers } = api.user.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const { mutate: updateUser, isLoading: isUpdating } =
    api.user.update.useMutation({
      onSuccess: () => {
        toast.success(t("messages.account_updated"));
        onEditClose();
        utils.user.getAll.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: deleteUser, isLoading: isDeleting } =
    api.user.delete.useMutation({
      onSuccess: () => {
        toast.success(t("messages.account_deleted"));
        onDeleteClose();
        utils.user.getAll.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: toggleStatus, isLoading: isTogglingStatus } =
    api.user.toggleStatus.useMutation({
      onSuccess: () => {
        toast.success(t("messages.status_updated"));
        utils.user.getAll.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: createUser, isLoading: isCreating } =
    api.user.create.useMutation({
      onSuccess: () => {
        toast.success(t("messages.account_created"));
        onAddClose();
        utils.user.getAll.invalidate();
        // Reset form
        setAddFormData({
          name: "",
          email: "",
          phone: "",
          role: "USER",
          password: "",
          image: "",
          studentType: "",
          instructorBio: {
            ar: "",
            en: "",
          },
          instructorName: {
            ar: "",
            en: "",
          },
          instructorJobTitle: {
            ar: "",
            en: "",
          },
          address: "",
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const utils = api.useUtils();

  const filteredUsers =
    users?.filter(
      (user) =>
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone?.includes(searchQuery)) &&
        (roleFilter === "ALL" || user.role === roleFilter) &&
        (statusFilter === "ALL" || user.accountStatus === statusFilter)
    ) || [];

  const pages = Math.ceil(filteredUsers.length / rowsPerPage);
  const items = filteredUsers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleView = (user) => {
    setSelectedUser(user);
    onViewOpen();
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: "",
      image: user.image,
      accountStatus: user.accountStatus,
      instructorName: {
        ar:
          user.instructor?.translations?.find((t) => t.language === "ar")
            ?.instructorName || "",
        en:
          user.instructor?.translations?.find((t) => t.language === "en")
            ?.instructorName || "",
      },
      instructorBio: {
        ar:
          user.instructor?.translations?.find((t) => t.language === "ar")
            ?.instructorBio || "",
        en:
          user.instructor?.translations?.find((t) => t.language === "en")
            ?.instructorBio || "",
      },
      instructorJobTitle: {
        ar:
          user.instructor?.translations?.find((t) => t.language === "ar")
            ?.instructorJobTitle || "",
        en:
          user.instructor?.translations?.find((t) => t.language === "en")
            ?.instructorJobTitle || "",
      },
      address: user.instructor?.address || "",
      instructorPermissions: {
        canCreateCourses:
          user.instructor?.permissions?.canCreateCourses || false,
      },
      studentType: user.studentType || "SCHOOL_STUDENT",
    });
    onEditOpen();
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    onDeleteOpen();
  };

  const handleEditSubmit = async () => {
    try {
      // Basic validation
      if (!editFormData.name?.trim()) {
        toast.error(t("messages.name_required"));

        return;
      }
      if (!editFormData.email?.trim()) {
        toast.error(t("messages.email_required"));

        return;
      }
      if (!editFormData.phone?.trim()) {
        toast.error(t("messages.phone_required"));

        return;
      }

      // Role-specific validation
      if (editFormData.role === "INSTRUCTOR") {
        if (!editFormData.instructorName?.ar?.trim()) {
          toast.error(t("messages.instructor_name_ar_required"));

          return;
        }
        if (!editFormData.instructorName?.en?.trim()) {
          toast.error(t("messages.instructor_name_en_required"));

          return;
        }
        if (!editFormData.instructorBio?.ar?.trim()) {
          toast.error(t("messages.instructor_bio_ar_required"));

          return;
        }
        if (!editFormData.instructorBio?.en?.trim()) {
          toast.error(t("messages.instructor_bio_en_required"));

          return;
        }
        if (!editFormData.instructorJobTitle?.ar?.trim()) {
          toast.error(t("messages.instructor_job_title_ar_required"));

          return;
        }
        if (!editFormData.instructorJobTitle?.en?.trim()) {
          toast.error(t("messages.instructor_job_title_en_required"));

          return;
        }
      }

      // Create user payload
      const userPayload = {
        id: selectedUser.id,
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
        accountStatus: editFormData.accountStatus,
        image: editFormData.image,
        studentType: editFormData.studentType,
      };

      // Add password if provided
      if (editFormData.password) {
        userPayload.password = editFormData.password;
      }

      // Add instructor data if role is INSTRUCTOR
      if (editFormData.role === "INSTRUCTOR") {
        userPayload.instructor = {
          update: {
            translations: {
              deleteMany: {},
              create: [
                {
                  language: "ar",
                  instructorBio: editFormData.instructorBio.ar,
                  instructorName: editFormData.instructorName.ar,
                  instructorJobTitle: editFormData.instructorJobTitle.ar,
                },
                {
                  language: "en",
                  instructorBio: editFormData.instructorBio.en,
                  instructorName: editFormData.instructorName.en,
                  instructorJobTitle: editFormData.instructorJobTitle.en,
                },
              ],
            },
            address: editFormData.address,
            permissions: {
              upsert: {
                create: {
                  canCreateCourses:
                    editFormData.instructorPermissions.canCreateCourses,
                },
                update: {
                  canCreateCourses:
                    editFormData.instructorPermissions.canCreateCourses,
                },
              },
            },
          },
        };
      }

      // Update user
      await updateUser(userPayload);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("messages.error_updating"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedUser) {
      try {
        await deleteUser({ id: selectedUser.id });
        toast.success("تم حذف الحساب بنجاح");
        onDeleteClose();
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error(
          error.message || "حدث خطأ أثناء حذف الحساب. يرجى المحاولة مرة أخرى"
        );
      }
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await toggleStatus({
        id: user.id,
        status: user.accountStatus === "ACTIVE" ? "DISABLED" : "ACTIVE",
      });
      toast.success(
        t(
          `messages.status_${
            user.accountStatus === "ACTIVE" ? "disabled" : "enabled"
          }`
        )
      );
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(t("messages.error_updating"));
    }
  };

  const handleProfileImageUpload = async (e) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("messages.file_too_large"));

        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(t("messages.invalid_file"));

        return;
      }

      const loadingToast = toast.loading(t("messages.uploading"));
      const { cdnUrl } = await uploadFile(file, "image");

      setEditFormData((prev) => ({
        ...prev,
        image: cdnUrl,
      }));

      toast.dismiss(loadingToast);
      toast.success(t("messages.profile_image_uploaded"));
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error(t("messages.upload_failed"));
    }
  };

  const handleAddSubmit = async () => {
    try {
      // Basic validation
      if (addFormData.role !== "INSTRUCTOR" && !addFormData.name?.trim()) {
        toast.error(t("messages.name_required"));

        return;
      }
      if (!addFormData.email?.trim()) {
        toast.error(t("messages.email_required"));

        return;
      }
      if (!addFormData.phone?.trim()) {
        toast.error(t("messages.phone_required"));

        return;
      }
      if (!addFormData.password?.trim()) {
        toast.error(t("messages.password_required"));

        return;
      }

      // Role-specific validation
      if (
        (addFormData.role === "USER" || addFormData.role === "INSTRUCTOR") &&
        !addFormData.studentType
      ) {
        toast.error(t("messages.student_type_required"));

        return;
      }

      if (addFormData.role === "INSTRUCTOR") {
        if (!addFormData.instructorBio.ar?.trim()) {
          toast.error(t("messages.instructor_bio_ar_required"));

          return;
        }
        if (!addFormData.instructorBio.en?.trim()) {
          toast.error(t("messages.instructor_bio_en_required"));

          return;
        }
        if (!addFormData.instructorName.ar?.trim()) {
          toast.error(t("messages.instructor_name_ar_required"));

          return;
        }
        if (!addFormData.instructorName.en?.trim()) {
          toast.error(t("messages.instructor_name_en_required"));

          return;
        }
        if (!addFormData.instructorJobTitle.ar?.trim()) {
          toast.error(t("messages.instructor_job_title_ar_required"));

          return;
        }
        if (!addFormData.instructorJobTitle.en?.trim()) {
          toast.error(t("messages.instructor_job_title_en_required"));

          return;
        }
      }

      // Create user payload
      const userPayload = {
        name:
          addFormData.role === "INSTRUCTOR"
            ? addFormData.instructorName.en
            : addFormData.name,
        email: addFormData.email,
        phone: addFormData.phone,
        role: addFormData.role,
        password: addFormData.password,
        studentType: addFormData.studentType,
      };

      // Add optional fields if they exist
      if (addFormData.image) {
        userPayload.image = addFormData.image;
      }

      // Create instructor if role is INSTRUCTOR
      if (addFormData.role === "INSTRUCTOR") {
        userPayload.instructor = {
          create: {
            translations: {
              create: [
                {
                  language: "ar",
                  instructorBio: addFormData.instructorBio.ar,
                  instructorName: addFormData.instructorName.ar,
                  instructorJobTitle: addFormData.instructorJobTitle.ar,
                },
                {
                  language: "en",
                  instructorBio: addFormData.instructorBio.en,
                  instructorName: addFormData.instructorName.en,
                  instructorJobTitle: addFormData.instructorJobTitle.en,
                },
              ],
            },
            address: addFormData.address,
          },
        };
      }

      // Create user
      await createUser(userPayload);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(t("messages.error_creating"));
    }
  };

  const handleProfileImageUploadForAdd = async (e) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("messages.file_too_large"));

        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(t("messages.invalid_file"));

        return;
      }

      const loadingToast = toast.loading(t("messages.uploading"));
      const { cdnUrl } = await uploadFile(file, "image");

      setAddFormData((prev) => ({
        ...prev,
        image: cdnUrl,
      }));

      toast.dismiss(loadingToast);
      toast.success(t("messages.profile_image_uploaded"));
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error(t("messages.upload_failed"));
    }
  };

  // Get student certificates
  const { data: studentCertData } = api.certificate.getStudentCertificates.useQuery(
    { studentId: selectedStudentForCerts?.id || "" },
    { enabled: !!selectedStudentForCerts?.id }
  );

  const handleViewStudentCertificates = (student) => {
    setSelectedStudentForCerts(student);
    onCertModalOpen();
  };

  if (isLoadingUsers) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Section with Search and Add Button */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-1 min-w-[200px] max-w-md">
              <Input
                className="w-full"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              className="min-w-unit-16 px-3"
              color="default"
              startContent={<Filter className="w-4 h-4" />}
              variant="flat"
              onPress={() => setShowFilters(!showFilters)}
            >
              {t("filters_button")}
            </Button>
          </div>
          <Button className="flex-shrink-0" color="primary" onPress={onAddOpen}>
            {t("add_account")} +
          </Button>
        </div>

        {/* Filters Section */}
        <div
          className={clsx(
            "grid gap-4 transition-all duration-200",
            showFilters
              ? "grid-cols-1 sm:grid-cols-2 opacity-100"
              : "h-0 overflow-hidden opacity-0"
          )}
        >
          <Select
            className="w-full"
            label={t("filters.role")}
            selectedKeys={[roleFilter]}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.all_roles")}
            </SelectItem>
            <SelectItem key="ADMIN" value="ADMIN">
              {t("edit_modal.roles.admin")}
            </SelectItem>
            <SelectItem key="INSTRUCTOR" value="INSTRUCTOR">
              {t("edit_modal.roles.instructor")}
            </SelectItem>
            <SelectItem key="USER" value="USER">
              {t("edit_modal.roles.user")}
            </SelectItem>
          </Select>

          <Select
            className="w-full"
            label={t("filters.status")}
            selectedKeys={[statusFilter]}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.all_statuses")}
            </SelectItem>
            <SelectItem key="ACTIVE" value="ACTIVE">
              {t("status.active")}
            </SelectItem>
            <SelectItem key="DISABLED" value="DISABLED">
              {t("status.disabled")}
            </SelectItem>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="w-full overflow-x-auto">
        <Table
          aria-label={t("accounts")}
          bottomContent={
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={page}
                total={pages}
                onChange={(page) => setPage(page)}
              />
            </div>
          }
        >
          <TableHeader>
            <TableColumn align="start">{t("table.name")}</TableColumn>
            <TableColumn align="center">{t("table.phone")}</TableColumn>
            <TableColumn align="center">{t("table.role")}</TableColumn>
            <TableColumn align="center">{t("table.contact")}</TableColumn>
            <TableColumn align="center">
              {t("table.account_status")}
            </TableColumn>
            <TableColumn align="center">{t("table.actions")}</TableColumn>
          </TableHeader>
          <TableBody
            items={items}
            loadingContent={<Spinner />}
            loadingState={isLoadingUsers ? "loading" : "idle"}
          >
            {(item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <User
                    avatarProps={{
                      src: item.image,
                      name: item.name?.[0]?.toUpperCase(),
                      isBordered: true,
                      color: "primary",
                    }}
                    description={item.email}
                    name={item.name}
                  />
                </TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>
                  <Button
                    color={
                      item.role === "ADMIN"
                        ? "danger"
                        : item.role === "INSTRUCTOR"
                          ? "warning"
                          : "default"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {t(`edit_modal.roles.${item.role.toLowerCase()}`)}
                  </Button>
                </TableCell>
                <TableCell className="flex items-center justify-center gap-4">
                  <Tooltip content={t("contact.call")}>
                    <a
                      className="text-primary bg-primary/20 hover:opacity-70 transition-opacity flex items-center justify-center rounded-full w-9 h-9"
                      href={`tel:${item.phone}`}
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </Tooltip>

                  <Tooltip content={t("contact.email")}>
                    <a
                      className="text-primary bg-primary/20 hover:opacity-70 transition-opacity flex items-center justify-center rounded-full w-9 h-9"
                      href={`mailto:${item.email}`}
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Button
                    color={
                      item.accountStatus === "ACTIVE" ? "success" : "danger"
                    }
                    isLoading={isTogglingStatus}
                    size="sm"
                    variant="flat"
                    onClick={() => handleToggleStatus(item)}
                  >
                    {t(`status.${item.accountStatus.toLowerCase()}`)}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-4 h-[40px]">
                    <Tooltip content={t("actions.view")}>
                      <button
                        className="text-gray-400 hover:text-primary transition-colors p-1"
                        onClick={() => handleView(item)}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip content={t("actions.edit")}>
                      <button
                        className="text-gray-400 hover:text-warning transition-colors p-1"
                        onClick={() => handleEdit(item)}
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip content={t("actions.delete")}>
                      <button
                        className="text-gray-400 hover:text-danger transition-colors p-1"
                        disabled={isDeleting}
                        onClick={() => handleDelete(item)}
                      >
                        <DeleteIcon className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    {item.role === "USER" && (
                      <Tooltip content={t("actions.view_certificates")}>
                        <button
                          className="text-gray-400 hover:text-info transition-colors p-1"
                          onClick={() => handleViewStudentCertificates(item)}
                        >
                          <Award className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={isViewOpen}
        scrollBehavior="inside"
        size="full"
        onClose={onViewClose}
      >
        <ModalContent>
          <ModalHeader className="border-b">
            {t("view_modal.title")}
          </ModalHeader>
          <ModalBody>
            {selectedUser ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Avatar
                    isBordered
                    className="w-32 h-32 text-large"
                    color="primary"
                    name={selectedUser.name?.[0]?.toUpperCase()}
                    src={selectedUser.image}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-default-700 mb-2">
                      {t("view_modal.fields.name")}
                    </h3>
                    <p className="text-large">{selectedUser.name}</p>
                  </div>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-default-700 mb-2">
                      {t("view_modal.fields.email")}
                    </h3>
                    <p className="text-large">{selectedUser.email}</p>
                  </div>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-default-700 mb-2">
                      {t("view_modal.fields.phone")}
                    </h3>
                    <p className="text-large">{selectedUser.phone}</p>
                  </div>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-default-700 mb-2">
                      {t("view_modal.fields.role")}
                    </h3>
                    <p className="text-large">
                      {t(`edit_modal.roles.${selectedUser.role.toLowerCase()}`)}
                    </p>
                  </div>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-default-700 mb-2">
                      {t("view_modal.fields.account_status")}
                    </h3>
                    <p
                      className={clsx(
                        "text-large font-medium",
                        selectedUser.accountStatus === "ACTIVE"
                          ? "text-success"
                          : "text-danger"
                      )}
                    >
                      {t(`status.${selectedUser.accountStatus.toLowerCase()}`)}
                    </p>
                  </div>

                  {/* Student Type */}
                  {selectedUser.studentType ? (
                    <div className="bg-default-100 p-4 rounded-lg col-span-2">
                      <h3 className="font-semibold text-default-700 mb-2">
                        {t("view_modal.fields.student_type")}
                      </h3>
                      <p className="text-large">
                        {t(
                          `add_account_modal.basic_info.student_types.${selectedUser.studentType.toLowerCase().replace("_student", "")}`
                        )}
                      </p>
                    </div>
                  ) : null}

                  {/* Instructor Details */}
                  {selectedUser.role === "INSTRUCTOR" &&
                  selectedUser.instructor ? (
                    <>
                      <Divider className="col-span-2 my-4" />
                      <div className="col-span-2">
                        <h3 className="text-xl font-bold mb-4">
                          {t("edit_modal.instructor_info.title")}
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-default-100 p-4 rounded-lg">
                            <h3 className="font-semibold text-default-700 mb-2">
                              {t("edit_modal.instructor_info.name_ar")}
                            </h3>
                            <p className="text-large" dir="rtl">
                              {
                                selectedUser.instructor.translations?.find(
                                  (t) => t.language === "ar"
                                )?.instructorName
                              }
                            </p>
                          </div>

                          <div className="bg-default-100 p-4 rounded-lg">
                            <h3 className="font-semibold text-default-700 mb-2">
                              {t("edit_modal.instructor_info.name_en")}
                            </h3>
                            <p className="text-large">
                              {
                                selectedUser.instructor.translations?.find(
                                  (t) => t.language === "en"
                                )?.instructorName
                              }
                            </p>
                          </div>

                          <div className="bg-default-100 p-4 rounded-lg col-span-2">
                            <h3 className="font-semibold text-default-700 mb-2">
                              {t("edit_modal.instructor_info.bio_ar")}
                            </h3>
                            <p
                              className="text-large whitespace-pre-wrap"
                              dir="rtl"
                            >
                              {
                                selectedUser.instructor.translations?.find(
                                  (t) => t.language === "ar"
                                )?.instructorBio
                              }
                            </p>
                          </div>

                          <div className="bg-default-100 p-4 rounded-lg col-span-2">
                            <h3 className="font-semibold text-default-700 mb-2">
                              {t("edit_modal.instructor_info.bio_en")}
                            </h3>
                            <p className="text-large whitespace-pre-wrap">
                              {
                                selectedUser.instructor.translations?.find(
                                  (t) => t.language === "en"
                                )?.instructorBio
                              }
                            </p>
                          </div>

                          {selectedUser.instructor.address ? (
                            <div className="bg-default-100 p-4 rounded-lg col-span-2">
                              <h3 className="font-semibold text-default-700 mb-2">
                                {t("edit_modal.instructor_info.address")}
                              </h3>
                              <p className="text-large">
                                {selectedUser.instructor.address}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onViewClose}>
              {t("view_modal.buttons.close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal
        className={isRTL ? "rtl" : "ltr"}
        isOpen={isEditOpen}
        scrollBehavior="inside"
        size="full"
        onClose={onEditClose}
      >
        <ModalContent>
          <ModalHeader>{t("edit_modal.title")}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar
                    isBordered
                    className="w-20 h-20 text-large"
                    color="primary"
                    name={editFormData.name?.[0]?.toUpperCase()}
                    src={editFormData.image}
                  />
                  <label
                    className="absolute bottom-0 right-0 p-1 bg-primary text-white rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    htmlFor="profile-upload"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                  <input
                    accept="image/*"
                    className="hidden"
                    id="profile-upload"
                    type="file"
                    onChange={handleProfileImageUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  isRequired
                  label={t("edit_modal.name")}
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
                <Input
                  isRequired
                  label={t("edit_modal.email")}
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                />
                <PhoneInput
                  isRequired
                  label={t("edit_modal.phone")}
                  value={editFormData.phone}
                  onChange={(value) =>
                    setEditFormData({ ...editFormData, phone: value })
                  }
                />
                <Select
                  isRequired
                  label={t("edit_modal.role")}
                  selectedKeys={[editFormData.role]}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                >
                  <SelectItem key="ADMIN" value="ADMIN">
                    {t("edit_modal.roles.admin")}
                  </SelectItem>
                  <SelectItem key="INSTRUCTOR" value="INSTRUCTOR">
                    {t("edit_modal.roles.instructor")}
                  </SelectItem>
                  <SelectItem key="USER" value="USER">
                    {t("edit_modal.roles.user")}
                  </SelectItem>
                </Select>

                {(editFormData.role === "USER" ||
                  editFormData.role === "INSTRUCTOR") && (
                  <Select
                    isRequired
                    label={t("add_account_modal.basic_info.student_type")}
                    selectedKeys={[editFormData.studentType]}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        studentType: e.target.value,
                      })
                    }
                  >
                    <SelectItem
                      key="UNIVERSITY_STUDENT"
                      value="UNIVERSITY_STUDENT"
                    >
                      {t(
                        "add_account_modal.basic_info.student_types.university"
                      )}
                    </SelectItem>
                    <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
                      {t("add_account_modal.basic_info.student_types.school")}
                    </SelectItem>
                  </Select>
                )}

                <Select
                  isRequired
                  label={t("edit_modal.account_status")}
                  selectedKeys={[editFormData.accountStatus]}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      accountStatus: e.target.value,
                    })
                  }
                >
                  <SelectItem key="ACTIVE" value="ACTIVE">
                    {t("status.active")}
                  </SelectItem>
                  <SelectItem key="DISABLED" value="DISABLED">
                    {t("status.disabled")}
                  </SelectItem>
                </Select>

                <Input
                  label={t("edit_modal.password")}
                  type="password"
                  value={editFormData.password}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      password: e.target.value,
                    })
                  }
                />

                {/* Instructor Fields */}
                {editFormData.role === "INSTRUCTOR" && (
                  <div className="space-y-4">
                    <Divider className="my-4" />
                    <h3 className="text-lg font-semibold">
                      {t("edit_modal.instructor_info.title")}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.name_ar")}
                        value={editFormData.instructorName.ar}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorName: {
                              ...editFormData.instructorName,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.name_en")}
                        value={editFormData.instructorName.en}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorName: {
                              ...editFormData.instructorName,
                              en: e.target.value,
                            },
                            name: e.target.value,
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.job_title_ar")}
                        value={editFormData.instructorJobTitle.ar}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorJobTitle: {
                              ...editFormData.instructorJobTitle,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.job_title_en")}
                        value={editFormData.instructorJobTitle.en}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorJobTitle: {
                              ...editFormData.instructorJobTitle,
                              en: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.bio_ar")}
                        value={editFormData.instructorBio.ar}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorBio: {
                              ...editFormData.instructorBio,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("edit_modal.instructor_info.bio_en")}
                        value={editFormData.instructorBio.en}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            instructorBio: {
                              ...editFormData.instructorBio,
                              en: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        className="col-span-2"
                        label={t("edit_modal.instructor_info.address")}
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            address: e.target.value,
                          })
                        }
                      />
                      <div className="col-span-2">
                        <Divider className="my-4" />
                        <h3 className="text-lg font-semibold mb-4">
                          {t("edit_modal.instructor_info.permissions")}
                        </h3>
                        <Switch
                          isSelected={
                            editFormData.instructorPermissions.canCreateCourses
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              instructorPermissions: {
                                ...editFormData.instructorPermissions,
                                canCreateCourses: e.target.checked,
                              },
                            })
                          }
                        >
                          {t("edit_modal.instructor_info.can_create_courses")}
                        </Switch>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onEditClose}>
              {t("edit_modal.buttons.cancel")}
            </Button>
            <Button
              color="primary"
              isLoading={isUpdating}
              onPress={handleEditSubmit}
            >
              {t("edit_modal.buttons.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>{t("delete_modal.title")}</ModalHeader>
          <ModalBody>
            {t("delete_modal.message", { name: selectedUser?.name })}
          </ModalBody>
          <ModalFooter>
            <Button color="default" variant="light" onPress={onDeleteClose}>
              {t("delete_modal.buttons.cancel")}
            </Button>
            <Button
              color="danger"
              isLoading={isDeleting}
              onPress={handleDeleteConfirm}
            >
              {t("delete_modal.buttons.confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        className={isRTL ? "rtl" : "ltr"}
        isOpen={isAddOpen}
        scrollBehavior="inside"
        size="full"
        onClose={onAddClose}
      >
        <ModalContent>
          <ModalHeader>{t("add_account_modal.title")}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar
                    isBordered
                    className="w-20 h-20 text-large"
                    color="primary"
                    name={addFormData.name?.[0]?.toUpperCase()}
                    src={addFormData.image}
                  />
                  <label
                    className="absolute bottom-0 right-0 p-1 bg-primary text-white rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    htmlFor="profile-upload-add"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                  <input
                    accept="image/*"
                    className="hidden"
                    id="profile-upload-add"
                    type="file"
                    onChange={handleProfileImageUploadForAdd}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {addFormData.role !== "INSTRUCTOR" && (
                  <Input
                    isRequired
                    label={t("add_account_modal.basic_info.name")}
                    value={addFormData.name}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, name: e.target.value })
                    }
                  />
                )}
                <Input
                  isRequired
                  label={t("add_account_modal.basic_info.email")}
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, email: e.target.value })
                  }
                />
                <PhoneInput
                  isRequired
                  label={t("add_account_modal.basic_info.phone")}
                  value={addFormData.phone}
                  onChange={(value) =>
                    setAddFormData({ ...addFormData, phone: value })
                  }
                />
                <Select
                  isRequired
                  label={t("add_account_modal.basic_info.role")}
                  selectedKeys={[addFormData.role]}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, role: e.target.value })
                  }
                >
                  <SelectItem key="ADMIN" value="ADMIN">
                    {t("add_account_modal.basic_info.roles.admin")}
                  </SelectItem>
                  <SelectItem key="INSTRUCTOR" value="INSTRUCTOR">
                    {t("add_account_modal.basic_info.roles.instructor")}
                  </SelectItem>
                  <SelectItem key="USER" value="USER">
                    {t("add_account_modal.basic_info.roles.user")}
                  </SelectItem>
                </Select>
                <Input
                  isRequired
                  label={t("add_account_modal.basic_info.password")}
                  type="password"
                  value={addFormData.password}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, password: e.target.value })
                  }
                />

                {/* Student Type Selection for Users and Instructors */}
                {(addFormData.role === "USER" ||
                  addFormData.role === "INSTRUCTOR" ||
                  addFormData.role === "ADMIN") && (
                  <Select
                    isRequired
                    label={t("add_account_modal.basic_info.student_type")}
                    selectedKeys={[addFormData.studentType]}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        studentType: e.target.value,
                      })
                    }
                  >
                    <SelectItem
                      key="UNIVERSITY_STUDENT"
                      value="UNIVERSITY_STUDENT"
                    >
                      {t(
                        "add_account_modal.basic_info.student_types.university"
                      )}
                    </SelectItem>
                    <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
                      {t("add_account_modal.basic_info.student_types.school")}
                    </SelectItem>
                  </Select>
                )}

                {/* Instructor Fields */}
                {addFormData.role === "INSTRUCTOR" && (
                  <div className="space-y-4 col-span-2">
                    <Divider className="my-4" />
                    <h3 className="text-lg font-semibold">
                      {t("add_account_modal.instructor_info.title")}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        isRequired
                        label={t("add_account_modal.instructor_info.name_ar")}
                        value={addFormData.instructorName.ar}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorName: {
                              ...addFormData.instructorName,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("add_account_modal.instructor_info.name_en")}
                        value={addFormData.instructorName.en}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorName: {
                              ...addFormData.instructorName,
                              en: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t(
                          "add_account_modal.instructor_info.job_title_ar"
                        )}
                        value={addFormData.instructorJobTitle.ar}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorJobTitle: {
                              ...addFormData.instructorJobTitle,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t(
                          "add_account_modal.instructor_info.job_title_en"
                        )}
                        value={addFormData.instructorJobTitle.en}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorJobTitle: {
                              ...addFormData.instructorJobTitle,
                              en: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("add_account_modal.instructor_info.bio_ar")}
                        value={addFormData.instructorBio.ar}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorBio: {
                              ...addFormData.instructorBio,
                              ar: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        isRequired
                        label={t("add_account_modal.instructor_info.bio_en")}
                        value={addFormData.instructorBio.en}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            instructorBio: {
                              ...addFormData.instructorBio,
                              en: e.target.value,
                            },
                          })
                        }
                      />
                      <Input
                        className="col-span-2"
                        label={t("add_account_modal.instructor_info.address")}
                        value={addFormData.address}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onAddClose}>
              {t("add_account_modal.buttons.cancel")}
            </Button>
            <Button
              color="primary"
              isDisabled={isCreating}
              isLoading={isCreating}
              onPress={handleAddSubmit}
            >
              {t("add_account_modal.buttons.add")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Student Certificates Modal */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={onCertModalClose}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              {t("student_certificates")} - {selectedStudentForCerts?.name || selectedStudentForCerts?.email}
            </div>
          </ModalHeader>
          <ModalBody>
            {studentCertData && (
              <div className="space-y-6">
                {/* Student Info */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">{t("student_information")}</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{t("table.name")}:</span> {studentCertData.student.name}
                      </div>
                      <div>
                        <span className="font-medium">{t("view_modal.fields.email")}:</span> {studentCertData.student.email}
                      </div>
                      <div>
                        <span className="font-medium">{t("view_modal.fields.student_type")}:</span> {studentCertData.student.studentType}
                      </div>
                      <div>
                        <span className="font-medium">{t("completed_courses")}:</span> {studentCertData.completedCourses.length}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Completed Courses */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">{t("completed_courses")}</h3>
                  </CardHeader>
                  <CardBody>
                    {studentCertData.completedCourses.length > 0 ? (
                      <div className="space-y-3">
                        {studentCertData.completedCourses.map((progress) => {
                          const courseTitle = progress.course.translations.find(
                            t => t.language === locale
                          )?.courseTitle || progress.course.translations.find(
                            t => t.language === 'en'
                          )?.courseTitle;
                          const hasCertificate = studentCertData.certificates.some(
                            cert => cert.courseId === progress.courseId
                          );

                          return (
                            <div key={progress.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <h4 className="font-medium">{courseTitle}</h4>
                                <p className="text-sm text-gray-600">
                                  {t("completed_on")}: {new Date(progress.updatedAt).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {t("progress")}: {Math.round(progress.progress)}%
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Chip
                                  color="success"
                                  variant="flat"
                                  size="sm"
                                >
                                  {t("completed")}
                                </Chip>
                                {hasCertificate && (
                                  <Chip
                                    color="warning"
                                    variant="flat"
                                    size="sm"
                                    startContent={<Award className="w-3 h-3" />}
                                  >
                                    {t("certified")}
                                  </Chip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">
                        {t("no_completed_courses")}
                      </p>
                    )}
                  </CardBody>
                </Card>

                {/* Certificates */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">{t("issued_certificates")}</h3>
                  </CardHeader>
                  <CardBody>
                    {studentCertData.certificates.length > 0 ? (
                      <div className="space-y-3">
                        {studentCertData.certificates.map((certificate) => {
                          const courseTitle = certificate.course.translations.find(
                            t => t.language === locale
                          )?.courseTitle || certificate.course.translations.find(
                            t => t.language === 'en'
                          )?.courseTitle;

                          return (
                            <div key={certificate.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <h4 className="font-medium">{courseTitle}</h4>
                                <p className="text-sm text-gray-600">
                                  {t("issued_on")}: {new Date(certificate.issuedAt).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {t("certificate_code")}: {certificate.certificateCode}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  onPress={() => window.open(certificate.certificateUrl, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                  {t("view")}
                                </Button>
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="flat"
                                  onPress={() => {
                                    const link = document.createElement('a');
                                    link.href = certificate.certificateUrl;
                                    link.download = `${courseTitle}_Certificate.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                  {t("download")}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">
                        {t("no_certificates_issued")}
                      </p>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="default" variant="light" onPress={onCertModalClose}>
              {t("close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
