/* eslint-disable node/no-unpublished-require */
import { heroui } from "@heroui/theme";
import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

module.exports = {
  content: [
    "./src/**/*.jsx",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C96346",
          light: "#F5E8E4",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        rubik: ["var(--font-rubik)"],
        kufi: ["var(--font-kufi-arabic)"],
        rakkas: ["var(--font-rakkas)"],
        aref: ["var(--font-aref-ruqaa)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  lightMode: "class",
  darkMode: "class",
  plugins: [heroui(), addVariablesForColors, require("tailwindcss-animate")],
};
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  // Only keep colors that are strings
  let filteredColors = {};

  for (const [key, val] of Object.entries(allColors)) {
    if (typeof val === "string") {
      filteredColors[`--${key}`] = val;
    }
  }

  addBase({
    ":root": filteredColors,
  });
}
