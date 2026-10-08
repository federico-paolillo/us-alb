import type { BlocksDto } from "@cmsjs/cms/model";
import { Blocks } from "@cmsjs/components/shared/content";
import { EmptyState } from "@cmsjs/components/shared/empty-state";
import Link from "next/link";

export function ArticleBody({ content }: { content: BlocksDto }) {
  return (
    <section className="bg-surface-lowest py-12 md:py-20">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          {content.length > 0 ? (
            <article>
              <Blocks blocks={content} />
            </article>
          ) : (
            <EmptyState
              body="Il contenuto di questa bozza non è ancora pronto per la pubblicazione."
              title="Articolo in preparazione"
            />
          )}

          <div className="mt-12 border-t border-outline-soft/60 pt-7">
            <Link
              className="inline-flex min-h-11 items-center gap-2 py-2 text-xs font-bold tracking-editorial text-ink uppercase hover:text-gold-deep"
              href="/notizie"
            >
              <span aria-hidden="true">←</span>
              Torna a tutte le notizie
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
