import type { ImageDto } from "@cmsjs/cms/model";
import Image from "next/image";

export function HomeMedia({
  className,
  image,
  preload = false,
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
