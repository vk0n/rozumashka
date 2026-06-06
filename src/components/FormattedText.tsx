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
const explanationHeadingPattern =
  /^(?:\*\*)?(?:(?:[1-5]\.\s+)?(?:Ключове поняття(?:\s*\/\s*(?:Ключова ідея|ключові слова в умові))?|Ключова ідея|Ключові слова(?:\s+в умові)?|Чому правильна відповідь(?:\s*[—–-]\s*[A-EА-ЕЄ])?|Чому не інші варіанти|Які правила треба знати, щоб не допустити тут помилок на іспиті|Як запам[’']ятати)|Коротко:)(?:\*\*)?\s*:?\s*$/iu;

type TextSegmentType = "heading" | "numbered-list" | "bulleted-list" | "text";

interface TextSegment {
  type: TextSegmentType;
  lines: string[];
}

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

function cleanExplanationHeading(line: string): string {
  return line.trim().replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
}

function getLineType(line: string): TextSegmentType {
  if (explanationHeadingPattern.test(line.trim())) {
    return "heading";
  }

  if (numberedLinePattern.test(line)) {
    return "numbered-list";
  }

  if (bulletedLinePattern.test(line)) {
    return "bulleted-list";
  }

  return "text";
}

function splitIntoSegments(lines: string[]): TextSegment[] {
  const segments: TextSegment[] = [];

  for (const line of lines) {
    const type = getLineType(line);
    const previous = segments.at(-1);

    if (type !== "heading" && previous?.type === type) {
      previous.lines.push(line);
      continue;
    }

    segments.push({ type, lines: [line] });
  }

  return segments;
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
        const segments = splitIntoSegments(lines);

        return (
          <div
            key={`${blockIndex}-${block.slice(0, 24)}`}
            className="contents"
          >
            {segments.map((segment, segmentIndex) => {
              const key = `${blockIndex}-${segmentIndex}-${segment.lines[0].slice(0, 24)}`;

              if (segment.type === "heading") {
                return (
                  <p
                    key={key}
                    className={classNames(
                      "mb-2 mt-5 font-black leading-snug text-ink first:mt-0 last:mb-0",
                      paragraphClassName
                    )}
                  >
                    {cleanExplanationHeading(segment.lines[0])}
                  </p>
                );
              }

              if (segment.type === "numbered-list") {
                return (
                  <ol
                    key={key}
                    className={classNames("mb-4 list-decimal space-y-1 pl-5 last:mb-0", listClassName)}
                  >
                    {segment.lines.map((line, lineIndex) => (
                      <li key={`${lineIndex}-${line}`} className={classNames("pl-1", listItemClassName)}>
                        {stripListMarker(line)}
                      </li>
                    ))}
                  </ol>
                );
              }

              if (segment.type === "bulleted-list") {
                return (
                  <ul
                    key={key}
                    className={classNames("mb-4 list-disc space-y-1 pl-5 last:mb-0", listClassName)}
                  >
                    {segment.lines.map((line, lineIndex) => (
                      <li key={`${lineIndex}-${line}`} className={classNames("pl-1", listItemClassName)}>
                        {stripListMarker(line)}
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={key}
                  className={classNames("mb-4 whitespace-pre-wrap last:mb-0", paragraphClassName)}
                >
                  {renderTextWithLineBreaks(segment.lines.join("\n"))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
