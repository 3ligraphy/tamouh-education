"use client";

import { Button } from "@heroui/react";
import Link from "next/link";
import Image from "next/image";

const content = {
  en: {
    title: "Page Not Found",
    description:
      "The page you are looking for does not exist or you don't have permission to access it.",
    button: "Back to Home",
  },
  ar: {
    title: "الصفحة غير موجودة",
    description:
      "الصفحة التي تبحث عنها غير موجودة أو ليس لديك صلاحية الوصول إليها.",
    button: "العودة للرئيسية",
  },
};

export default function NotFound({ params }) {
  const locale = params?.locale || "en";
  const t = content[locale] || content.en;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-8">
        <Image
          priority
          alt="404 Illustration"
          height={400}
          src="/404.svg"
          width={400}
        />
      </div>
      <h1 className="mb-4 text-4xl font-bold">{t.title}</h1>
      <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
        {t.description}
      </p>
      <Link href={`/${locale}`}>
        <Button color="primary" size="lg">
          {t.button}
        </Button>
      </Link>
    </div>
  );
}
