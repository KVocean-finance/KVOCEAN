import type { ReportingModel } from "@/lib/validation/report";

/**
 * Only export the "핵심 지표" section for now. To re-enable more sections,
 * add their titles here.
 */
export const TARGET_SECTION_TITLES = new Set<string>(["핵심 지표"]);

export const SHEETS_KEY_COLUMNS = ["회사명", "분기명"] as const;

export type MetricColumn = {
  header: string;
  section: string;
  label: string;
  kind: "amount" | "ratio" | "growthRate";
};

function kindToLabel(kind: MetricColumn["kind"]) {
  if (kind === "amount") return "금액";
  if (kind === "ratio") return "비율";
  return "증감율";
}

/**
 * Columns for the per-quarter tab — only metrics in TARGET_SECTION_TITLES.
 * Pulls from the first non-empty report so the column set is stable across
 * companies (finalSections shape is industry-agnostic).
 */
export function buildMetricColumnsForTargetSections(report: ReportingModel | undefined): MetricColumn[] {
  if (!report) return [];
  const cols: MetricColumn[] = [];
  for (const section of report.finalSections) {
    if (!TARGET_SECTION_TITLES.has(section.title)) continue;
    for (const row of section.rows) {
      (["amount", "ratio", "growthRate"] as const).forEach((kind) => {
        cols.push({
          header: `${section.title}::${row.label}::${kindToLabel(kind)}`,
          section: section.title,
          label: row.label,
          kind
        });
      });
    }
  }
  return cols;
}

export function buildHeaderRow(metricColumns: MetricColumn[]): string[] {
  return [...SHEETS_KEY_COLUMNS, ...metricColumns.map((c) => c.header)];
}

export type SheetCellValue = string | number | null;

/**
 * For ONE quarter, produce rows where each row is a company.
 * Columns follow metricColumns ordering.
 */
export function buildQuarterRows(args: {
  quarterKey: string;
  quarterLabel: string;
  companyReports: Map<string, ReportingModel>;
  metricColumns: MetricColumn[];
}): SheetCellValue[][] {
  const rows: SheetCellValue[][] = [];

  const companyNames = Array.from(args.companyReports.keys()).sort((a, b) => a.localeCompare(b, "ko"));

  for (const companyName of companyNames) {
    const report = args.companyReports.get(companyName)!;
    // Find the period in this report matching quarterKey
    const period = report.periods.find((p) => p.key === args.quarterKey);
    if (!period) continue; // this company has no data for this quarter — skip

    const sectionIndex = new Map<string, Map<string, ReportingModel["finalSections"][number]["rows"][number]>>();
    for (const section of report.finalSections) {
      const rowMap = new Map<string, ReportingModel["finalSections"][number]["rows"][number]>();
      for (const row of section.rows) {
        rowMap.set(row.label, row);
      }
      sectionIndex.set(section.title, rowMap);
    }

    const row: SheetCellValue[] = [companyName, args.quarterLabel];
    for (const col of args.metricColumns) {
      const metric = sectionIndex.get(col.section)?.get(col.label);
      if (!metric) {
        row.push(null);
        continue;
      }
      const record = col.kind === "amount" ? metric.amounts : col.kind === "ratio" ? metric.ratios : metric.growthRates;
      const value = record[period.key];
      row.push(value ?? null);
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Collect every distinct quarter across all companies and provide a stable
 * label per quarter (uses the first label seen).
 */
export function collectDistinctQuarters(reports: ReportingModel[]): Array<{ key: string; label: string }> {
  const map = new Map<string, string>();
  for (const report of reports) {
    for (const period of report.periods) {
      if (!map.has(period.key)) {
        map.set(period.key, period.label || period.key);
      }
    }
  }
  // Newest first
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Sanitize a string to be a valid Google Sheets tab name.
 * Sheets tab names cannot contain: \ / ? * [ ] : and have a 100-char limit.
 */
export function toSheetTabName(quarterKey: string): string {
  const cleaned = quarterKey.replace(/[\\/?*\[\]:]/g, "_").trim();
  return cleaned.slice(0, 100) || "Sheet";
}
