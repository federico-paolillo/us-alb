import type { Metadata } from "next";

export const defaultMetadata: Metadata = {
  title: {
    default: "U.S. Albatese",
    template: "%s | U.S. Albatese",
  },
  other: {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "development",
  },
};
