import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SourceType =
  | "official_demo"
  | "official_past_exam"
  | "official_collection"
  | "official_report"
  | "public_source";

interface DownloadSource {
  localFilePath: string;
  sourceUrl: string;
  title: string;
  subject: "tznk" | "english" | "management" | "psychology-sociology" | "mixed" | "reports";
  sourceType: SourceType;
  containsQuestions: boolean;
  containsAnswers: boolean;
  containsExplanations: boolean;
  notes: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const sources: DownloadSource[] = [
  {
    localFilePath: "data/raw/tznk/tznk-2023-demo.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2024/12/TZNK_2023_merged-1.pdf",
    title: "ЄВІ ТЗНК 2023 PDF version",
    subject: "tznk",
    sourceType: "official_demo",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    notes: "Official demo PDF."
  },
  {
    localFilePath: "data/raw/tznk/tznk-2024-demo-with-comments.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2024/04/TZNK_maket_sajt_2024_03_29_merged.pdf",
    title: "ЄВІ ТЗНК demo variant with comments",
    subject: "tznk",
    sourceType: "official_demo",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: true,
    notes: "Official commented TЗНК demo."
  },
  {
    localFilePath: "data/raw/english/english-2023-demo.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2023/05/YEVI-2023_angl_mova_demo.pdf",
    title: "ЄВІ 2023 English demo PDF",
    subject: "english",
    sourceType: "official_demo",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    notes: "Official English demo PDF."
  },
  {
    localFilePath: "data/raw/english/english-2021-shift-1.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2021/06/EVI_2021-Angl_mova-1_zmina-Zoshyt_1.pdf",
    title: "ЄВІ 2021 English main session shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    notes: "Downloaded for archival/manual extraction; preview showed encoding issues."
  },
  {
    localFilePath: "data/raw/english/english-2021-shift-1-answers.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2021/06/Angl_mova-YEVI_2021-Klyuchi-I_zmina-osn_sesiya.pdf",
    title: "ЄВІ 2021 English answer key shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Answer key for 2021 shift I."
  },
  {
    localFilePath: "data/raw/english/english-2020-shift-1.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2020/07/EVI_2020-Angl_mova-1_-Zoshyt_1.pdf",
    title: "ЄВІ 2020 English main session shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    notes: "Official past paper."
  },
  {
    localFilePath: "data/raw/english/english-2020-shift-1-answers.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2020/07/Angl_mova-YEVI_2020-Klyuchi-I_zmina-osn_sesiya.pdf",
    title: "ЄВІ 2020 English answer key shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Answer key for 2020 shift I."
  },
  {
    localFilePath: "data/raw/english/english-2019-shift-1.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2019/07/EVI_2019-Angl_mova-1_zmina-Zoshyt_1.pdf",
    title: "ЄВІ 2019 English main session shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: true,
    containsAnswers: false,
    containsExplanations: false,
    notes: "Official past paper."
  },
  {
    localFilePath: "data/raw/english/english-2019-shift-1-answers.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2019/07/Angl_mova-YEVI_2019-Klyuchi-1_zmina.pdf",
    title: "ЄВІ 2019 English answer key shift I",
    subject: "english",
    sourceType: "official_past_exam",
    containsQuestions: false,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Answer key for 2019 shift I."
  },
  {
    localFilePath: "data/raw/management/management-yefvv-2024.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2025/04/YEFVV_2024-Upravlinnya-ta-administruvannya-na_sajt.pdf",
    title: "ЄФВВ 2024 Управління та адміністрування task collection",
    subject: "management",
    sourceType: "official_collection",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Official 140-question 2024 collection; correct options are marked with `(x)`."
  },
  {
    localFilePath: "data/raw/management/management-yefvv-2023-demo.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2023/06/YEFVV_Upravlinnya_demo.pdf",
    title: "ЄФВВ 2023 Управління та адміністрування demo",
    subject: "management",
    sourceType: "official_demo",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Short official 2023 demo."
  },
  {
    localFilePath: "data/raw/psychology-sociology/psychology-sociology-yefvv-2024.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2025/04/YEFVV_2024-Psyhologiya-ta-sotsiologiya-na_sajt.pdf",
    title: "ЄФВВ 2024 Психологія та соціологія task collection",
    subject: "psychology-sociology",
    sourceType: "official_collection",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Official 140-question 2024 collection; correct options are marked with `(x)`."
  },
  {
    localFilePath: "data/raw/psychology-sociology/psychology-sociology-yefvv-2023-demo.pdf",
    sourceUrl: "https://testportal.gov.ua/wp-content/uploads/2023/06/YEFVV_Psyhologiya_demo.pdf",
    title: "ЄФВВ 2023 Психологія та соціологія demo",
    subject: "psychology-sociology",
    sourceType: "official_demo",
    containsQuestions: true,
    containsAnswers: true,
    containsExplanations: false,
    notes: "Short official 2023 demo."
  }
];

async function download(source: DownloadSource) {
  const response = await fetch(source.sourceUrl);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const outputPath = path.join(projectRoot, source.localFilePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));

  return {
    ...source,
    downloadedAt: new Date().toISOString()
  };
}

async function main() {
  const index = [];

  for (const source of sources) {
    process.stdout.write(`Downloading ${source.localFilePath}... `);
    try {
      index.push(await download(source));
      process.stdout.write("ok\n");
    } catch (error) {
      process.stdout.write("failed\n");
      throw new Error(
        `Failed to download ${source.sourceUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const indexPath = path.join(projectRoot, "data/raw/raw-index.json");
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${path.relative(projectRoot, indexPath)} with ${index.length} entries.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
