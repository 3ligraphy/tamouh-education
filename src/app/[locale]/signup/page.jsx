"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import {
  FaFacebook,
  FaUser,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import PhoneInput from "@/app/_components/phone-input";
import { api } from "@/trpc/react";
import { fpPromise } from "@/app/_components/fp-provider";

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export default function SignupPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    studentType: "",
    phone: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    studentType: "",
    phone: "",
  });

  const validateField = (name, value) => {
    switch (name) {
      case "fullName":
        if (!value.trim()) {
          return t("fullNameRequired");
        }
        if (value.trim().length < 2) {
          return t("fullNameTooShort");
        }
        break;
      case "email":
        if (!value) {
          return t("emailRequired");
        }
        if (!EMAIL_REGEX.test(value)) {
          return t("invalidEmail");
        }
        break;
      case "password":
        if (!value) {
          return t("passwordRequired");
        }
        if (value.length < 6) {
          return t("passwordTooShort");
        }
        if (!/\d/.test(value)) {
          return t("passwordRequiresNumber");
        }
        break;
      case "studentType":
        if (!value) {
          return t("studentTypeRequired");
        }
        break;
      case "phone":
        if (!value) {
          return t("phoneRequired");
        }
        // PhoneInput validates the phone number format automatically
        break;
      default:
        return "";
    }

    return "";
  };

  const handleInputChange = (e, name) => {
    const value = e?.target?.value ?? e;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (name, value) => {
    const error = validateField(name, value);

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const signupMutation = api.auth.signup.useMutation({
    onSuccess: async (data) => {
      toast.success(t("accountCreated"));
      try {
        const fp = await fpPromise;
        const fpResult = await fp.get();
        const visitorId = fpResult.visitorId;

        const deviceInfo = {
          deviceName: navigator.userAgent,
          deviceLocation: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        const result = await signIn("credentials", {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          visitorId: visitorId,
          deviceInfo: JSON.stringify(deviceInfo),
          redirect: false,
        });

        if (result?.error) {
          const errorMap = {
            "No user found": "noUserFound",
            "Incorrect password": "incorrectPassword",
            "Please verify your email before logging in": "emailNotVerified",
            "Please provide all required credentials": "invalidCredentials",
            "Configuration": "Configuration",
            "Account is locked": "accountLocked",
            "Too many attempts": "tooManyAttempts",
          };

          const translationKey = errorMap[result.error] || "somethingWentWrong";
          toast.error(t(translationKey));
          return;
        }

        router.push("/");
      } catch (error) {
        console.error("Error during auto-signin:", error);
        toast.error(t("errorSigningIn"));
      }
    },
    onError: (error) => {
      console.error("Signup error:", error);
      
      // Handle Zod validation errors
      if (error.data?.zodError) {
        const fieldErrors = error.data.zodError.fieldErrors;
        const errorMessages = [];

        Object.entries(fieldErrors).forEach(([field, errors]) => {
          if (errors && errors.length > 0) {
            // Map field names to translation keys
            const fieldMap = {
              fullName: "fullNameRequired",
              email: "emailRequired",
              password: "passwordRequired",
              studentType: "studentTypeRequired",
              phone: "phoneRequired",
            };

            // Use the first error message for each field
            errorMessages.push(t(fieldMap[field] || errors[0]));
          }
        });

        // Show all validation errors in sequence
        errorMessages.forEach((message, index) => {
          setTimeout(() => {
            toast.error(message);
          }, index * 500); // Stagger the messages by 500ms
        });

        return;
      }

      // Handle specific error cases
      const errorMap = {
        CONFLICT: "emailAlreadyExists",
        UNAUTHORIZED: "unauthorizedAccess",
        NOT_FOUND: "resourceNotFound",
        FORBIDDEN: "accessDenied",
      };

      const errorMessage = error.message || t("errorCreatingAccount");
      toast.error(t(errorMap[error.code] || errorMessage));
    },
  });

  const toggleVisibility = () => setIsVisible(!isVisible);

  const validateForm = () => {
    const newErrors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
      studentType: validateField("studentType", formData.studentType),
      phone: validateField("phone", formData.phone),
    };

    setErrors(newErrors);

    // Return true if no errors (all error messages are empty strings)
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = Object.values(errors).find(Boolean);
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    try {
      const fp = await fpPromise;
      const result = await fp.get();
      const visitorId = result.visitorId;

      const deviceInfo = {
        deviceName: navigator.userAgent,
        deviceLocation: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      signupMutation.mutate({
        ...formData,
        email: formData.email.toLowerCase().trim(),
        visitorId,
        deviceInfo,
      });
    } catch (error) {
      console.error("Error getting visitor ID:", error);
      toast.error(t("networkError"));
    }
  };

  return (
    <>
      <div
        className="absolute min-h-screen inset-0 -top-32 -z-10 bg-no-repeat"
        style={{
          backgroundImage: "url(/subtop.svg)",
        }}
      />
      <main className="flex min-h-screen items-center justify-center bg-[#F5E8E4]/10 p-4">
        <div className="w-full max-w-md rounded-lg bg-white/60 dark:bg-black/60 p-8 shadow-md">
          <h1 className="mb-6 text-center text-2xl font-bold text-[#C96346]">
            {t("createAccount")}
          </h1>

          <div className="mb-6  grid-cols-2 gap-4 hidden">
            <Button
              className="w-full"
              startContent={<FcGoogle className="text-xl" />}
              variant="bordered"
              onPress={() => signIn("google")}
            >
              {t("signInWithGoogle")}
            </Button>

            <Button
              className="w-full"
              startContent={<FaFacebook className="text-xl text-[#1877F2]" />}
              variant="bordered"
              onPress={() => signIn("facebook")}
            >
              {t("signInWithFacebook")}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary" />
            </div>
            <div className="relative justify-center text-sm hidden">
              <span className="bg-white px-2 text-gray-500">{t("or")}</span>
            </div>
          </div>

          <form className="flex flex-col pt-2 gap-4" onSubmit={handleSubmit}>
            <div>
              <Input
                isRequired
                classNames={{
                  label: "text-default-600",
                  input: "text-default-600",
                  inputWrapper: "focus-within:border-[#C96346]",
                }}
                endContent={
                  <FaUser className="text-default-400 text-xl flex-shrink-0" />
                }
                errorMessage={errors.fullName}
                isInvalid={!!errors.fullName}
                label={t("fullName")}
                type="text"
                value={formData.fullName}
                variant="bordered"
                onBlur={() => handleBlur("fullName", formData.fullName)}
                onChange={(e) => handleInputChange(e, "fullName")}
              />
            </div>

            <div>
              <Input
                isRequired
                classNames={{
                  label: "text-default-600",
                  input: "text-default-600",
                  inputWrapper: "focus-within:border-[#C96346]",
                }}
                endContent={
                  <FaEnvelope className="text-default-400 text-xl flex-shrink-0" />
                }
                errorMessage={errors.email}
                isInvalid={!!errors.email}
                label={t("email")}
                type="email"
                value={formData.email}
                variant="bordered"
                onBlur={() => handleBlur("email", formData.email)}
                onChange={(e) => handleInputChange(e, "email")}
              />
            </div>

            <div>
              <PhoneInput
                isRequired
                errorMessage={errors.phone}
                isInvalid={!!errors.phone}
                label={t("phone")}
                value={formData.phone}
                onChange={(value) => handleInputChange(value, "phone")}
              />
            </div>

            <div>
              <Input
                isRequired
                classNames={{
                  label: "text-default-600",
                  input: "text-default-600",
                  inputWrapper: "focus-within:border-[#C96346]",
                }}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <FaEyeSlash className="pointer-events-none text-default-400 text-xl" />
                    ) : (
                      <FaEye className="pointer-events-none text-default-400 text-xl" />
                    )}
                  </button>
                }
                errorMessage={errors.password}
                isInvalid={!!errors.password}
                label={t("password")}
                type={isVisible ? "text" : "password"}
                value={formData.password}
                variant="bordered"
                onBlur={() => handleBlur("password", formData.password)}
                onChange={(e) => handleInputChange(e, "password")}
              />
            </div>

            <div>
              <Select
                isRequired
                classNames={{
                  label: "text-default-600",
                  value: "text-default-600",
                  trigger: "focus-within:border-[#C96346]",
                }}
                errorMessage={errors.studentType}
                isInvalid={!!errors.studentType}
                label={t("studentType")}
                value={formData.studentType}
                variant="bordered"
                onBlur={() => handleBlur("studentType", formData.studentType)}
                onChange={(e) => handleInputChange(e, "studentType")}
              >
                <SelectItem key="UNIVERSITY_STUDENT" value="UNIVERSITY_STUDENT">
                  {t("universityStudent")}
                </SelectItem>
                <SelectItem key="SCHOOL_STUDENT" value="SCHOOL_STUDENT">
                  {t("schoolStudent")}
                </SelectItem>
              </Select>
            </div>

            <Button
              className="mt-2 bg-[#C96346] text-white"
              isLoading={signupMutation.isLoading}
              size="lg"
              type="submit"
            >
              {t("signUp")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t("alreadyHaveAccount")}{" "}
            <Link
              className="font-medium text-[#C96346] hover:text-[#C96346]/80"
              href="/signin"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
