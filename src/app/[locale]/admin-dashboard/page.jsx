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
import {
  UsersIcon,
  BookOpenIcon,
  WalletIcon,
  UserGroupIcon,
  CreditCardIcon,
  PlusCircleIcon,
  FolderIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

import AccountsManagement from "@/app/_components/account-management";
import CoursesManagement from "@/app/_components/courses-management";
import WalletManagement from "@/app/_components/wallet-management";
import SpecialistsManagement from "@/app/_components/specialists-management";
import TransactionsManagement from "@/app/_components/transactions-management";
import CourseCreation from "@/app/_components/create-courses";
import CategoryManagement from "@/app/_components/category-management";

export default function AdminDashboard() {
  const t = useTranslations("admin_dashboard");
  const [selected, setSelected] = useState("accounts");
  const [isOpen, setIsOpen] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

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
    return ["specialists", "create-courses", "categories"].includes(key);
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
      case "accounts":
        return <AccountsManagement />;
      case "courses":
        return <CoursesManagement />;
      case "wallet":
        return <WalletManagement />;
      case "transactions":
        return <TransactionsManagement />;
      case "specialists":
        return <SpecialistsManagement />;
      case "create-courses":
        return <CourseCreation />;
      case "categories":
        return <CategoryManagement />;
      default:
        return <AccountsManagement />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
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
              aria-label="Admin Dashboard Navigation"
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
                key="accounts"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <UsersIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.accounts")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="courses"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <BookOpenIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.courses")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="wallet"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <WalletIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.wallet")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="transactions"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <CreditCardIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.transactions")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="specialists"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <UserGroupIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.specialists")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="create-courses"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.create_courses")}
                    </span>
                  </motion.p>
                }
              />
              <Tab
                key="categories"
                title={
                  <motion.p
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                    transition={{ duration: 0.2 }}
                  >
                    <FolderIcon className="h-5 w-5" />
                    <span className={!isOpen ? "hidden" : ""}>
                      {t("tabs.categories")}
                    </span>
                  </motion.p>
                }
              />
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
          aria-label="Mobile Admin Dashboard Navigation"
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
            key="accounts"
            title={
              <div className="flex flex-col items-center gap-1">
                <UsersIcon className="h-5 w-5" />
                <span className="text-xs">{t("tabs.accounts")}</span>
              </div>
            }
          />
          <Tab
            key="courses"
            title={
              <div className="flex flex-col items-center gap-1">
                <BookOpenIcon className="h-5 w-5" />
                <span className="text-xs">{t("tabs.courses")}</span>
              </div>
            }
          />
          <Tab
            key="wallet"
            title={
              <div className="flex flex-col items-center gap-1">
                <WalletIcon className="h-5 w-5" />
                <span className="text-xs">{t("tabs.wallet")}</span>
              </div>
            }
          />
          <Tab
            key="transactions"
            title={
              <div className="flex flex-col items-center gap-1">
                <CreditCardIcon className="h-5 w-5" />
                <span className="text-xs">{t("tabs.transactions")}</span>
              </div>
            }
          />
          <Tab
            key="more"
            title={
              <div className="flex flex-col items-center gap-1">
                <FolderIcon className="h-5 w-5" />
                <span className="text-xs">{t("tabs.more")}</span>
              </div>
            }
          />
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
            {t("tabs.more_options")}
          </ModalHeader>
          <ModalBody className="gap-2 pb-6">
            <Button
              className={`w-full justify-start ${selected === "specialists" ? "bg-default-100" : ""}`}
              startContent={<UserGroupIcon className="h-5 w-5" />}
              variant="light"
              onPress={() => handleMoreOptionSelect("specialists")}
            >
              {t("tabs.specialists")}
            </Button>
            <Button
              className={`w-full justify-start ${selected === "create-courses" ? "bg-default-100" : ""}`}
              startContent={<PlusCircleIcon className="h-5 w-5" />}
              variant="light"
              onPress={() => handleMoreOptionSelect("create-courses")}
            >
              {t("tabs.create_courses")}
            </Button>
            <Button
              className={`w-full justify-start ${selected === "categories" ? "bg-default-100" : ""}`}
              startContent={<FolderIcon className="h-5 w-5" />}
              variant="light"
              onPress={() => handleMoreOptionSelect("categories")}
            >
              {t("tabs.categories")}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
