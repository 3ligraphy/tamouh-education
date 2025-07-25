// components/sections/HeroSection.jsx
"use client";
import { Avatar, AvatarGroup, AvatarIcon, Button } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";
import { BsPlus } from "react-icons/bs";
import { useRouter } from "next/navigation";

import { HeroSVGs } from "./hero-SVGs";

export function HeroSection() {
  const t = useTranslations("Hero");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();

  return (
    <section className="w-full max-w-[80rem] mx-auto px-4 md:px-16 mt-4 md:mt-10 py-4 h-auto md:h-[26rem] rounded-3xl bg-[#C963464D] relative overflow-hidden">
      <div
        className={`flex flex-col md:${isRTL ? "flex-row" : "flex-row-reverse"} justify-center w-full items-center md:items-stretch h-full gap-8 md:gap-0`}
      >
        {/* Text Content */}
        <div
          className={`flex flex-col ${isRTL ? "text-right" : "text-left"} max-w-xl relative z-10 justify-between py-6 md:py-12`}
        >
          <div className="space-y-4 md:space-y-6">
            <h1
              className={`text-2xl md:text-[2.7rem] font-bold leading-relaxed ${isRTL ? "font-aref" : ""}`}
            >
              {locale === "ar" ? (
                <>
                  ان لم تكن <span className="text-[#C96346]">طموحاً</span> على
                  مستقبلك ، فلن تصل الى ما تريد ، اسعَ فما سعى لله ساعِ ، إلا
                  بلغ.
                </>
              ) : (
                <>
                  If you&apos;re not moving{" "}
                  <span className="text-[#C96346]">forward</span> on your path,
                  you won&apos;t reach what you want. Strive in God&apos;s way,
                  and you&apos;ll succeed.
                </>
              )}
            </h1>
            <p
              className={`text-base md:text-lg text-foreground-600 ${isRTL ? "font-aref" : ""}`}
            >
              {t("author")}
            </p>
          </div>

          <div className="flex flex-row mt-6 md:mt-0">
            <Button
              className={`w-fit !bg-[#C96346] transition-all duration-300 text-white hover:text-[#C96346] border-none hover:!bg-[#ffe1d9] ${isRTL ? "" : ""}`}
              size="lg"
              onPress={() => router.push(`/${locale}/about`)}
            >
              {t("exploreButton")}
            </Button>
            <div className="hidden md:block absolute right-[8rem] bottom-5">
              <svg
                fill="none"
                height="105"
                viewBox="0 0 377 105"
                width="377"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.32611 78.9272C16.666 77.5239 28.1906 73.893 39.3069 69.0272C41.6912 67.9842 43.185 70.7391 41.4146 72.0721C34.3249 77.4149 26.1785 81.0893 17.4049 83.4562C39.3825 89.323 65.1144 94.481 86.303 82.4649C103.827 72.5276 105.588 53.9219 115.881 40.0008C124.739 28.0196 140.67 20.1192 154.632 30.2969C160.996 34.9353 164.701 41.6028 167.54 48.1282C170.733 55.4695 173.633 76.5317 186.733 75.7622C199.75 74.9985 207.336 61.2386 210.166 52.5652C213.205 43.2521 213.801 33.6159 217.532 24.4057C222.982 10.9481 237.511 -2.24353 255.959 1.03428C274.26 4.2855 287.878 20.3186 296.006 32.9323C300.887 40.5068 304.546 48.6155 307.219 56.9665C308.383 60.6026 308.924 64.5641 310.506 68.0652C312.035 71.4495 313.961 76.1432 320.991 72.167C323.616 70.6819 326.063 65.2242 327.507 62.9937C334.048 52.8873 337.994 42.3587 343.098 31.8518C345.749 26.3939 351.091 20.0877 359.134 20.3895C367.51 20.7038 372.309 28.8187 374.529 34.4126C377.644 42.2629 376.864 50.3216 373.053 58.1783C372.549 59.2201 370.793 58.5877 371.189 57.568C373.403 51.8346 374.103 45.9628 372.755 40.1869C371.522 34.8984 363.309 16.795 351.125 27.6792C347.618 30.8122 346.488 36.7345 344.974 40.5362C343.141 45.1364 341.075 49.6803 338.756 54.1479C335.114 61.162 325.458 85.0955 311.492 78.2619C306.46 75.7995 304.701 70.3835 303.34 66.0008C300.515 56.9183 297.673 48.1454 292.831 39.688C284.763 25.5925 261.239 -4.44318 237.54 9.33922C217.612 20.9283 221.891 44.3522 213.826 60.7925C208.869 70.8967 195.693 84.4669 180.713 81.0146C173.841 79.4309 170.782 73.7287 168.391 68.7242C164.43 60.4413 162.431 51.4461 157.562 43.4864C150.621 32.1408 137.106 26.1301 125.085 38.9374C118.948 45.476 116.067 53.6586 112.708 61.228C105.867 76.6379 95.6981 88.9192 75.82 94.2421C56.2527 99.4828 36.5987 96.0577 18.0082 91.3126C19.8191 94.3144 21.1652 97.5044 21.7965 100.847C22.5049 104.601 15.3098 106.362 13.7787 102.789C10.7893 95.8219 7.61591 89.9686 1.30424 84.6489C-0.958707 82.7407 1.33464 79.268 4.32611 78.9272Z"
                  fill="#C96346"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Avatar Group */}
        <div
          className={`bg-white/35 px-4 md:pr-8 md:pl-32 py-4 md:py-6 z-10 backdrop-blur-sm flex self-center md:self-end md:ml-[21rem] rounded-3xl items-start gap-2 flex-col-reverse`}
        >
          <AvatarGroup className="z-10">
            <Avatar
              classNames={{
                base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B] border-2 border-[#D4694C]",
                icon: "text-black/80",
              }}
              icon={<AvatarIcon />}
              src="https://i.pravatar.cc/150?u=1"
            />
            <Avatar
              classNames={{
                base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B] border-2 border-[#D4694C]",
                icon: "text-black/80",
              }}
              src="https://i.pravatar.cc/150?u=2"
            />
            <Avatar
              classNames={{
                base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B] border-2 border-[#D4694C]",
                icon: "text-black/80",
              }}
              src="https://i.pravatar.cc/150?u=3"
            />
            <Avatar
              classNames={{
                base: "bg-[#D4694C] border-2 border-[#D4694C]",
                icon: "text-white/80",
              }}
              icon={<BsPlus className="w-5 h-5" />}
            />
          </AvatarGroup>
          <p
            className={`text-sm font-bold text-foreground-600 ${isRTL ? "font-arabic" : ""}`}
          >
            {t("specialistsCount", { count: 200 })}
          </p>
        </div>
        {/* Background Icons */}
        <div className="absolute px-4 left-0 top-0 opacity-50 md:opacity-100">
          <HeroSVGs />
        </div>
      </div>
    </section>
  );
}
