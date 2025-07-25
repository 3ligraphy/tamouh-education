"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { FaFacebook, FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fpPromise } from "@/app/_components/fp-provider";

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export default function SigninPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const locale = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeviceConfirmation, setShowDeviceConfirmation] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState(null);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Log initial state
  useEffect(() => {
    console.log("Initial modal state:", showDeviceConfirmation);
  }, []);

  const validateField = (name, value) => {
    switch (name) {
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
        break;
      default:
        return "";
    }

    return "";
  };

  const handleInputChange = (e, name) => {
    const value = e.target.value;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (name, value) => {
    const error = validateField(name, value);

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleLogin = async (credentials, force = false) => {
    try {
      const response = await signIn("credentials", {
        ...credentials,
        force: force ? "true" : "false",
        redirect: false,
        callbackUrl: `/${locale}`,
      });

      console.log("Sign in response:", response);

      if (response?.error) {
        // For device conflict, NextAuth returns "Configuration" error
        if (response.error === "Configuration") {
          if (!force) {
            setLoginCredentials(credentials);
            setShowDeviceConfirmation(true);
            setIsLoading(false);
            return;
          }
        }

        // Map other error messages to user-friendly translations
        const errorMap = {
          "No user found": "noUserFound",
          "Incorrect password": "incorrectPassword",
          "Please verify your email before logging in": "emailNotVerified",
          "Please provide all required credentials": "invalidCredentials",
          "Account is locked": "accountLocked",
          "Too many attempts": "tooManyAttempts",
          "CredentialsSignin": "invalidCredentials"
        };

        const translationKey = errorMap[response.error] || "invalidCredentials";
        console.log("Translation key:", translationKey);
        toast.error(t(translationKey));
        setIsLoading(false);
        return;
      }

      toast.success(t("signInSuccess"));
      router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("networkError"));
      setIsLoading(false);
    }
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

    setIsLoading(true);

    try {
      const fp = await fpPromise;
      const result = await fp.get();
      const visitorId = result.visitorId;

      const deviceInfo = {
        deviceName: navigator.userAgent,
        deviceLocation: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const credentials = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        visitorId,
        deviceInfo: JSON.stringify(deviceInfo),
      };

      await handleLogin(credentials);
    } catch (error) {
      console.error("Error during login:", error);
      toast.error(t("networkError"));
      setIsLoading(false);
    }
  };

  const handleForceLogin = async () => {
    if (loginCredentials) {
      setShowDeviceConfirmation(false);
      setIsLoading(true);
      await handleLogin(loginCredentials, true);
    }
  };

  useEffect(() => {
    console.log("Modal state changed:", showDeviceConfirmation);
  }, [showDeviceConfirmation]);

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
            {t("signIn")}
          </h1>

          <div className="mb-6 grid-cols-2 gap-4 hidden">
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

          <div className="container my-4 flex items-center">
            <div className="border-b-[1px] border-solid border-primary/60 w-full" />
            <span className="content mx-[10px] text-nowrap text-primary hidden">
              {t("or")}
            </span>
            <div className="border-b-[1px] border-solid border-primary/60 w-full" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
                name="email"
                type="email"
                value={formData.email}
                variant="bordered"
                onBlur={() => handleBlur("email", formData.email)}
                onChange={(e) => handleInputChange(e, "email")}
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
                    className="bg-transparent p-0 min-w-unit-6 h-unit-6"
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
                name="password"
                type={isVisible ? "text" : "password"}
                value={formData.password}
                variant="bordered"
                onBlur={() => handleBlur("password", formData.password)}
                onChange={(e) => handleInputChange(e, "password")}
              />
            </div>

            <Button
              className="mt-2 bg-[#C96346] text-white"
              isLoading={isLoading}
              size="lg"
              type="submit"
            >
              {t("signIn")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              className="text-sm text-[#C96346] hover:text-[#C96346]/80"
              href="/forgot-password"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t("dontHaveAccount")}{" "}
            <Link
              className="font-medium text-[#C96346] hover:text-[#C96346]/80"
              href={`/${locale}/signup`}
            >
              {t("signUp")}
            </Link>
          </p>
        </div>
      </main>

      <Modal
        className="dark:bg-gray-900"
        isOpen={showDeviceConfirmation}
        onClose={() => setShowDeviceConfirmation(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-red-600">
            {t("deviceConflict.title")}
          </ModalHeader>
          <ModalBody>
            <p>{t("deviceConflict.message")}</p>
            <p className="text-sm text-gray-500">
              {t("deviceConflict.subMessage")}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => setShowDeviceConfirmation(false)}
            >
              {t("deviceConflict.goBack")}
            </Button>
            <Button
              className="bg-[#C96346]"
              color="primary"
              isLoading={isLoading}
              onPress={handleForceLogin}
            >
              {t("deviceConflict.forceLogin")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
