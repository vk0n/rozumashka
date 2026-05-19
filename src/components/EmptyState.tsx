import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="study-card p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-honey/25 text-3xl">
        ?
      </div>
      <h2 className="font-display text-3xl font-black">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
