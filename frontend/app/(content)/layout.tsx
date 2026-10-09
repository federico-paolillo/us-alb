import { PreviewBanner } from "@cmsjs/components/shared/preview-banner";
import { previewRobotsMetadata } from "@cmsjs/seo";
import type { Metadata } from "next";
import { draftMode } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  return isEnabled ? previewRobotsMetadata(true) : {};
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PreviewBanner />
      {children}
    </>
  );
}
