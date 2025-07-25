"use client";
import React from "react";
import clsx from "clsx";
import Link from "next/link";
import {
  Navbar as NextUINavbar,
  NavbarContent as NextUINavbarContent,
  NavbarMenu,
  NavbarBrand,
  NavbarItem as NextUINavbarItem,
  NavbarMenuToggle,
  NavbarMenuItem as NextUINavbarMenuItem,
} from "@heroui/navbar";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { User } from "@heroui/user";

import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitch from "./theme-switch";

import { api } from "@/trpc/react";
import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const t = useTranslations("Navbar");
  const locale = useLocale();

  // Add wallet query
  const { data: wallet } = api.wallet.getWallet.useQuery(undefined, {
    enabled: !!session?.user,
  });

  console.log("Session data:", {
    status,
    role: session?.user?.role,
    user: session?.user,
  });

  const handleSignIn = () => {
    router.push(`/${locale}/signin`);
  };

  const handleSignUp = () => {
    router.push(`/${locale}/signup`);
  };

  // Add this helper function at the top of your component
  const isActiveLink = (itemHref, currentPath, locale) => {
    // Special case for homepage
    if (itemHref === "/" && currentPath === `/${locale}`) {
      return true;
    }

    // For other pages
    return currentPath === `/${locale}${itemHref}`;
  };

  const navItems = siteConfig.navItems.map((item) => (
    <NextUINavbarItem
      key={item.href}
      className="mx-4"
      isActive={isActiveLink(item.href, pathname, locale)}
    >
      <Link
        className={clsx(
          "text-foreground hover:opacity-80 transition-opacity",
          isActiveLink(item.href, pathname, locale)
            ? "!text-[#C96346] font-bold"
            : ""
        )}
        href={`/${locale}${item.href}`}
      >
        {t(item.label)}
      </Link>
    </NextUINavbarItem>
  ));

  const mobileMenuItems = siteConfig.navItems.map((item) => (
    <NextUINavbarMenuItem
      key={item.href}
      isActive={isActiveLink(item.href, pathname, locale)}
    >
      <Link
        className={clsx(
          "hover:opacity-80 transition-opacity",
          isActiveLink(item.href, pathname, locale)
            ? "!text-[#C96346] font-bold"
            : "text-foreground"
        )}
        href={`/${locale}${item.href}`}
      >
        {t(item.label)}
      </Link>
    </NextUINavbarMenuItem>
  ));

  const renderUserMenu = () => {
    if (status === "loading") {
      return null;
    }

    if (session?.user) {
      return (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <User
              avatarProps={{
                src: session ? session.user?.image : undefined,
                isBordered: true,
                showFallback: true,
                classNames: {
                  base: "bg-primary/80",
                  icon: "text-black/80",
                },
              }}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="User menu actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2">
              <p className="font-bold">{t("Signed in as")}</p>
              <p className="font-bold">@{session.user.name}</p>
            </DropdownItem>
            <DropdownItem key="wallet" className="h-14 gap-2">
              <p className="font-bold">{t("Wallet Balance")}</p>
              <p className="font-bold text-[#C96346]">
                {wallet?.balance || 0} {t("Credits")}
              </p>
            </DropdownItem>
            <DropdownItem
              key="dashboard"
              onPress={() => {
                router.push(
                  `/${locale}/${
                    session.user.role === "ADMIN"
                      ? "admin-dashboard"
                      : session.user.role === "INSTRUCTOR"
                        ? "instructor-dashboard"
                        : "dashboard"
                  }`
                );
              }}
            >
              {t("My Dashboard")}
            </DropdownItem>
            {(session.user.role === "ADMIN" ||
              session.user.role === "INSTRUCTOR") && (
              <DropdownItem
                key="student-dashboard"
                onPress={() => {
                  router.push(`/${locale}/dashboard`);
                }}
              >
                {t("Student Dashboard")}
              </DropdownItem>
            )}
            <DropdownItem
              key="settings"
              onPress={() => {
                router.push(`/${locale}/settings`);
              }}
            >
              {t("Settings")}
            </DropdownItem>
            <DropdownItem
              key="logout"
              color="danger"
              onPress={() => signOut({ callbackUrl: `/${locale}` })}
            >
              {t("Log Out")}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          className="text-[#C96346] bg-transparent border border-[#C96346] hover:bg-[#C96346] hover:text-white transition-colors duration-300"
          size="sm"
          variant="bordered"
          onPress={handleSignIn}
        >
          {t("login")}
        </Button>
        <Button
          className="text-white bg-[#C96346] hover:bg-[#ce7968] transition-colors duration-300"
          size="sm"
          onPress={handleSignUp}
        >
          {t("signup")}
        </Button>
      </div>
    );
  };

  return (
    <NextUINavbar
      shouldHideOnScroll
      className="z-50 pt-4 font-rubik"
      classNames={{
        item: [
          "flex",
          "relative",
          "h-full",
          "items-center",
          locale === "ar" ? "font-arabic" : "font-sans",
          "data-[active=true]:after:content-['']",
          "data-[active=true]:after:absolute",
          "data-[active=true]:after:bottom-0",
          "data-[active=true]:after:left-0",
          "data-[active=true]:after:right-0",
          "data-[active=true]:after:h-[3px]",
          "data-[active=true]:after:rounded-[2px]",
          "data-[active=true]:after:bg-[#C96346]",
          "data-[active=true]:after:text-[#C96346]",
        ],
      }}
      maxWidth="full"
      position="sticky"
    >
      <NextUINavbarContent className="basis-1/4 sm:basis-1/3" justify="start">
        <NavbarBrand className="max-w-fit">
          <Link
            className="flex justify-center items-center gap-1"
            href={`/${locale}`}
          >
            <Image alt={t("logo")} height={150} src="/logo.svg" width={150} />
          </Link>
        </NavbarBrand>
      </NextUINavbarContent>

      <NextUINavbarContent className="hidden lg:flex basis-1/2 sm:basis-1/3 justify-center">
        {navItems}
      </NextUINavbarContent>

      <NextUINavbarContent
        className="hidden sm:flex basis-1/4 sm:basis-1/3 items-center justify-end"
        justify="end"
      >
        <NextUINavbarItem className="hidden sm:flex gap-4">
          <ThemeSwitch />
          <LanguageSwitcher />
          {renderUserMenu()}
        </NextUINavbarItem>
      </NextUINavbarContent>

      <NextUINavbarContent className="sm:hidden basis-3/4 pl-4" justify="end">
        <ThemeSwitch />
        {renderUserMenu()}
        <NavbarMenuToggle aria-label="toggleMenu" />
      </NextUINavbarContent>

      <NavbarMenu
        className={`${locale === "ar" ? "font-arabic" : "font-sans"} mt-4`}
      >
        <NextUINavbarMenuItem>
          <LanguageSwitcher />
        </NextUINavbarMenuItem>
        <div className="mx-4 mt-2 flex flex-col gap-2">{mobileMenuItems}</div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
