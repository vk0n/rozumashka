interface QuestionImageProps {
  imageUrl: string;
  alt?: string;
  className?: string;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function QuestionImage({ imageUrl, alt = "Рисунок до завдання", className }: QuestionImageProps) {
  return (
    <figure className={classNames("rounded-3xl border border-moss/15 bg-white/80 p-4 sm:p-5", className)}>
      <figcaption className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-moss">
        <span className="h-2 w-2 rounded-full bg-moss" aria-hidden="true" />
        Рисунок до завдання
      </figcaption>
      <div className="overflow-x-auto">
        <img
          src={assetUrl(imageUrl)}
          alt={alt}
          className="mx-auto max-h-[70vh] min-w-[520px] max-w-full rounded-2xl bg-white object-contain sm:min-w-0"
          loading="lazy"
        />
      </div>
    </figure>
  );
}
