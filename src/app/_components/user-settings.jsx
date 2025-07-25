"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Progress,
  Skeleton,
} from "@heroui/react";
import { PencilIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

export default function UserSettings() {
  const t = useTranslations("user_settings");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { data: user, isLoading, refetch } = api.user.getCurrent.useQuery();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editValueAr, setEditValueAr] = useState("");
  const [editValueEn, setEditValueEn] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFile } = useFileUpload({
    onProgress: (progress) => {
      setUploadProgress(progress);
    },
  });

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      onClose();
      setEditField(null);
      setEditValue("");
      setEditValueAr("");
      setEditValueEn("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsUploading(false);
      setUploadProgress(0);
      refetch();
      toast.success(t("messages.profile_updated"));
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message);
    },
  });

  const deleteAccount = api.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success(t("messages.account_deleted"));
      // Redirect to home page or sign out
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 space-y-6">
        {/* Profile Image Section Loading */}
        <div className="flex flex-col items-center justify-center py-8">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-32 mt-4" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>

        {/* Header Section Loading */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Basic Information Section Loading */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col items-start gap-2 bg-[#C65F50] text-white">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-4 w-72 bg-white/20" />
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Contact Information Section Loading */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col items-start gap-2 bg-[#C65F50] text-white">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-4 w-72 bg-white/20" />
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Delete Account Section Loading */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col items-start gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-32" />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <div>Error loading user data</div>;
  }

  const handleEdit = (field, value) => {
    setEditField(field);
    if (field === "instructorName") {
      setEditValueAr(
        user.instructor?.translations?.find((t) => t.language === "ar")
          ?.instructorName || ""
      );
      setEditValueEn(
        user.instructor?.translations?.find((t) => t.language === "en")
          ?.instructorName || ""
      );
    } else {
      setEditValue(value || "");
    }
    onOpen();
  };

  const handleSave = () => {
    let updateData = {};

    if (editField === "instructorName") {
      updateData = {
        instructor: {
          update: {
            translations: {
              updateMany: [
                {
                  where: { language: "ar" },
                  data: { instructorName: editValueAr },
                },
                {
                  where: { language: "en" },
                  data: { instructorName: editValueEn },
                },
              ],
            },
          },
        },
      };
    } else if (editField === "password") {
      updateData = {
        currentPassword,
        newPassword,
        confirmPassword,
      };
    } else {
      updateData = {
        [editField]: editValue,
      };
    }

    updateProfile.mutate(updateData);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (file) {
      try {
        setIsUploading(true);
        const { cdnUrl } = await uploadFile(file, "image");

        await updateProfile.mutateAsync({ avatar: cdnUrl });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error(t("messages.image_upload_failed"));
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleRemoveImage = () => {
    updateProfile.mutate({ avatar: null });
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync({ password: deletePassword });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const renderEditModal = () => {
    let inputComponent;

    switch (editField) {
      case "instructorName":
        inputComponent = (
          <div className="space-y-4">
            <Input
              label={t("instructor_info.name.label_ar")}
              value={editValueAr}
              onChange={(e) => setEditValueAr(e.target.value)}
            />
            <Input
              label={t("instructor_info.name.label_en")}
              value={editValueEn}
              onChange={(e) => setEditValueEn(e.target.value)}
            />
          </div>
        );
        break;
      case "name":
        inputComponent = (
          <Input
            label={t("basic_info.table.fields.full_name.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      case "password":
        inputComponent = (
          <div className="space-y-4">
            <Input
              label={t("basic_info.table.fields.password.current")}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label={t("basic_info.table.fields.password.new")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label={t("basic_info.table.fields.password.confirm")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        );
        break;
      case "studentType":
        inputComponent = (
          <Select
            label={t("basic_info.table.fields.student_type.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          >
            <SelectItem key="UNIVERSITY_STUDENT" value="UNIVERSITY_STUDENT">
              {t("basic_info.table.fields.student_type.university")}
            </SelectItem>
            <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
              {t("basic_info.table.fields.student_type.school")}
            </SelectItem>
          </Select>
        );
        break;
      case "email":
        inputComponent = (
          <Input
            label={t("contact_info.email.label")}
            type="email"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      case "phone":
        inputComponent = (
          <Input
            label={t("contact_info.phone.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      case "address":
        inputComponent = (
          <Input
            label={t("instructor_info.address.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      case "bio":
        inputComponent = (
          <Input
            label={t("instructor_info.bio.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      case "jobTitle":
        inputComponent = (
          <Input
            label={t("instructor_info.job_title.label")}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
        break;
      default:
        inputComponent = (
          <Input
            label={editField}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
    }

    return (
      <Modal
        classNames={{
          base: isRTL ? "rtl" : "ltr",
        }}
        isOpen={isOpen}
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader>{t("edit.title")}</ModalHeader>
          <ModalBody>{inputComponent}</ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onClose}>
              {t("edit.cancel")}
            </Button>
            <Button
              color="primary"
              isLoading={updateProfile.isLoading}
              onPress={handleSave}
            >
              {t("edit.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  const studentTypeMap = {
    UNIVERSITY_STUDENT: t("basic_info.table.fields.student_type.university"),
    SCHOOL_STUDENT: t("basic_info.table.fields.student_type.school"),
  };

  const renderDeleteModal = () => {
    return (
      <Modal
        classNames={{
          base: isRTL ? "rtl" : "ltr",
        }}
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
      >
        <ModalContent>
          <ModalHeader className="text-danger">
            {t("delete_account.modal.title")}
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              {t("delete_account.modal.description")}
            </p>
            <Input
              label={t("delete_account.modal.password")}
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              {t("delete_account.modal.cancel")}
            </Button>
            <Button
              color="danger"
              isLoading={deleteAccount.isLoading}
              variant="flat"
              onPress={handleDeleteAccount}
            >
              {t("delete_account.modal.confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <div
      className="container mx-auto px-4 space-y-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Profile Image Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative">
          <Dropdown>
            <DropdownTrigger>
              <div className="cursor-pointer group relative">
                {user.image ? (
                  <Avatar
                    alt={user.name}
                    className="w-24 h-24"
                    src={user.image}
                  />
                ) : (
                  <UserCircleIcon className="w-24 h-24 text-gray-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                  <PencilIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile picture actions">
              <DropdownItem
                key="change"
                isDisabled={isUploading}
                onClick={handleImageClick}
              >
                {isUploading
                  ? t("profile_image.uploading")
                  : t("profile_image.change")}
              </DropdownItem>
              {user.image ? (
                <DropdownItem
                  key="remove"
                  className="text-danger"
                  color="danger"
                  isDisabled={isUploading}
                  onClick={handleRemoveImage}
                >
                  {t("profile_image.remove")}
                </DropdownItem>
              ) : null}
            </DropdownMenu>
          </Dropdown>
          <input
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            type="file"
            onChange={handleImageChange}
          />
          {isUploading ? (
            <div className="absolute -bottom-8 left-0 right-0 w-full">
              <Progress
                className="max-w-[200px] mx-auto"
                color="primary"
                size="sm"
                value={uploadProgress}
              />
            </div>
          ) : null}
        </div>
        <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      {/* Account Settings Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("page_title")}</h2>
      </div>

      {/* Basic Information Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col items-start gap-2 bg-[#C65F50] text-white">
          <h3 className="text-xl font-semibold">{t("basic_info.title")}</h3>
          <p className="text-sm opacity-90">{t("basic_info.description")}</p>
        </CardHeader>
        <CardBody>
          <Table
            removeWrapper
            aria-label="Basic information table"
            classNames={{
              td: "py-5",
            }}
          >
            <TableHeader>
              <TableColumn>{t("basic_info.table.header.field")}</TableColumn>
              <TableColumn>{t("basic_info.table.header.value")}</TableColumn>
              <TableColumn>
                {t("basic_info.table.header.description")}
              </TableColumn>
            </TableHeader>
            <TableBody>
              <TableRow key="name" className="border-b">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-gray-100 p-2"
                      onClick={() => handleEdit("name", user.name)}
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    {t("basic_info.table.fields.full_name.label")}
                  </div>
                </TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t("basic_info.table.fields.full_name.description")}
                </TableCell>
              </TableRow>
              {user.role === "INSTRUCTOR" && user.instructor ? (
                <TableRow key="instructorName" className="border-b">
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full bg-gray-100 p-2"
                        onClick={() => handleEdit("instructorName")}
                      >
                        <PencilIcon className="h-4 w-4 text-gray-600" />
                      </button>
                      {t("instructor_info.name.label")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">
                        {t("instructor_info.name.arabic")}:{" "}
                        {user.instructor.translations?.find(
                          (t) => t.language === "ar"
                        )?.instructorName ||
                          t(
                            "basic_info.table.fields.student_type.not_specified"
                          )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t("instructor_info.name.english")}:{" "}
                        {user.instructor.translations?.find(
                          (t) => t.language === "en"
                        )?.instructorName ||
                          t(
                            "basic_info.table.fields.student_type.not_specified"
                          )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {t("instructor_info.name.description")}
                  </TableCell>
                </TableRow>
              ) : null}
              <TableRow key="password" className="border-b">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-gray-100 p-2"
                      onClick={() => handleEdit("password", "")}
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    {t("basic_info.table.fields.password.label")}
                  </div>
                </TableCell>
                <TableCell>******************</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t("basic_info.table.fields.password.description")}
                </TableCell>
              </TableRow>
              <TableRow key="studentType">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-gray-100 p-2"
                      onClick={() =>
                        handleEdit("studentType", user.studentType)
                      }
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    {t("basic_info.table.fields.student_type.label")}
                  </div>
                </TableCell>
                <TableCell>
                  {studentTypeMap[user.studentType] ||
                    t("basic_info.table.fields.student_type.not_specified")}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t("basic_info.table.fields.student_type.description")}
                </TableCell>
              </TableRow>
              {user.role === "INSTRUCTOR" && user.instructor ? (
                <>
                  <TableRow key="address" className="border-b">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-full bg-gray-100 p-2"
                          onClick={() =>
                            handleEdit("address", user.instructor.address)
                          }
                        >
                          <PencilIcon className="h-4 w-4 text-gray-600" />
                        </button>
                        {t("instructor_info.address.label")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.instructor.address ||
                        t("basic_info.table.fields.student_type.not_specified")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {t("instructor_info.address.description")}
                    </TableCell>
                  </TableRow>
                  <TableRow key="bio" className="border-b">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-full bg-gray-100 p-2"
                          onClick={() =>
                            handleEdit(
                              "bio",
                              user.instructor.translations?.find(
                                (t) => t.language === locale
                              )?.instructorBio
                            )
                          }
                        >
                          <PencilIcon className="h-4 w-4 text-gray-600" />
                        </button>
                        {t("instructor_info.bio.label")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.instructor.translations?.find(
                        (t) => t.language === locale
                      )?.instructorBio ||
                        t("basic_info.table.fields.student_type.not_specified")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {t("instructor_info.bio.description")}
                    </TableCell>
                  </TableRow>
                  <TableRow key="jobTitle">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-full bg-gray-100 p-2"
                          onClick={() =>
                            handleEdit(
                              "jobTitle",
                              user.instructor.translations?.find(
                                (t) => t.language === locale
                              )?.instructorJobTitle
                            )
                          }
                        >
                          <PencilIcon className="h-4 w-4 text-gray-600" />
                        </button>
                        {t("instructor_info.job_title.label")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.instructor.translations?.find(
                        (t) => t.language === locale
                      )?.instructorJobTitle ||
                        t("basic_info.table.fields.student_type.not_specified")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {t("instructor_info.job_title.description")}
                    </TableCell>
                  </TableRow>
                </>
              ) : null}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Contact Information Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col items-start gap-2 bg-[#C65F50] text-white">
          <h3 className="text-xl font-semibold">{t("contact_info.title")}</h3>
          <p className="text-sm opacity-90">{t("contact_info.description")}</p>
        </CardHeader>
        <CardBody>
          <Table
            removeWrapper
            aria-label="Contact information table"
            classNames={{
              td: "py-5",
            }}
          >
            <TableHeader>
              <TableColumn>{t("basic_info.table.header.field")}</TableColumn>
              <TableColumn>{t("basic_info.table.header.value")}</TableColumn>
              <TableColumn>
                {t("basic_info.table.header.description")}
              </TableColumn>
            </TableHeader>
            <TableBody>
              <TableRow key="email" className="border-b">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-gray-100 p-2"
                      onClick={() => handleEdit("email", user.email)}
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    {t("contact_info.email.label")}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t("contact_info.email.description")}
                </TableCell>
              </TableRow>
              <TableRow key="phone">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-gray-100 p-2"
                      onClick={() => handleEdit("phone", user.phone)}
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    {t("contact_info.phone.label")}
                  </div>
                </TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t("contact_info.phone.description")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Delete Account Section */}
      <Card className="shadow-sm">
        <CardHeader
          className={`flex flex-col ${isRTL ? "items-start" : "items-end"} gap-2`}
        >
          <h3 className="text-xl font-semibold text-danger">
            {t("delete_account.title")}
          </h3>
          <p
            className={`text-sm text-gray-600 ${isRTL ? "text-right" : "text-left"}`}
          >
            {t("delete_account.subtitle")}
          </p>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <p
            className={`text-sm text-gray-600 ${isRTL ? "text-right" : "text-left"}`}
          >
            {t("delete_account.warning")}
          </p>
          <p
            className={`text-sm text-gray-600 ${isRTL ? "text-right" : "text-left"}`}
          >
            {t("delete_account.courses_warning")}
          </p>
          <p
            className={`text-sm text-gray-600 ${isRTL ? "text-right" : "text-left"}`}
          >
            {t("delete_account.backup_info")}
          </p>
          <div className={isRTL ? "text-right" : "text-left"}>
            <Button
              color="danger"
              isDisabled={deleteAccount.isLoading}
              variant="flat"
              onPress={onDeleteOpen}
            >
              {t("delete_account.button")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {renderEditModal()}
      {renderDeleteModal()}
    </div>
  );
}
