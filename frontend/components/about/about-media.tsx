import type { ImageDto } from "@cmsjs/cms/model";
import Image from "next/image";

export function AboutMedia({
  className,
  image,
  preload = false,
  sizes,
}: {
  image: ImageDto;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      alt={image.alt}
      className={`object-cover ${className ?? ""}`}
      fill
      preload={preload}
      sizes={sizes}
      src={image.url}
    />
  );
}
