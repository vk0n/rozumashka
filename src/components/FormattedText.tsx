import { Fragment } from "react";

interface FormattedTextProps {
  text: string;
  className?: string;
  paragraphClassName?: string;
  listClassName?: string;
  listItemClassName?: string;
  compact?: boolean;
}

const numberedLinePattern = /^\s*\d+[.)]\s+/;
const bulletedLinePattern = /^\s*[-*•]\s+/;

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function stripListMarker(line: string): string {
  return line.replace(numberedLinePattern, "").replace(bulletedLinePattern, "").trim();
}

function renderTextWithLineBreaks(text: string) {
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

export function FormattedText({
  text,
  className,
  paragraphClassName,
  listClassName,
  listItemClassName,
  compact = false
}: FormattedTextProps) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={classNames("prose-like", compact && "prose-like-compact", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trimEnd())
          .filter((line) => line.trim().length > 0);
        const isNumberedList = lines.length > 1 && lines.every((line) => numberedLinePattern.test(line));
        const isBulletedList = lines.length > 1 && lines.every((line) => bulletedLinePattern.test(line));

        if (isNumberedList) {
          return (
            <ol
              key={`${blockIndex}-${block.slice(0, 24)}`}
              className={classNames("mb-4 list-decimal space-y-1 pl-5 last:mb-0", listClassName)}
            >
              {lines.map((line, lineIndex) => (
                <li key={`${lineIndex}-${line}`} className={classNames("pl-1", listItemClassName)}>
                  {stripListMarker(line)}
                </li>
              ))}
            </ol>
          );
        }

        if (isBulletedList) {
          return (
            <ul
              key={`${blockIndex}-${block.slice(0, 24)}`}
              className={classNames("mb-4 list-disc space-y-1 pl-5 last:mb-0", listClassName)}
            >
              {lines.map((line, lineIndex) => (
                <li key={`${lineIndex}-${line}`} className={classNames("pl-1", listItemClassName)}>
                  {stripListMarker(line)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`${blockIndex}-${block.slice(0, 24)}`}
            className={classNames("mb-4 whitespace-pre-wrap last:mb-0", paragraphClassName)}
          >
            {renderTextWithLineBreaks(block)}
          </p>
        );
      })}
    </div>
  );
}
