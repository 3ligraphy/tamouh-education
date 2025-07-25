"use client";

import { Card, CardBody, Button, Image, Input } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { useFileUpload } from "@/app/_hooks/useFileUpload";

export default function CreditPurchasePage() {
  const t = useTranslations("Credits");
  const router = useRouter();
  const params = useParams();
  const [amount, setAmount] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile, isUploading, progress } = useFileUpload();

  const requestCredit = api.wallet.requestCredit.useMutation({
    onSuccess: () => {
      toast.success(t("requestSubmitted"), {
        description: t("redirectingToWallet"),
      });
      // Show success message and redirect
      router.push(`/${params.locale}/`);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      const { cdnUrl } = await uploadFile(file, "image");

      setInvoiceUrl(cdnUrl);
    } catch (error) {
      console.error("Failed to upload invoice:", error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!amount || !invoiceUrl) return;

    setIsSubmitting(true);
    try {
      await requestCredit.mutateAsync({
        amount: parseFloat(amount),
        invoiceUrl,
      });
    } catch (error) {
      console.error("Failed to request credit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="absolute min-h-screen w-full inset-0 top-0 bg-no-repeat"
        style={{
          backgroundImage: "url(/subtop.svg)",
        }}
      />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-12">{t("heading")}</h1>

        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <CardBody>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-center">
                    {t("purchaseCredits")}
                  </h2>
                  <p className="text-gray-600 mb-6 text-center">
                    {t("oneToOneRate")}
                  </p>
                </div>

                <Input
                  endContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">KWD</span>
                    </div>
                  }
                  label={t("amount")}
                  min="1"
                  placeholder={t("enterAmount")}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("invoice")}</label>
                  <div className="flex items-center justify-center w-full">
                    <label
                      aria-label={t("invoice")}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-300 ease-in-out"
                      htmlFor="invoice-upload"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 mb-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 20 16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">
                            {t("clickToUpload")}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("imageOrPdf")}
                        </p>
                      </div>
                      <input
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={isUploading}
                        id="invoice-upload"
                        type="file"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  {invoiceUrl ? (
                    <p className="text-sm text-green-600">
                      {t("fileUploaded")}
                    </p>
                  ) : null}
                  {isUploading ? (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                <Button
                  className="w-full bg-primary text-white"
                  isDisabled={!amount || !invoiceUrl || isUploading}
                  isLoading={isSubmitting}
                  size="lg"
                  onPress={handleSubmitRequest}
                >
                  {t("submit")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Steps Section */}
        <section className="mt-20" dir="ltr">
          <h2 className="text-3xl font-bold text-center mb-16 text-primary">
            {t("steps.title")}
          </h2>

          <div className="flex flex-col gap-16 max-w-6xl mx-auto px-4">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1" dir="rtl">
                <h3 className="text-2xl font-semibold mb-4 text-primary">
                  {t("steps.step1.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t("steps.step1.description")}
                </p>
              </div>
              <div className="p-8" />
              <div className="w-full md:w-1/3">
                <div className="rounded-3xl">
                  <Image
                    alt="Step 1"
                    className="w-full h-full"
                    src="/step1.svg"
                  />
                </div>
              </div>
            </div>

            {/* Step 2
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="flex-1" dir="rtl">
                <h3 className="text-2xl font-semibold mb-4 text-primary">
                  {t("steps.step2.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t("steps.step2.description")}
                </p>
              </div>
              <div className="p-14" />
              <div className="w-full md:w-1/3">
                <div className="rounded-3xl">
                  <Image
                    alt="Step 2"
                    className="w-full h-full"
                    src="/step2.svg"
                  />
                </div>
              </div>
              </div> */}

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-auto" dir="rtl">
                <h3 className="text-2xl font-semibold mb-4 text-primary">
                  {t("steps.step3.title")}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {t("steps.step3.description")}
                </p>
                <Card className="rounded-2xl space-y-3 dark:bg-gray-200/50 p-4 border border-gray-200">
                  <p className="text-gray-700 dark:text-white font-medium">
                    {t("steps.step3.bankName")}
                  </p>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-white">
                      <span className="font-medium">IBAN:</span>{" "}
                      KW08KFHO0000000000691050017660
                    </p>
                    <div className="border-t border-gray-200 my-2" />
                    <p className="text-gray-700 dark:text-white">
                      <span className="font-medium">{t("wamadh")}:</span>{" "}
                      60010730
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm mt-4 bg-yellow-50/90 p-2 rounded">
                    {t("steps.step3.note")}
                  </p>
                </Card>
              </div>
              <div className="p-14" />
              <div className="w-full md:w-1/3">
                <div className="rounded-3xl">
                  <Image
                    alt="Step 3"
                    className="w-full h-full"
                    src="/step3.svg"
                  />
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="flex-1" dir="rtl">
                <h3 className="text-2xl font-semibold mb-4 text-primary">
                  {t("steps.step4.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t("steps.step4.description")}
                </p>
              </div>
              <div className="px-16" />
              <div className="w-full md:w-1/3">
                <div className="rounded-3xl">
                  <Image
                    alt="Step 4"
                    className="w-full h-full"
                    src="/step4.svg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
