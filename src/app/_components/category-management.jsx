"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardBody,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
  Image,
} from "@heroui/react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

export default function CategoryManagement() {
  const t = useTranslations("category_management");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { uploadFile, isUploading, progress } = useFileUpload();
  const [formData, setFormData] = useState({
    translations: {
      en: { categoryName: "" },
      ar: { categoryName: "" },
    },
    image: "/logo.svg",
  });

  const utils = api.useUtils();
  const { data: categories, isLoading } = api.category.getAll.useQuery();

  // Add console logging
  console.log("Categories data:", categories);

  const createCategory = api.category.create.useMutation({
    onSuccess: () => {
      toast.success(t("success.create"));
      utils.category.getAll.invalidate();
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: () => {
      toast.success(t("success.update"));
      utils.category.getAll.invalidate();
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCategory = api.category.delete.useMutation({
    onSuccess: () => {
      toast.success(t("success.delete"));
      utils.category.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setFormData({
      translations: {
        en: { categoryName: "" },
        ar: { categoryName: "" },
      },
      image: "/logo.svg",
    });
    onClose();
  };

  const getTranslation = (category, language, field = "categoryName") => {
    if (!category?.translations?.length) return "";
    const translation = category.translations.find(
      (t) => t.language === language
    );

    return translation?.[field] ?? "";
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setFormData({
      translations: {
        en: {
          categoryName: getTranslation(category, "en", "categoryName"),
        },
        ar: {
          categoryName: getTranslation(category, "ar", "categoryName"),
        },
      },
      image: category.image || "/logo.svg",
    });
    onOpen();
  };

  const handleSubmit = () => {
    const payload = {
      translations: [
        { language: "en", ...formData.translations.en },
        { language: "ar", ...formData.translations.ar },
      ],
      image: formData.image,
    };

    if (selectedCategory) {
      updateCategory.mutate({ id: selectedCategory.id, ...payload });
    } else {
      createCategory.mutate(payload);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      const { cdnUrl } = await uploadFile(file, "image");

      setFormData({
        ...formData,
        image: cdnUrl,
      });
      toast.success(t("success.image_upload"));
    } catch (error) {
      toast.error(t("error.image_upload"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button color="primary" onPress={onOpen}>
          {t("actions.create")}
        </Button>
      </div>

      <Card>
        <CardBody>
          <Table aria-label="Categories table">
            <TableHeader>
              <TableColumn>{t("table.image")}</TableColumn>
              <TableColumn>{t("table.name_en")}</TableColumn>
              <TableColumn>{t("table.name_ar")}</TableColumn>
              <TableColumn>{t("table.actions")}</TableColumn>
            </TableHeader>
            <TableBody emptyContent={t("table.no_data")} isLoading={isLoading}>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Image
                      alt={getTranslation(category, "en", "categoryName")}
                      className="rounded-lg"
                      height={40}
                      src={category.image || "/logo.svg"}
                      width={40}
                    />
                  </TableCell>
                  <TableCell>
                    {getTranslation(category, "en", "categoryName")}
                  </TableCell>
                  <TableCell>
                    {getTranslation(category, "ar", "categoryName")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        size="sm"
                        variant="light"
                        onPress={() => handleEditCategory(category)}
                      >
                        {t("actions.edit")}
                      </Button>
                      <Button
                        color="danger"
                        size="sm"
                        variant="light"
                        onPress={() =>
                          deleteCategory.mutate({ id: category.id })
                        }
                      >
                        {t("actions.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} size="2xl" onClose={handleCloseModal}>
        <ModalContent>
          <ModalHeader>
            {selectedCategory ? t("modal.edit_title") : t("modal.create_title")}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("form.english")}</h3>
                <Input
                  label={t("form.name")}
                  value={formData.translations.en.categoryName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        en: {
                          ...formData.translations.en,
                          categoryName: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("form.arabic")}</h3>
                <Input
                  label={t("form.name")}
                  value={formData.translations.ar.categoryName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        ar: {
                          ...formData.translations.ar,
                          categoryName: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("form.image")}</h3>
                <div className="relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-gray-400">
                  {formData.image ? (
                    <Image
                      alt="Category"
                      className="rounded-lg"
                      height={100}
                      src={formData.image}
                      width={100}
                    />
                  ) : null}
                  <input
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={isUploading}
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {isUploading ? t("form.uploading") : t("form.drag_drop")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("form.image_requirements")}
                    </p>
                  </div>
                  {isUploading ? (
                    <Progress
                      aria-label="Upload Progress"
                      className="w-full"
                      color="primary"
                      value={progress}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={handleCloseModal}>
              {t("actions.cancel")}
            </Button>
            <Button color="primary" onPress={handleSubmit}>
              {selectedCategory ? t("actions.update") : t("actions.create")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
