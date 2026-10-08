import type { NewsDto } from "@cmsjs/cms/model";
import { Blocks, CmsImage } from "@cmsjs/components/shared/content";

export function NewsDetailPage({ page }: { page: NewsDto }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">
        {page.category} · {page.editorialDate}
        {page.featured ? " · In evidenza" : ""}
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-text sm:text-5xl">
        {page.identity.title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-muted">{page.summary}</p>
      <div className="mt-10">
        <CmsImage
          image={page.heroImage}
          loading="eager"
          sizes="(min-width: 896px) 832px, calc(100vw - 40px)"
        />
      </div>
      <div className="mt-10">
        <Blocks blocks={page.content} />
      </div>
    </main>
  );
}
