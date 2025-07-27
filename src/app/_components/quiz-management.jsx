"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Divider,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";

const questionTypes = [
  { key: "SINGLE_CHOICE", label: "Single Choice" },
  { key: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { key: "TRUE_FALSE", label: "True/False" },
  { key: "SHORT_ANSWER", label: "Short Answer" },
];

export default function QuizManagement({ lessonId, existingQuiz = null }) {
  const t = useTranslations("QuizManagement");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isEditing, setIsEditing] = useState(!existingQuiz);
  
  const [quizData, setQuizData] = useState({
    isEnabled: existingQuiz?.isEnabled ?? true,
    timeLimit: existingQuiz?.timeLimit ?? null,
    passingScore: existingQuiz?.passingScore ?? 70,
    questions: existingQuiz?.questions ?? [],
  });

  const [newQuestion, setNewQuestion] = useState({
    type: "SINGLE_CHOICE",
    points: 1,
    order: 0,
    translations: [
      { language: "en", questionText: "", questionExplanation: "" },
      { language: "ar", questionText: "", questionExplanation: "" },
    ],
    options: [],
  });

  // API mutations
  const createQuiz = api.quiz.create.useMutation({
    onSuccess: () => {
      toast.success("Quiz created successfully!");
      setIsEditing(false);
      // Refresh quiz data
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create quiz");
    },
  });

  const updateQuiz = api.quiz.update.useMutation({
    onSuccess: () => {
      toast.success("Quiz updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update quiz");
    },
  });

  const deleteQuiz = api.quiz.delete.useMutation({
    onSuccess: () => {
      toast.success("Quiz deleted successfully!");
      setQuizData({
        isEnabled: true,
        timeLimit: null,
        passingScore: 70,
        questions: [],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete quiz");
    },
  });

  const addQuestion = () => {
    const questionToAdd = {
      ...newQuestion,
      order: quizData.questions.length,
      options: newQuestion.type === "SHORT_ANSWER" ? [] : newQuestion.options,
    };

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, questionToAdd],
    }));

    // Reset new question form
    setNewQuestion({
      type: "SINGLE_CHOICE",
      points: 1,
      order: 0,
      translations: [
        { language: "en", questionText: "", questionExplanation: "" },
        { language: "ar", questionText: "", questionExplanation: "" },
      ],
      options: [],
    });
    onClose();
  };

  const removeQuestion = (index) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const addOption = () => {
    setNewQuestion(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          order: prev.options.length,
          isCorrect: false,
          translations: [
            { language: "en", optionText: "" },
            { language: "ar", optionText: "" },
          ],
        },
      ],
    }));
  };

  const updateOption = (index, field, value, language = null) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => {
        if (i === index) {
          if (language) {
            return {
              ...option,
              translations: option.translations.map(t =>
                t.language === language ? { ...t, [field]: value } : t
              ),
            };
          } else {
            return { ...option, [field]: value };
          }
        }
        return option;
      }),
    }));
  };

  const removeOption = (index) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const saveQuiz = async () => {
    try {
      if (existingQuiz) {
        await updateQuiz.mutateAsync({
          quizId: existingQuiz.id,
          quiz: quizData,
        });
      } else {
        await createQuiz.mutateAsync({
          lessonId,
          quiz: quizData,
        });
      }
    } catch (error) {
      console.error("Failed to save quiz:", error);
    }
  };

  const handleDeleteQuiz = async () => {
    if (existingQuiz && confirm("Are you sure you want to delete this quiz?")) {
      await deleteQuiz.mutateAsync({ quizId: existingQuiz.id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {existingQuiz ? "Manage Quiz" : "Create Quiz"}
          </h2>
          <div className="flex gap-2">
            {existingQuiz && !isEditing && (
              <>
                <Button
                  color="primary"
                  variant="flat"
                  onPress={() => setIsEditing(true)}
                  startContent={<Edit className="w-4 h-4" />}
                >
                  Edit
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={handleDeleteQuiz}
                  startContent={<Trash2 className="w-4 h-4" />}
                >
                  Delete
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  color="success"
                  onPress={saveQuiz}
                  isLoading={createQuiz.isPending || updateQuiz.isPending}
                  startContent={<Save className="w-4 h-4" />}
                >
                  Save Quiz
                </Button>
                {existingQuiz && (
                  <Button
                    variant="flat"
                    onPress={() => setIsEditing(false)}
                    startContent={<X className="w-4 h-4" />}
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {isEditing && (
        <>
          {/* Quiz Settings */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Quiz Settings</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    isSelected={quizData.isEnabled}
                    onValueChange={(value) =>
                      setQuizData(prev => ({ ...prev, isEnabled: value }))
                    }
                  />
                  <span>Enable Quiz</span>
                </div>
                
                <Input
                  type="number"
                  label="Time Limit (minutes)"
                  placeholder="No limit"
                  value={quizData.timeLimit?.toString() || ""}
                  onChange={(e) =>
                    setQuizData(prev => ({
                      ...prev,
                      timeLimit: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                />
                
                <Input
                  type="number"
                  label="Passing Score (%)"
                  value={quizData.passingScore.toString()}
                  onChange={(e) =>
                    setQuizData(prev => ({
                      ...prev,
                      passingScore: parseInt(e.target.value) || 70,
                    }))
                  }
                />
              </div>
            </CardBody>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Questions ({quizData.questions.length})
              </h3>
              <Button
                color="primary"
                onPress={onOpen}
                startContent={<Plus className="w-4 h-4" />}
              >
                Add Question
              </Button>
            </CardHeader>
            <CardBody>
              {quizData.questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No questions added yet. Click "Add Question" to get started.
                </div>
              ) : (
                <Accordion variant="bordered">
                  {quizData.questions.map((question, index) => (
                    <AccordionItem
                      key={index}
                      title={
                        <div className="flex justify-between items-center w-full">
                          <span>
                            Q{index + 1}: {question.translations[0]?.questionText || "Untitled"}
                          </span>
                          <div className="flex items-center gap-2">
                            <Chip size="sm" color="primary">
                              {question.type}
                            </Chip>
                            <Chip size="sm" color="secondary">
                              {question.points} pts
                            </Chip>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              isIconOnly
                              onPress={() => removeQuestion(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <div className="space-y-4">
                        <div>
                          <strong>English:</strong> {question.translations[0]?.questionText}
                        </div>
                        <div>
                          <strong>Arabic:</strong> {question.translations[1]?.questionText}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div>
                            <strong>Options:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              {question.options.map((option, optIndex) => (
                                <li
                                  key={optIndex}
                                  className={option.isCorrect ? "text-green-600 font-medium" : ""}
                                >
                                  {option.translations[0]?.optionText}
                                  {option.isCorrect && " ✓"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* Quiz Preview (when not editing) */}
      {!isEditing && existingQuiz && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Quiz Overview</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {quizData.questions.length}
                </div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {quizData.passingScore}%
                </div>
                <div className="text-sm text-gray-600">Passing Score</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {quizData.timeLimit || "∞"}
                </div>
                <div className="text-sm text-gray-600">Time Limit</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {quizData.isEnabled ? "ON" : "OFF"}
                </div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Add Question Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>Add New Question</ModalHeader>
          <ModalBody className="space-y-4">
            {/* Question Settings */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Question Type"
                selectedKeys={[newQuestion.type]}
                onSelectionChange={(keys) =>
                  setNewQuestion(prev => ({ ...prev, type: Array.from(keys)[0] }))
                }
              >
                {questionTypes.map(type => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
              
              <Input
                type="number"
                label="Points"
                min={1}
                value={newQuestion.points.toString()}
                onChange={(e) =>
                  setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))
                }
              />
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <Input
                label="Question Text (English)"
                value={newQuestion.translations[0]?.questionText || ""}
                onChange={(e) =>
                  setNewQuestion(prev => ({
                    ...prev,
                    translations: prev.translations.map(t =>
                      t.language === "en" ? { ...t, questionText: e.target.value } : t
                    ),
                  }))
                }
              />
              
              <Input
                label="Question Text (Arabic)"
                value={newQuestion.translations[1]?.questionText || ""}
                onChange={(e) =>
                  setNewQuestion(prev => ({
                    ...prev,
                    translations: prev.translations.map(t =>
                      t.language === "ar" ? { ...t, questionText: e.target.value } : t
                    ),
                  }))
                }
              />
            </div>

            {/* Options (for choice questions) */}
            {newQuestion.type !== "SHORT_ANSWER" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Answer Options</h4>
                  <Button size="sm" onPress={addOption} startContent={<Plus className="w-3 h-3" />}>
                    Add Option
                  </Button>
                </div>
                
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Option {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={option.isCorrect}
                          onValueChange={(value) => updateOption(index, "isCorrect", value)}
                        />
                        <span className="text-sm">Correct</span>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          isIconOnly
                          onPress={() => removeOption(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Input
                      size="sm"
                      placeholder="Option text (English)"
                      value={option.translations[0]?.optionText || ""}
                      onChange={(e) => updateOption(index, "optionText", e.target.value, "en")}
                    />
                    
                    <Input
                      size="sm"
                      placeholder="Option text (Arabic)"
                      value={option.translations[1]?.optionText || ""}
                      onChange={(e) => updateOption(index, "optionText", e.target.value, "ar")}
                    />
                  </div>
                ))}

                {newQuestion.type === "TRUE_FALSE" && newQuestion.options.length === 0 && (
                  <Button
                    variant="bordered"
                    onPress={() => {
                      setNewQuestion(prev => ({
                        ...prev,
                        options: [
                          {
                            order: 0,
                            isCorrect: true,
                            translations: [
                              { language: "en", optionText: "True" },
                              { language: "ar", optionText: "صحيح" },
                            ],
                          },
                          {
                            order: 1,
                            isCorrect: false,
                            translations: [
                              { language: "en", optionText: "False" },
                              { language: "ar", optionText: "خطأ" },
                            ],
                          },
                        ],
                      }));
                    }}
                  >
                    Generate True/False Options
                  </Button>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={addQuestion}
              isDisabled={
                !newQuestion.translations[0]?.questionText ||
                (newQuestion.type !== "SHORT_ANSWER" && newQuestion.options.length === 0)
              }
            >
              Add Question
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 