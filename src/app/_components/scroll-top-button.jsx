"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { ChevronUp } from "lucide-react";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const toggleVisibility = () => {
      // if the user scrolls down, show the button
      window.scrollY > 500 ? setIsVisible(true) : setIsVisible(false);
    };

    // listen for scroll events
    window.addEventListener("scroll", toggleVisibility);

    // clear the listener on component unmount
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  useEffect(() => {
    controls.start({ opacity: isVisible ? 1 : 0 });
  }, [isVisible, controls]);

  // handles the animation when scrolling to the top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <motion.button
      animate={controls}
      className="fixed bottom-4 right-4 rounded-full dark:bg-[#232323] bg-[#e5e5e5] p-2 z-50 outline-none"
      transition={{ duration: 0.2 }}
      onClick={scrollToTop}
    >
      <ChevronUp />
    </motion.button>
  );
};

export default ScrollToTopButton;
