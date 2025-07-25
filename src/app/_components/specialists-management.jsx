"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  useDisclosure,
  Image,
  Tabs,
  Tab,
} from "@heroui/react";
import { toast } from "sonner";

import { useFileUpload } from "../_hooks/useFileUpload";

import { api } from "@/trpc/react";

export default function SpecialistsManagement() {
  const t = useTranslations("admin_dashboard");
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const { uploadFile } = useFileUpload();
  const [formData, setFormData] = useState({
    name: {
      en: "",
      ar: "",
    },
    title: {
      en: "",
      ar: "",
    },
    image: "",
    order: 0,
  });

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

  // Fetch specialists using tRPC
  const { data: specialists, refetch } = api.specialist.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { mutate: createSpecialist } = api.specialist.create.useMutation({
    onSuccess: () => {
      toast.success(t("specialists.messages.created"));
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateSpecialist } = api.specialist.update.useMutation({
    onSuccess: () => {
      toast.success(t("specialists.messages.updated"));
      refetch();
      onEditClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteSpecialist } = api.specialist.delete.useMutation({
    onSuccess: () => {
      toast.success(t("specialists.messages.deleted"));
      refetch();
      onDeleteClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleImageUpload = async (file) => {
    try {
      if (!file) {
        toast.error(t("specialists.messages.image_required"));

        return;
      }

      const { cdnUrl } = await uploadFile(file, "image");

      setFormData({ ...formData, image: cdnUrl });
      toast.success(t("specialists.messages.image_uploaded"));
    } catch (error) {
      toast.error(t("specialists.messages.image_upload_error"));
      console.error("Image upload failed:", error);
    }
  };

  const handleEdit = (specialist) => {
    setSelectedSpecialist(specialist);
    setFormData({
      name: specialist.name,
      title: specialist.title,
      image: specialist.image,
      order: specialist.order,
    });
    onEditOpen();
  };

  const handleDelete = (specialist) => {
    setSelectedSpecialist(specialist);
    onDeleteOpen();
  };

  const resetForm = () => {
    setFormData({
      name: {
        en: "",
        ar: "",
      },
      title: {
        en: "",
        ar: "",
      },
      image: "",
      order: 0,
    });
    setSelectedSpecialist(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name.en ||
      !formData.name.ar ||
      !formData.title.en ||
      !formData.title.ar
    ) {
      toast.error(t("specialists.messages.all_fields_required"));

      return;
    }

    // Validate image
    if (!formData.image) {
      toast.error(t("specialists.messages.image_required"));

      return;
    }

    if (selectedSpecialist) {
      updateSpecialist({
        id: selectedSpecialist.id,
        ...formData,
      });
    } else {
      createSpecialist(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("specialists.title")}</h2>
      </div>

      {/* Add/Edit Form */}
      <Card>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Tabs aria-label="Languages">
              <Tab key="en" title={t("languages.en")}>
                <div className="mt-4 space-y-4">
                  <Input
                    isRequired
                    label={t("specialists.form.name_en")}
                    value={formData.name.en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, en: e.target.value },
                      })
                    }
                  />
                  <Input
                    isRequired
                    label={t("specialists.form.title_en")}
                    value={formData.title.en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: { ...formData.title, en: e.target.value },
                      })
                    }
                  />
                </div>
              </Tab>
              <Tab key="ar" title={t("languages.ar")}>
                <div className="mt-4 space-y-4" dir="rtl">
                  <Input
                    isRequired
                    label={t("specialists.form.name_ar")}
                    value={formData.name.ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, ar: e.target.value },
                      })
                    }
                  />
                  <Input
                    isRequired
                    label={t("specialists.form.title_ar")}
                    value={formData.title.ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: { ...formData.title, ar: e.target.value },
                      })
                    }
                  />
                </div>
              </Tab>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label={t("specialists.form.order")}
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) })
                }
              />
              <Input
                isRequired
                accept="image/*"
                label={t("specialists.form.image")}
                type="file"
                onChange={(e) => handleImageUpload(e.target.files[0])}
              />
            </div>
            {formData.image ? (
              <div className="mt-4">
                <Image
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                  src={formData.image}
                />
              </div>
            ) : null}
            <Button color="primary" type="submit">
              {selectedSpecialist
                ? t("specialists.actions.update")
                : t("specialists.actions.create")}
            </Button>
            {selectedSpecialist ? (
              <Button
                className="ml-2"
                color="default"
                onClick={() => {
                  resetForm();
                }}
              >
                {t("specialists.actions.cancel")}
              </Button>
            ) : null}
          </form>
        </CardBody>
      </Card>

      {/* Specialists Table */}
      <Card>
        <CardBody>
          <Table aria-label="Specialists table">
            <TableHeader>
              <TableColumn>{t("specialists.table.name_en")}</TableColumn>
              <TableColumn>{t("specialists.table.name_ar")}</TableColumn>
              <TableColumn>{t("specialists.table.title_en")}</TableColumn>
              <TableColumn>{t("specialists.table.title_ar")}</TableColumn>
              <TableColumn>{t("specialists.table.order")}</TableColumn>
              <TableColumn>{t("specialists.table.image")}</TableColumn>
              <TableColumn>{t("specialists.table.actions")}</TableColumn>
            </TableHeader>
            <TableBody>
              {specialists?.map((specialist) => (
                <TableRow key={specialist.id}>
                  <TableCell>{specialist.name.en}</TableCell>
                  <TableCell dir="rtl">{specialist.name.ar}</TableCell>
                  <TableCell>{specialist.title.en}</TableCell>
                  <TableCell dir="rtl">{specialist.title.ar}</TableCell>
                  <TableCell>{specialist.order}</TableCell>
                  <TableCell>
                    <Image
                      alt={specialist.name.en}
                      className="w-16 h-16 object-cover rounded-lg"
                      src={specialist.image}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        size="sm"
                        onClick={() => handleEdit(specialist)}
                      >
                        {t("specialists.actions.edit")}
                      </Button>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleDelete(specialist)}
                      >
                        {t("specialists.actions.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>{t("specialists.delete_modal.title")}</ModalHeader>
          <ModalBody>
            {t("specialists.delete_modal.message", {
              name: selectedSpecialist?.name.en,
            })}
          </ModalBody>
          <ModalFooter>
            <Button color="default" onClick={onDeleteClose}>
              {t("specialists.actions.cancel")}
            </Button>
            <Button
              color="danger"
              onClick={() => {
                deleteSpecialist(selectedSpecialist.id);
              }}
            >
              {t("specialists.actions.confirm_delete")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
