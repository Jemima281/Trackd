import Link from "next/link";

// Shared layout for the About, Privacy and Terms pages.
export function InfoPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 py-8 leading-relaxed text-white/75">
      <header>
        <h1 className="text-4xl font-black text-white">{title}</h1>
        {updated && <p className="mt-1 text-sm text-white/40">Last updated {updated}</p>}
      </header>
      {children}
      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm text-white/50">
        <Link href="/about" className="hover:text-white">About</Link>
        <Link href="/privacy" className="hover:text-white">Privacy</Link>
        <Link href="/terms" className="hover:text-white">Terms</Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a>
      </nav>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-black text-white">{title}</h2>
      {children}
    </section>
  );
}

export const CONTACT_EMAIL = "hello@shuin.io";
