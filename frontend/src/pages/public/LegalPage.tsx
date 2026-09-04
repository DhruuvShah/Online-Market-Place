import type { ReactNode } from "react";

type Section = { heading: string; body: ReactNode };

type Props = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
};

export function LegalPage({ eyebrow, title, updated, intro, sections }: Props) {
  return (
    <div className="shell max-w-3xl py-32 sm:py-40">
      <p className="text-eyebrow text-ink-subtle">{eyebrow}</p>
      <h1 className="text-section mt-5">{title}</h1>
      <p className="text-ink-subtle mt-4 text-[13px]">Last updated {updated}</p>

      <p className="text-ink-muted mt-10 text-[16px] leading-relaxed">{intro}</p>

      <div className="border-line mt-12 border-t">
        {sections.map((section) => (
          <section key={section.heading} className="border-line border-b py-9">
            <h2 className="font-display text-xl">{section.heading}</h2>
            <div className="text-ink-muted mt-3 flex flex-col gap-3 text-[15px] leading-relaxed">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
