import type { ImageDto } from "@cmsjs/cms/model";
import Image from "next/image";

export function NewsDetailMedia({
  className,
  image,
  preload,
  sizes,
}: {
  className?: string;
  image: ImageDto;
  preload?: boolean;
  sizes: string;
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
