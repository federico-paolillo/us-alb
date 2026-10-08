import { draftMode } from "next/headers";

export async function PreviewBanner() {
  const { isEnabled } = await draftMode();

  if (!isEnabled) {
    return null;
  }

  return (
    <aside className="border-b border-outline-soft bg-gold-pale text-sm text-ink">
      <div className="site-container flex min-h-12 items-center justify-between gap-4 py-2">
        <output className="font-body font-semibold tracking-editorial uppercase">
          Anteprima bozza
        </output>
        <form action="/preview" method="post">
          <button
            className="rounded-editorial-md border border-gold-deep px-3 py-1.5 font-semibold text-gold-deep transition-colors hover:bg-gold-deep hover:text-white"
            type="submit"
          >
            Esci dall’anteprima
          </button>
        </form>
      </div>
    </aside>
  );
}
