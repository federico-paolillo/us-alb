import { draftMode } from "next/headers";

export async function PreviewBanner() {
  const { isEnabled } = await draftMode();

  if (!isEnabled) {
    return null;
  }

  return (
    <aside className="border-b border-amber-500/40 bg-amber-100 px-5 py-3 text-sm text-amber-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <output>Anteprima bozza</output>
        <form action="/preview" method="post">
          <button className="underline underline-offset-2" type="submit">
            Esci dall’anteprima
          </button>
        </form>
      </div>
    </aside>
  );
}
