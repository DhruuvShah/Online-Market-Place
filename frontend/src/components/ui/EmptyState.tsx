import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-ink-subtle">{icon}</div>
      <h2 className="font-display mt-6 text-2xl">{title}</h2>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">
        {body}
      </p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
