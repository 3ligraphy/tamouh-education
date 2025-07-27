"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Input,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Award, Download, Eye, Search, Calendar, FileText, X } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";

export default function CertificatesPage() {
  const params = useParams();
  const isRTL = params.locale === "ar";
  const t = useTranslations("Certificates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);

  // Modal controls
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Get user's certificates
  const { data: certificates, isLoading } = api.certificate.getUserCertificates.useQuery();

  // Generate certificate mutation
  const generateCertificate = api.certificate.generateCertificate.useMutation({
    onSuccess: () => {
      toast.success(t("certificate_generated"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Download certificate mutation
  const downloadCertificate = api.certificate.downloadCertificate.useMutation({
    onSuccess: (data) => {
      // Create a downloadable link for PDF
      const printWindow = window.open(data.certificateUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoadingCertificate(false);
    },
  });

  // View certificate mutation  
  const viewCertificate = api.certificate.downloadCertificate.useMutation({
    onSuccess: (data) => {
      setCertificateUrl(data.certificateUrl);
      setIsLoadingCertificate(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoadingCertificate(false);
    },
  });

  // Get completed courses that might not have certificates yet
  const { data: courseProgress } = api.course.getUserProgress.useQuery();

  const handleGenerateCertificate = (courseId) => {
    generateCertificate.mutate({ courseId });
  };

  const handleDownloadCertificate = (certificateId, courseName) => {
    downloadCertificate.mutate({ certificateId });
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setIsLoadingCertificate(true);
    setCertificateUrl("");
    onOpen();
    viewCertificate.mutate({ certificateId: certificate.id });
  };

  const handleDownloadPDF = () => {
    if (certificateUrl && selectedCertificate) {
      // Create a temporary iframe to handle PDF generation
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-10000px';
      iframe.src = certificateUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        try {
          // Focus the iframe and trigger print
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } catch (error) {
          console.error('PDF download error:', error);
          // Fallback: open in new window
          window.open(certificateUrl, '_blank');
          document.body.removeChild(iframe);
        }
      };
    }
  };

  const handleModalClose = () => {
    onClose();
    setSelectedCertificate(null);
    setCertificateUrl("");
    setIsLoadingCertificate(false);
  };

  // Filter certificates based on search
  const filteredCertificates = certificates?.filter(cert => {
    const courseTitle = cert.course.translations.find(
      t => t.language === params.locale
    )?.courseTitle || '';
    
    return courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cert.certificateCode.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Get completed courses without certificates
  const completedCoursesWithoutCerts = courseProgress?.filter(progress => 
    progress.completed && 
    !certificates?.some(cert => cert.courseId === progress.courseId)
  ) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("my_certificates")}
          </h1>
          <p className="text-gray-600">
            {t("certificates_description")}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={t("search_certificates")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="w-4 h-4 text-gray-400" />}
            className="max-w-md"
          />
        </div>

        {/* Generate Certificates Section */}
        {completedCoursesWithoutCerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">{t("generate_certificates")}</h2>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 mb-4">{t("generate_certificates_description")}</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedCoursesWithoutCerts.map((progress) => {
                  const courseTitle = progress.course.translations.find(
                    t => t.language === params.locale
                  )?.courseTitle;

                  return (
                    <Card key={progress.id} className="border">
                      <CardBody>
                        <h3 className="font-semibold mb-2">{courseTitle}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("completed_on")}: {new Date(progress.updatedAt).toLocaleDateString()}
                        </p>
                        <Button
                          color="primary"
                          variant="flat"
                          onPress={() => handleGenerateCertificate(progress.courseId)}
                          isLoading={generateCertificate.isLoading}
                          className="w-full"
                        >
                          {t("generate_certificate")}
                        </Button>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Certificates Grid */}
        {filteredCertificates.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((certificate) => {
              const courseTitle = certificate.course.translations.find(
                t => t.language === params.locale
              )?.courseTitle;

              return (
                <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                  <CardBody className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Award className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                      <Chip color="success" variant="flat" size="sm">
                        {t("certified")}
                      </Chip>
                    </div>

                    <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                      {courseTitle}
                    </h3>

                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {t("issued_on")}: {new Date(certificate.issuedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{certificate.certificateCode}</span>
                      </div>
                    </div>

                    <Divider className="my-4" />

                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        variant="flat"
                        size="sm"
                        onPress={() => handleViewCertificate(certificate)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4" />
                        {t("view")}
                      </Button>
                      <Button
                        color="primary"
                        size="sm"
                        onPress={() => handleDownloadCertificate(certificate.id, courseTitle)}
                        isLoading={downloadCertificate.isLoading}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4" />
                        {t("download")}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-12">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("no_certificates")}
              </h3>
              <p className="text-gray-600">
                {searchQuery ? t("no_certificates_found") : t("complete_courses_to_earn")}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Certificate Preview Modal */}
        <Modal 
          isOpen={isOpen} 
          onClose={handleModalClose}
          size="5xl"
          scrollBehavior="inside"
          classNames={{
            base: "max-h-[90vh]",
            body: "p-0",
          }}
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-lg font-semibold">{t("certificate_preview")}</h3>
                  {selectedCertificate && (
                    <p className="text-sm text-gray-600">
                      {selectedCertificate.course.translations.find(
                        t => t.language === params.locale
                      )?.courseTitle}
                    </p>
                  )}
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="w-full h-96 md:h-[600px] bg-gray-100 rounded-lg overflow-hidden">
                {isLoadingCertificate ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Spinner size="lg" />
                      <p className="mt-4 text-gray-600">{t("certificate_loading")}</p>
                    </div>
                  </div>
                ) : certificateUrl ? (
                  <iframe
                    src={certificateUrl}
                    className="w-full h-full border-0"
                    title={t("certificate_preview")}
                    onError={() => {
                      toast.error(t("certificate_error"));
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600">{t("certificate_error")}</p>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button 
                color="danger" 
                variant="light" 
                onPress={handleModalClose}
              >
                {t("close")}
              </Button>
              <Button 
                color="primary" 
                onPress={handleDownloadPDF}
                isDisabled={!certificateUrl || isLoadingCertificate}
                startContent={<Download className="w-4 h-4" />}
              >
                {t("download_pdf")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
} 