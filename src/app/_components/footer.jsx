"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FaInstagram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { Image } from "@heroui/image";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

import { siteConfig } from "@/config/site";

const Footer = () => {
  const t = useTranslations("Footer");
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmail("");
  };

  const socialLinks = [
    {
      icon: <FaInstagram className="w-4 h-4" />,
      href: siteConfig.links.instagram,
    },
    { icon: <FaTwitter className="w-4 h-4" />, href: siteConfig.links.twitter },
    {
      icon: <FaWhatsapp className="w-4 h-4" />,
      href: siteConfig.links.whatsapp,
    },
    { icon: <FaTiktok className="w-4 h-4" />, href: siteConfig.links.tiktok },
  ];

  return (
    <footer className="bg-[#C96346] text-white w-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Site Map Section */}
          <div className="flex-row flex">
            <div className="w-fit">
              <Image
                alt={siteConfig.name}
                className="object-contain"
                height={100}
                src="/footer-logo.png"
                width={250}
              />
            </div>
            <div className="text-right">
              <h4 className="text-lg font-medium mb-4">{t("siteMap.title")}</h4>
              <nav className="grid grid-cols-2 gap-x-8 gap-y-2">
                {siteConfig.navItems.map((link) => (
                  <Link
                    key={link.href}
                    className="hover:text-white/80 transition-colors text-sm"
                    href={link.href}
                  >
                    {`>> `}
                    {t(`siteMap.${link.label}`)}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="text-right">
            <h3 className="text-base mb-4">{t("newsletter.title")}</h3>
            <form
              className="flex flex-row items-center gap-2"
              onSubmit={handleSubmit}
            >
              <Button
                className="px-6 py-2 bg-white text-[#C96346] rounded-lg hover:bg-white/90 transition-colors text-sm"
                type="submit"
              >
                {t("newsletter.button")}
              </Button>
              <Input
                isRequired
                className="flex-1 px-4 py-2 rounded text-white text-sm"
                dir="rtl"
                placeholder={t("newsletter.placeholder")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </form>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-center pt-4 border-t border-white/20">
          <div className="flex w-full flex-row items-center justify-between gap-4">
            <div>
              <span className="text-sm">
                {t("copyright", { year: new Date().getFullYear() })}
              </span>
            </div>
            <div className="flex flex-row items-center justify-center gap-2">
              <span className="text-md text-center">{t("contactUs")}</span>
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  className="text-[#C96346] bg-white p-2 rounded-sm hover:opacity-90 transition-opacity"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
