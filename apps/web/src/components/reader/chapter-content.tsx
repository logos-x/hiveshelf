import type { ChapterContent as ChapterContentResponse } from "@hiveshelf/shared";
import styles from "./chapter-content.module.css";

type ChapterContentProps = {
  chapter: Pick<ChapterContentResponse, "chapterVersionId" | "html">;
};

export function ChapterContent({ chapter }: ChapterContentProps) {
  return (
    <article
      className={styles.content}
      data-chapter-version-id={chapter.chapterVersionId}
      dangerouslySetInnerHTML={{ __html: chapter.html }}
    />
  );
}
