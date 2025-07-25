"use client";
import React from "react";
import { Select, SelectItem } from "@heroui/select";
import { useLocale } from "next-intl";

import { useRouter, usePathname } from "@/i18n/routing";

const LanguageSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const locales = ["en", "ar"];
  const currentLocale = useLocale();

  const handleSelectionChange = (e) => {
    const locale = e.target.value;

    router.replace(pathname, { locale: locale });
  };

  return (
    <Select
      aria-label="language"
      className="min-w-24"
      classNames={{
        trigger: "rounded-full",
      }}
      defaultSelectedKeys={[currentLocale]}
      selectionMode="single"
      variant="bordered"
      onChange={handleSelectionChange}
    >
      {locales?.map((locale) => (
        <SelectItem
          key={locale}
          aria-label={currentLocale}
          className="text-small"
          value={locale}
        >
          {locale === "en" ? "EN" : "عربي"}
        </SelectItem>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
