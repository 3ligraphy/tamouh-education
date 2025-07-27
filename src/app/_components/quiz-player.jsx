"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  Textarea,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Divider,
} from "@heroui/react";
import { Clock, CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";

export default function QuizPlayer({ quiz, lessonId, onComplete }) {
  const t = useTranslations("Quiz");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeStarted, setTimeStarted] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Initialize timer if quiz has time limit
  useEffect(() => {
    if (quiz.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
    }
  }, [quiz.timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  const submitQuiz = api.quiz.submit.useMutation({
    onSuccess: (result) => {
      setQuizResults(result);
      setShowResults(true);
      setIsSubmitting(false);
      onComplete?.(result);
      toast.success(
        result.passed ? t("quiz_passed") : t("quiz_failed")
      );
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message || t("submission_error"));
    },
  });

  const handleAutoSubmit = useCallback(() => {
    if (!isSubmitting) {
      submitQuizAnswers();
    }
  }, [isSubmitting, answers]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const submitQuizAnswers = async () => {
    setIsSubmitting(true);
    
    const formattedAnswers = quiz.questions.map((question) => {
      const answer = answers[question.id];
      
      if (question.type === "SHORT_ANSWER") {
        return {
          questionId: question.id,
          textAnswer: answer || "",
        };
      } else {
        return {
          questionId: question.id,
          selectedOptions: Array.isArray(answer) ? answer : answer ? [answer] : [],
        };
      }
    });

    const timeTaken = Math.floor((Date.now() - timeStarted) / 1000);

    await submitQuiz.mutateAsync({
      quizId: quiz.id,
      answers: formattedAnswers,
      timeTaken,
    });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / totalQuestions) * 100;
  };

  const answeredQuestions = Object.keys(answers).length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const renderQuestion = (question, locale) => {
    const questionText = question.translations.find(
      (t) => t.language === locale
    )?.questionText;
    
    const questionExplanation = question.translations.find(
      (t) => t.language === locale
    )?.questionExplanation;

    switch (question.type) {
      case "SINGLE_CHOICE":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{questionText}</h3>
              {questionExplanation && (
                <p className="text-gray-600 text-sm mb-4">{questionExplanation}</p>
              )}
            </div>
            <RadioGroup
              value={answers[question.id] || ""}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option) => {
                const optionText = option.translations.find(
                  (t) => t.language === locale
                )?.optionText;
                return (
                  <Radio key={option.id} value={option.id}>
                    {optionText}
                  </Radio>
                );
              })}
            </RadioGroup>
          </div>
        );

      case "MULTIPLE_CHOICE":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{questionText}</h3>
              {questionExplanation && (
                <p className="text-gray-600 text-sm mb-4">{questionExplanation}</p>
              )}
              <p className="text-sm text-gray-500">{t("select_multiple")}</p>
            </div>
            <CheckboxGroup
              value={answers[question.id] || []}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option) => {
                const optionText = option.translations.find(
                  (t) => t.language === locale
                )?.optionText;
                return (
                  <Checkbox key={option.id} value={option.id}>
                    {optionText}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>
          </div>
        );

      case "TRUE_FALSE":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{questionText}</h3>
              {questionExplanation && (
                <p className="text-gray-600 text-sm mb-4">{questionExplanation}</p>
              )}
            </div>
            <RadioGroup
              value={answers[question.id] || ""}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option) => {
                const optionText = option.translations.find(
                  (t) => t.language === locale
                )?.optionText;
                return (
                  <Radio key={option.id} value={option.id}>
                    {optionText}
                  </Radio>
                );
              })}
            </RadioGroup>
          </div>
        );

      case "SHORT_ANSWER":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{questionText}</h3>
              {questionExplanation && (
                <p className="text-gray-600 text-sm mb-4">{questionExplanation}</p>
              )}
            </div>
            <Textarea
              placeholder={t("enter_answer")}
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              minRows={3}
            />
          </div>
        );

      default:
        return <div>{t("unsupported_question_type")}</div>;
    }
  };

  if (showResults && quizResults) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            {quizResults.passed ? (
              <Trophy className="w-16 h-16 text-yellow-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {quizResults.passed ? t("congratulations") : t("try_again")}
              </h2>
              <p className="text-gray-600">
                {quizResults.passed ? t("quiz_passed_message") : t("quiz_failed_message")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(quizResults.score)}%
              </div>
              <div className="text-sm text-gray-600">{t("final_score")}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {quizResults.correctAnswers}/{quizResults.totalQuestions}
              </div>
              <div className="text-sm text-gray-600">{t("correct_answers")}</div>
            </div>
          </div>
          
          <Divider />
          
          <div className="text-center space-y-4">
            <Chip
              color={quizResults.passed ? "success" : "danger"}
              variant="flat"
              size="lg"
            >
              {quizResults.passed ? t("passed") : t("failed")} - 
              {t("passing_score")}: {quiz.passingScore}%
            </Chip>
            
            {!quizResults.passed && (
              <Button
                color="primary"
                variant="flat"
                startContent={<RotateCcw className="w-4 h-4" />}
                onPress={() => {
                  setShowResults(false);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                  setTimeStarted(Date.now());
                  if (quiz.timeLimit) {
                    setTimeRemaining(quiz.timeLimit * 60);
                  }
                }}
              >
                {t("retake_quiz")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">{t("quiz_title")}</h2>
              <p className="text-gray-600">
                {t("question")} {currentQuestionIndex + 1} {t("of")} {totalQuestions}
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span
                  className={`font-mono text-lg ${
                    timeRemaining < 300 ? "text-red-500" : "text-orange-500"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
          
          <Progress 
            value={getProgressPercentage()} 
            className="mb-4"
            color="primary"
          />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t("answered")}: {answeredQuestions}/{totalQuestions}</span>
            <span>{t("points")}: {currentQuestion.points}</span>
          </div>
        </CardBody>
      </Card>

      {/* Question Card */}
      <Card>
        <CardBody className="p-6">
          {renderQuestion(currentQuestion, "en")} {/* TODO: Use actual locale */}
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="bordered"
          isDisabled={currentQuestionIndex === 0}
          onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
        >
          {t("previous")}
        </Button>

        <div className="flex space-x-2">
          {isLastQuestion ? (
            <Button
              color="primary"
              onPress={onOpen}
              isDisabled={answeredQuestions === 0}
            >
              {t("submit_quiz")}
            </Button>
          ) : (
            <Button
              color="primary"
              onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              {t("next")}
            </Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{t("submit_quiz")}</ModalHeader>
          <ModalBody>
            <p>{t("submit_confirmation")}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t("answered")}:</span>
                  <span className="ml-2">{answeredQuestions}/{totalQuestions}</span>
                </div>
                <div>
                  <span className="font-medium">{t("unanswered")}:</span>
                  <span className="ml-2">{totalQuestions - answeredQuestions}</span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              onPress={() => {
                onClose();
                submitQuizAnswers();
              }}
              isLoading={isSubmitting}
            >
              {t("submit")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 