"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardBody,
  Tab,
  Tabs,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@heroui/react";
import { BookOpenIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

import { api } from "@/trpc/react";
import CreateCourses from "@/app/_components/create-courses";
import { InstructorCourses } from "@/app/_components/instructor-courses";

export default function InstructorDashboard() {
  const t = useTranslations("instructor_dashboard");
  const [selected, setSelected] = useState("my_courses");
  const [isOpen, setIsOpen] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Fetch instructor permissions
  const { data: permissions } = api.instructor.getMyPermissions.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Add a helper to check if a tab is in the More menu
  const isMoreMenuItem = (key) => {
    return ["create_course"].includes(key);
  };

  const handleTabChange = (key) => {
    if (key === "more") {
      setIsMoreMenuOpen(true);
    } else {
      setSelected(key);
      if (!isOpen) setIsOpen(true);
    }
  };

  const handleMoreOptionSelect = (key) => {
    setSelected(key);
    setIsMoreMenuOpen(false);
  };

  const renderContent = () => {
    switch (selected) {
      case "my_courses":
        return <InstructorCourses />;
      case "create_course":
        return <CreateCourses />;
      default:
        return <div>{t("coming_soon")}</div>;
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* Side Navigation - Hidden on Mobile */}
      <motion.div
        ref={sidebarRef}
        animate={{ width: isOpen ? 256 : 53 }}
        className="relative hidden md:block"
        initial={{ width: 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Card className="h-full rounded-none">
          <CardBody className="flex flex-col p-0">
            <Tabs
              aria-label="Instructor Dashboard Navigation"
              className="flex flex-col p-0"
              classNames={{
                tabList: "flex-col h-full",
                cursor: "w-full",
                tab: "justify-start h-12",
              }}
              selectedKey={selected}
              variant="light"
              onSelectionChange={handleTabChange}
            >
              <Tab
                key="my_courses"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <BookOpenIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("my_courses")}
                    </span>
                  </motion.p>
                }
              />
              {permissions?.permissions?.canCreateCourses ? (
                <Tab
                  key="create_course"
                  title={
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                      transition={{ duration: 0.2 }}
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      <span className={!isOpen ? "hidden" : ""}>
                        {t("create_course")}
                      </span>
                    </motion.p>
                  }
                />
              ) : null}
            </Tabs>
          </CardBody>
        </Card>
      </motion.div>

      {/* Main Content - Adjusted padding for mobile */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-divider md:hidden">
        <Tabs
          aria-label="Mobile Instructor Dashboard Navigation"
          className="w-full"
          classNames={{
            tabList: "flex justify-around",
            cursor: "w-full",
            tab: "flex-1 h-16 py-2",
          }}
          selectedKey={isMoreMenuItem(selected) ? "more" : selected}
          variant="light"
          onSelectionChange={handleTabChange}
        >
          <Tab
            key="my_courses"
            title={
              <div className="flex flex-col items-center gap-1">
                <BookOpenIcon className="h-5 w-5" />
                <span className="text-xs">{t("my_courses")}</span>
              </div>
            }
          />
          {permissions?.permissions?.canCreateCourses ? (
            <Tab
              key="more"
              title={
                <div className="flex flex-col items-center gap-1">
                  <PlusCircleIcon className="h-5 w-5" />
                  <span className="text-xs">{t("more")}</span>
                </div>
              }
            />
          ) : null}
        </Tabs>
      </div>

      {/* More Menu Modal */}
      <Modal
        className="md:hidden"
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {t("more_options")}
          </ModalHeader>
          <ModalBody className="gap-2 pb-6">
            {permissions?.permissions?.canCreateCourses ? (
              <Button
                className={`w-full justify-start ${selected === "create_course" ? "bg-default-100" : ""}`}
                startContent={<PlusCircleIcon className="h-5 w-5" />}
                variant="light"
                onPress={() => handleMoreOptionSelect("create_course")}
              >
                {t("create_course")}
              </Button>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
