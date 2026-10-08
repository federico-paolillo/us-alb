import localFont from "next/font/local";

export const epilogue = localFont({
  src: [
    {
      path: "./fonts/epilogue-variable.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/epilogue-italic-variable.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  variable: "--font-epilogue",
});

export const manrope = localFont({
  src: "./fonts/manrope-variable.ttf",
  weight: "200 800",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  variable: "--font-manrope",
});
