// components/sections/Testimonials.tsx
"use client";
import { useTranslations } from "next-intl";

import { AnimatedTestimonials } from "./testimonials";

export function TestimonialsSection() {
  const t = useTranslations("Testimonials");

  const testimonials = [
    {
      quote:
        "المنصة ممتازة وساعدتني في تطوير مهاراتي البرمجية. المحتوى التعليمي عالي الجودة والمدربين متميزين.",
      name: "أحمد الشمري",
      designation: "مدير التقنية في شركة تقنيات المستقبل",
      src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=3560&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      rating: 5,
    },
    {
      quote:
        "تجربة تعليمية فريدة من نوعها. الدورات التدريبية شاملة ومفيدة جداً لتطوير المهارات المهنية.",
      name: "نورة القحطاني",
      designation: "مديرة التطوير في مجموعة الخليج للتقنية",
      src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      rating: 5,
    },
    {
      quote:
        "منصة طموح ساعدتني في تحقيق أهدافي المهنية. المحتوى عملي ومفيد جداً في مجال عملي.",
      name: "عبدالله العتيبي",
      designation: "مدير العمليات في شركة الرياض للحلول الرقمية",
      src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      rating: 5,
    },
    {
      quote:
        "الدعم الفني ممتاز والمحتوى التعليمي يواكب أحدث التقنيات. أنصح بها بشدة لكل من يريد التطور.",
      name: "سارة الهاشمي",
      designation: "رئيسة قسم البرمجة في شركة دبي للتقنيات",
      src: "https://images.unsplash.com/photo-1664575602554-2087b04935a5?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      rating: 5,
    },
    {
      quote:
        "منصة متكاملة تلبي احتياجات السوق العربي. المدربين متميزين والمحتوى عالي الجودة.",
      name: "محمد السالم",
      designation: "المدير التنفيذي لشركة المستقبل للبرمجيات",
      src: "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=2592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      rating: 5,
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h4 className="text-primary-500 mb-2">{t("subtitle")}</h4>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="mt-4 text-foreground-600">{t("description")}</p>
      </div>

      <AnimatedTestimonials testimonials={testimonials} />
    </section>
  );
}
