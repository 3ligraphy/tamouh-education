"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Button,
  Chip,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { BookOpen, Play, Award, Lock, CheckCircle, Download, Eye, Trophy } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import VideoPlayerWithTracking from "./video-player-with-tracking";
import QuizPlayer from "./quiz-player";

export default function LessonContentWithQuiz({ 
  lesson, 
  videoData, 
  locale = "en" 
}) {
  const t = useTranslations("LessonContent");
  const params = useParams();
  const router = useRouter();
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [selectedTab, setSelectedTab] = useState("video");
  const [quizResults, setQuizResults] = useState(null);
  const [shouldAutoSwitchToQuiz, setShouldAutoSwitchToQuiz] = useState(false);
  const [courseCompletionData, setCourseCompletionData] = useState(null);
  const [generatedCertificate, setGeneratedCertificate] = useState(null);
  
  // Course completion modal
  const { isOpen: isCompletionModalOpen, onOpen: onCompletionModalOpen, onOpenChange: onCompletionModalOpenChange } = useDisclosure();

  // Debug logging
  useEffect(() => {
    console.log("🎯 Lesson data:", {
      lessonId: lesson.id,
      hasQuiz: lesson.hasQuiz,
      lessonTitle: lesson.translations?.find(t => t.language === locale)?.lessonTitle,
    });
  }, [lesson, locale]);

  // Get lesson quiz if it exists - Always try to fetch, regardless of hasQuiz flag
  const { data: quiz, refetch: refetchQuiz } = api.quiz.getByLessonId.useQuery(
    { lessonId: lesson.id },
    { enabled: true } // Always enabled to check if quiz exists
  );

  // Debug quiz data
  useEffect(() => {
    console.log("🎯 Quiz data:", {
      quizExists: !!quiz,
      quizId: quiz?.id,
      questionsCount: quiz?.questions?.length || 0,
      lessonHasQuizFlag: lesson.hasQuiz,
    });
  }, [quiz, lesson.hasQuiz]);

  // Get video completion status
  const { data: videoCompletion, refetch: refetchVideoCompletion } = api.quiz.getVideoCompletion.useQuery({
    lessonId: lesson.id,
  });

  // Get quiz submissions to check if quiz was already completed
  const { data: quizSubmissions, refetch: refetchQuizSubmissions } = api.quiz.getSubmissions.useQuery(
    { quizId: quiz?.id ?? "" },
    { enabled: !!quiz?.id }
  );

  // Update course progress mutation
  const updateCourseProgress = api.course.updateCourseProgress.useMutation({
    onSuccess: (data) => {
      console.log("Course progress updated:", data);
      
      // If course is completed, automatically generate certificate and show completion modal
      if (data.courseCompleted) {
        setCourseCompletionData(data);
        generateCertificate.mutate({ courseId: lesson.unit.courseId });
      }
    },
    onError: (error) => {
      console.error("Failed to update course progress:", error);
    }
  });

  // Generate certificate mutation
  const generateCertificate = api.certificate.generateCertificate.useMutation({
    onSuccess: (certificate) => {
      console.log("Certificate generated:", certificate);
      setGeneratedCertificate(certificate);
      // Show the completion modal with certificate
      onCompletionModalOpen();
    },
    onError: (error) => {
      console.error("Failed to generate certificate:", error);
      // Still show completion modal even if certificate generation fails
      if (courseCompletionData) {
        onCompletionModalOpen();
      }
    }
  });

  // Initialize video completion state
  useEffect(() => {
    if (videoCompletion?.completed) {
      setVideoCompleted(true);
      console.log("Video marked as completed:", videoCompletion);
      
      // Check if lesson is now fully completed and update course progress
      const quizRequired = lesson.hasQuiz;
      const quizPassed = !quizRequired || (quizSubmissions && quizSubmissions.length > 0 && quizSubmissions[0].passed);
      
      if (quizPassed) {
        updateCourseProgress.mutate({
          courseId: lesson.unit.courseId,
          lessonId: lesson.id,
          completed: true,
        });
      }
    }
  }, [videoCompletion, quizSubmissions, lesson]);

  // Initialize quiz results if quiz was already completed
  useEffect(() => {
    if (quizSubmissions && quizSubmissions.length > 0) {
      const bestSubmission = quizSubmissions[0]; // Already ordered by attempt desc
      setQuizResults({
        score: bestSubmission.score,
        passed: bestSubmission.passed,
        submission: bestSubmission,
      });
      console.log("Quiz already completed:", bestSubmission);
      
      // If quiz is passed and video is completed, update course progress
      if (bestSubmission.passed && videoCompleted) {
        updateCourseProgress.mutate({
          courseId: lesson.unit.courseId,
          lessonId: lesson.id,
          completed: true,
        });
      }
    }
  }, [quizSubmissions, videoCompleted, lesson]);

  const handleVideoComplete = (completionData) => {
    console.log("Video completed callback triggered:", completionData);
    setVideoCompleted(true);
    
    // Refetch video completion to get latest data
    refetchVideoCompletion();
    
    if (lesson.hasQuiz && quiz && !quizResults) {
      // Auto-switch to quiz tab if quiz exists and hasn't been completed
      setShouldAutoSwitchToQuiz(true);
      setTimeout(() => {
        setSelectedTab("quiz");
        setShouldAutoSwitchToQuiz(false);
      }, 1500); // Small delay to show completion message
    } else if (!lesson.hasQuiz) {
      // If no quiz required, lesson is complete
      updateCourseProgress.mutate({
        courseId: lesson.unit.courseId,
        lessonId: lesson.id,
        completed: true,
      });
    }
  };

  const handleQuizComplete = (results) => {
    console.log("Quiz completed:", results);
    setQuizResults(results);
    refetchQuizSubmissions();
    
    // If quiz is passed and video is completed, update course progress
    if (results.passed && videoCompleted) {
      updateCourseProgress.mutate({
        courseId: lesson.unit.courseId,
        lessonId: lesson.id,
        completed: true,
      });
    }
  };

  // Download certificate mutation
  const downloadCertificateMutation = api.certificate.downloadCertificate.useMutation({
    onSuccess: (data) => {
      // Open the certificate URL with print dialog
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
      console.error('Failed to download certificate:', error);
    }
  });

  // View certificate mutation  
  const viewCertificateMutation = api.certificate.downloadCertificate.useMutation({
    onSuccess: (data) => {
      window.open(data.certificateUrl, '_blank');
    },
    onError: (error) => {
      console.error('Failed to view certificate:', error);
    }
  });

  const handleDownloadCertificate = () => {
    if (generatedCertificate?.id) {
      downloadCertificateMutation.mutate({ certificateId: generatedCertificate.id });
    }
  };

  const handleViewCertificate = () => {
    if (generatedCertificate?.id) {
      viewCertificateMutation.mutate({ certificateId: generatedCertificate.id });
    }
  };

  const lessonTitle = lesson.translations.find(
    (t) => t.language === locale
  )?.lessonTitle;
  
  const lessonDescription = lesson.translations.find(
    (t) => t.language === locale
  )?.lessonDescription;

  const courseTitle = lesson.unit.course.translations.find(
    (t) => t.language === locale
  )?.courseTitle;

  // Check if lesson is fully completed (video + quiz if exists)
  const hasQuizRequirement = lesson.hasQuiz || !!quiz;
  const isLessonFullyCompleted = videoCompleted && (!hasQuizRequirement || quizResults?.passed);

  // Determine available tabs
  const tabs = [
    {
      key: "video",
      title: t("video"),
      icon: <Play className="w-4 h-4" />,
      content: (
        <VideoPlayerWithTracking
          videoData={videoData}
          lessonId={lesson.id}
          lessonTitle={lessonTitle}
          onVideoComplete={handleVideoComplete}
        />
      ),
    },
    {
      key: "description",
      title: t("description"),
      icon: <BookOpen className="w-4 h-4" />,
      content: (
        <Card>
          <CardBody>
            <h1 className="text-2xl font-bold mb-4">{lessonTitle}</h1>
            <p className="text-gray-600 whitespace-pre-wrap">{lessonDescription}</p>
            
            {/* Show lesson completion requirements */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">{t("completion_requirements")}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {videoCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className={videoCompleted ? "text-green-600" : "text-gray-600"}>
                    {t("watch_video_80_percent")}
                  </span>
                </div>
                
                {(lesson.hasQuiz || quiz) && (
                  <div className="flex items-center gap-2">
                    {quizResults?.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className={quizResults?.passed ? "text-green-600" : "text-gray-600"}>
                      {t("pass_quiz_with_score", { score: quiz?.passingScore || 70 })}
                    </span>
                  </div>
                )}
              </div>
              
              {isLessonFullyCompleted && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t("lesson_completed")}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {t("can_proceed_to_next_lesson")}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ),
    },
  ];

  // Add quiz tab if lesson has quiz OR if quiz data exists in database
  if ((lesson.hasQuiz && quiz) || quiz) {
    tabs.push({
      key: "quiz",
      title: t("quiz"),
      icon: <Award className="w-4 h-4" />,
      content: videoCompleted ? (
        <div className="space-y-4">
          {/* Quiz completion notification */}
          {shouldAutoSwitchToQuiz && (
            <Card className="border-green-200 bg-green-50">
              <CardBody>
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <h3 className="font-semibold">{t("video_completed")}</h3>
                    <p className="text-sm">{t("quiz_now_available")}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
          
          <QuizPlayer
            quiz={quiz}
            lessonId={lesson.id}
            onComplete={handleQuizComplete}
          />
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("quiz_locked")}</h3>
            <p className="text-gray-600 mb-6">
              {t("complete_video_first")}
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{t("video_progress")}</span>
                <span>{Math.round(videoCompletion?.completionRate || 0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${videoCompletion?.completionRate || 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t("minimum_watch_required", { percentage: 80 })}
              </p>
            </div>
            <Button
              color="primary"
              variant="flat"
              className="mt-4"
              onPress={() => setSelectedTab("video")}
            >
              {t("continue_watching")}
            </Button>
          </CardBody>
        </Card>
      ),
    });
  }

  // Add materials tab if lesson has PDFs
  if (lesson.pdfUrl && lesson.pdfUrl.length > 0) {
    tabs.push({
      key: "materials",
      title: t("materials"),
      icon: <BookOpen className="w-4 h-4" />,
      content: (
        <Card>
          <CardBody>
            {lesson.pdfUrl.map((url, index) => (
              <div key={index} className="space-y-4 mb-8">
                <div className="flex gap-4 items-center">
                  <h3 className="text-lg font-medium">
                    {t("material")} {index + 1}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      as="a"
                      color="primary"
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                      variant="flat"
                      size="sm"
                    >
                      {t("view_pdf")}
                    </Button>
                    <Button
                      download
                      as="a"
                      color="primary"
                      href={url}
                      size="sm"
                    >
                      {t("download_pdf")}
                    </Button>
                  </div>
                </div>
                <iframe
                  className="w-full h-[600px] border rounded-lg"
                  src={url}
                  title={`${lessonTitle} - PDF ${index + 1}`}
                />
              </div>
            ))}
          </CardBody>
        </Card>
      ),
    });
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Course Completion Modal */}
      <Modal 
        isOpen={isCompletionModalOpen} 
        onOpenChange={onCompletionModalOpenChange}
        size="2xl"
        backdrop="blur"
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 items-center text-center pt-8">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  {t("congratulations")}
                </h2>
                <p className="text-lg text-gray-600">
                  {t("course_completed_successfully")}
                </p>
              </ModalHeader>
              <ModalBody className="text-center px-8">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none">
                    <CardBody className="py-6">
                      <h3 className="text-xl font-semibold mb-2">{courseTitle}</h3>
                      <p className="text-gray-600 mb-4">{t("you_have_successfully_completed")}</p>
                      
                      {courseCompletionData && (
                        <div className="flex justify-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{Math.round(courseCompletionData.progressPercentage)}%</div>
                            <div className="text-gray-500">{t("completion_rate")}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{courseCompletionData.progress?.completedLessons?.length || 0}</div>
                            <div className="text-gray-500">{t("lessons_completed")}</div>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {generatedCertificate && (
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                      <CardBody className="py-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Award className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-green-800">{t("certificate_ready")}</h4>
                            <p className="text-sm text-green-600">{t("certificate_generated_successfully")}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 justify-center">
                          <Button
                            color="success"
                            variant="flat"
                            startContent={<Eye className="w-4 h-4" />}
                            onPress={handleViewCertificate}
                            isLoading={viewCertificateMutation.isLoading}
                          >
                            {t("view_certificate")}
                          </Button>
                          <Button
                            color="success"
                            startContent={<Download className="w-4 h-4" />}
                            onPress={handleDownloadCertificate}
                            isLoading={downloadCertificateMutation.isLoading}
                          >
                            {t("download_certificate")}
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </ModalBody>
              <ModalFooter className="flex flex-col gap-3 px-8 pb-8">
                <div className="flex gap-3 w-full">
                  <Button
                    color="primary"
                    variant="flat"
                    className="flex-1"
                    as={Link}
                    href={`/${params.locale}/certificates`}
                    onPress={onClose}
                  >
                    {t("view_all_certificates")}
                  </Button>
                  <Button
                    color="primary"
                    className="flex-1"
                    as={Link}
                    href={`/${params.locale}/dashboard`}
                    onPress={onClose}
                  >
                    {t("go_to_dashboard")}
                  </Button>
                </div>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="w-full"
                >
                  {t("continue_learning")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Lesson Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start w-full">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{lessonTitle}</h1>
              <p className="text-gray-600">{lessonDescription}</p>
            </div>
            
            <div className="flex gap-2 ml-4">
              {videoCompleted && (
                <Chip color="success" variant="flat" startContent={<Play className="w-3 h-3" />}>
                  {t("video_completed")}
                </Chip>
              )}
              
              {lesson.hasQuiz && quiz && quizResults && (
                <Chip 
                  color={quizResults.passed ? "success" : "warning"} 
                  variant="flat"
                  startContent={<Award className="w-3 h-3" />}
                >
                  {t("quiz")}: {Math.round(quizResults.score)}%
                </Chip>
              )}

              {isLessonFullyCompleted && (
                <Chip color="success" variant="flat" startContent={<CheckCircle className="w-3 h-3" />}>
                  {t("completed")}
                </Chip>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <div className="w-full">
        <Tabs
          aria-label="Lesson content"
          selectedKey={selectedTab}
          onSelectionChange={setSelectedTab}
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              title={
                <div className="flex items-center space-x-2">
                  {tab.icon}
                  <span>{tab.title}</span>
                  {tab.key === "quiz" && !videoCompleted && (
                    <Lock className="w-3 h-3 text-gray-400" />
                  )}
                  {tab.key === "quiz" && quizResults?.passed && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                </div>
              }
              isDisabled={tab.key === "quiz" && !videoCompleted}
            >
              <div className="py-6">
                {tab.content}
              </div>
            </Tab>
          ))}
        </Tabs>
      </div>

      {/* Quiz Status Summary */}
      {((lesson.hasQuiz && quiz) || quiz) && videoCompleted && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium">{t("quiz_available")}</h3>
                  <p className="text-sm text-gray-600">
                    {quiz.questions.length} {t("questions")} • 
                    {quiz.timeLimit ? ` ${quiz.timeLimit} ${t("minutes")} • ` : " "}
                    {t("passing_score")}: {quiz.passingScore}%
                  </p>
                </div>
              </div>
              
              {quizResults ? (
                <div className="flex items-center gap-2">
                  <Chip
                    color={quizResults.passed ? "success" : "danger"}
                    variant="flat"
                  >
                    {quizResults.passed ? t("passed") : t("failed")} ({Math.round(quizResults.score)}%)
                  </Chip>
                  {!quizResults.passed && (
                    <Button
                      color="primary"
                      variant="flat"
                      size="sm"
                      onPress={() => setSelectedTab("quiz")}
                    >
                      {t("retake_quiz")}
                    </Button>
                  )}
                </div>
              ) : selectedTab !== "quiz" ? (
                <Button
                  color="primary"
                  variant="flat"
                  onPress={() => setSelectedTab("quiz")}
                >
                  {t("take_quiz")}
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
} 