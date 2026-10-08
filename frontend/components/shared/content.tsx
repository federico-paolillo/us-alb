import type {
  BlockDto,
  BlocksDto,
  ImageDto,
  InlineDto,
  ListBlockDto,
  TextDto,
} from "@cmsjs/cms/model";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";

const contentImageSizes =
  "(min-width: 768px) 704px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)";

export function Blocks({ blocks }: { blocks: BlocksDto }) {
  return (
    <div className="space-y-6 text-base leading-7 text-muted">
      {blocks.map((block, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Strapi blocks have no stable IDs and never reorder client-side.
        <Block block={block} key={index} />
      ))}
    </div>
  );
}

function Block({ block }: { block: BlockDto }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p>
          <Inline nodes={block.children} />
        </p>
      );
    case "heading":
      return <Heading level={block.level} nodes={block.children} />;
    case "list":
      return <List list={block} />;
    case "quote":
      return (
        <blockquote className="border-l-2 border-accent pl-5 text-text">
          <Inline nodes={block.children} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-card border border-border bg-surface p-5 font-mono text-sm leading-6 text-text">
          {block.language && (
            <span className="mb-3 block text-xs tracking-[0.14em] text-accent uppercase">
              {block.language}
            </span>
          )}
          <code>
            <Inline nodes={block.children} />
          </code>
        </pre>
      );
    case "image":
      return <CmsImage image={block.image} sizes={contentImageSizes} />;
  }
}

function Heading({
  level,
  nodes,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  nodes: InlineDto[];
}) {
  const content = <Inline nodes={nodes} />;
  switch (level) {
    case 1:
      return (
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {content}
        </h1>
      );
    case 2:
      return (
        <h2 className="text-2xl font-semibold tracking-tight text-text">
          {content}
        </h2>
      );
    case 3:
      return <h3 className="text-xl font-semibold text-text">{content}</h3>;
    case 4:
      return <h4 className="font-semibold text-text">{content}</h4>;
    case 5:
      return <h5 className="font-semibold text-text">{content}</h5>;
    case 6:
      return <h6 className="font-semibold text-text">{content}</h6>;
  }
}

function List({ list }: { list: ListBlockDto }) {
  const children = list.children.map((item, index) =>
    item.type === "list" ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: Strapi list nodes have no stable IDs and never reorder client-side.
      <List key={index} list={item} />
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: Strapi list nodes have no stable IDs and never reorder client-side.
      <li key={index}>
        <Inline nodes={item.children} />
      </li>
    ),
  );
  return list.format === "ordered" ? (
    <ol className="list-decimal space-y-2 pl-6">{children}</ol>
  ) : (
    <ul className="list-disc space-y-2 pl-6">{children}</ul>
  );
}

function Inline({ nodes }: { nodes: InlineDto[] }) {
  return nodes.map((node, index) =>
    node.type === "link" ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: Strapi inline nodes have no stable IDs and never reorder client-side.
      <Fragment key={index}>
        <a
          className="text-accent underline decoration-accent/60 underline-offset-4"
          href={node.url}
        >
          <Inline nodes={node.children} />
        </a>
      </Fragment>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: Strapi inline nodes have no stable IDs and never reorder client-side.
      <Text key={index} text={node} />
    ),
  );
}

function Text({ text }: { text: TextDto }) {
  let content: ReactNode = text.text;
  if (text.code) content = <code>{content}</code>;
  if (text.bold) content = <strong>{content}</strong>;
  if (text.italic) content = <em>{content}</em>;
  if (text.underline) content = <u>{content}</u>;
  if (text.strikethrough) content = <s>{content}</s>;
  return content;
}

export function CmsImage({
  image,
  loading,
  sizes,
}: {
  image: ImageDto;
  loading?: "eager" | "lazy" | undefined;
  sizes: string;
}) {
  return (
    <figure className="overflow-hidden rounded-card border border-border bg-surface">
      <Image
        alt={image.alt}
        className="h-auto w-full"
        height={image.height}
        loading={loading}
        sizes={sizes}
        src={image.url}
        width={image.width}
      />
      {image.caption && (
        <figcaption className="px-4 py-3 text-sm text-muted">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
}
