"use client";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const t = useTranslations("About");
  const router = useRouter();
  const locale = useLocale();

  return (
    <main className="min-h-screen">
      {/* Who We Are Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 relative">
        <div className="flex flex-col items-end">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-[#FDF1EE] rounded-3xl p-8 relative">
                <div className="absolute -top-12 -left-4 w-72 h-48 overflow-hidden rounded-2xl shadow-lg">
                  <Image
                    alt="Collaboration"
                    className="object-cover w-full h-full"
                    height={200}
                    src="/about1.jpg"
                    width={300}
                  />
                </div>
                <div className="absolute -bottom-12 -right-4 w-72 h-48 overflow-hidden rounded-2xl shadow-lg">
                  <Image
                    alt="Technology"
                    className="object-cover w-full h-full"
                    height={200}
                    src="/aboutlaptop.png"
                    width={300}
                  />
                </div>
                <div className="h-64" />
              </div>
            </div>
            <div className="order-1 lg:order-2 text-right">
              <h1 className="text-4xl text-right md:text-5xl font-bold mb-6 text-primary">
                {t("whoWeAre")}
              </h1>
              <h2 className="text-2xl font-bold mb-4 light:text-gray-900">
                {t("welcomeMessage")}
              </h2>

              <button
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-semibold transition-colors"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                {t("joinButton")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="text-right">
              <h2 className="text-3xl font-bold mb-6 text-primary">
                {t("platformFeatures")}
              </h2>
              <h3 className="text-2xl font-bold mb-6 light:text-gray-900">
                {t("whatMakesTamouhSpecial")}
              </h3>
              <div className="space-y-6">
                <p className="text-gray-600 leading-relaxed">
                  {t("featureDescription1")}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t("featureDescription2")}
                </p>
              </div>
              <button
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-semibold transition-colors mt-8"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                {t("joinButton")}
              </button>
            </div>
            <div className="relative">
              <div className="bg-[#FDF1EE] rounded-3xl p-8">
                <Image
                  alt="Innovative Learning"
                  className="rounded-2xl shadow-lg"
                  height={471}
                  src="/aboutbulbs.png"
                  width={434}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-primary text-2xl md:text-3xl font-bold text-center mb-4">
            {t("benefitsTitle")}
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t("learnSmartAchieveMore")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {/* Card 1 */}
            <div className="bg-primary/10 rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                    transform: "scaleX(-1)",
                  }}
                />
                01
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit1")}</h4>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                  }}
                />
                02
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit2")}</h4>
            </div>

            {/* Card 3 */}
            <div className="bg-primary/10 rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                    transform: "scaleX(-1)",
                  }}
                />
                03
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit3")}</h4>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                  }}
                />
                04
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit4")}</h4>
            </div>

            {/* Card 5 */}
            <div className="bg-primary/10 rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                    transform: "scaleX(-1)",
                  }}
                />
                05
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit5")}</h4>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl p-8 text-right relative group hover:bg-[#FDF1EE] transition-colors">
              <span className="text-primary text-2xl font-bold absolute top-8 left-8 z-10">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    backgroundImage: "url(/Ellipse.svg)",
                  }}
                />
                06
              </span>
              <h4 className="text-xl font-bold mb-4">{t("benefit6")}</h4>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
