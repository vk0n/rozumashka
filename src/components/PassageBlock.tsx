import { FormattedText } from "./FormattedText";

interface PassageBlockProps {
  passage: string;
  label?: string;
  className?: string;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function PassageBlock({ passage, label = "Текст до завдання", className }: PassageBlockProps) {
  const isVeryLong = passage.length > 1800;

  return (
    <section
      className={classNames("passage-block", isVeryLong && "max-h-[75vh] overflow-y-auto", className)}
      aria-label={label}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-moss" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-[0.18em] text-moss">{label}</p>
      </div>
      <FormattedText text={passage} className="text-[0.98rem] text-ink/80 sm:text-base" />
    </section>
  );
}
