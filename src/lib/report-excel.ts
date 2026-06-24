import ExcelJS from "exceljs";

export type ReportExcelCell = { num?: number | null; text?: string };
export type ReportExcelLine = {
  label: string;
  amount: ReportExcelCell;
  ratio: ReportExcelCell;
  growth: ReportExcelCell;
};
export type ReportExcelBlock = { title: string; lines: ReportExcelLine[] };
export type ReportExcelData = {
  company: string;
  industry: string;
  periodLabel: string;
  leftBlocks: ReportExcelBlock[];
  rightBlocks: ReportExcelBlock[];
};

const GRAY = "FFE1E0DF";
const HEADER_GRAY = "FFF1EFE8";
const RED = "FFB91C1C";
const BLOCK_START = 4;
// A4 세로 인쇄 가능 높이(pt) 대략값에서 헤더 블록 제외 — 행 높이 자동 산정에 사용.
const CONTENT_AREA_PT = 740;

function thinBorder(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD3D1C7" } };
  return { top: s, left: s, bottom: s, right: s };
}

/**
 * 한 회사·한 분기 결과물을 양식 표(.xlsx)로 만든다.
 * - 좌(A~D)·우(F~I) 2단. 섹션 배치는 호출부가 정한 leftBlocks/rightBlocks 순서대로.
 * - 좌/우 행 수를 맞춰(짧은 쪽은 블록 사이 여백으로 패딩) 같은 행에서 끝나게 한다.
 * - 행 높이를 내용량에 맞춰 키워 세로 A4 1페이지를 꽉 채운다(아래 여백 최소화).
 * - 금액은 1원 단위(#,##0).
 */
export async function buildReportWorkbook(data: ReportExcelData): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("결과물", {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9, // A4
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4, header: 0.2, footer: 0.2 }
    }
  });

  const widths = [22, 15, 11, 11, 2.5, 22, 15, 11, 11];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // 헤더 블록
  ws.mergeCells(1, 1, 1, 9);
  const title = ws.getCell(1, 1);
  title.value = `${data.company} 결과물`;
  title.font = { bold: true, size: 15 };
  title.alignment = { vertical: "middle" };
  ws.mergeCells(2, 1, 2, 9);
  const sub = ws.getCell(2, 1);
  sub.value = `산업분야: ${data.industry || "-"}    |    분기: ${data.periodLabel}    |    금액 단위: 원`;
  sub.font = { size: 10, color: { argb: "FF5F5E5A" } };
  sub.alignment = { vertical: "middle" };

  const COLS = ["금액", "비율", "증감율"];

  function writeBlock(colStart: number, startRow: number, block: ReportExcelBlock): number {
    let row = startRow;
    // 섹션 제목
    ws.mergeCells(row, colStart, row, colStart + 3);
    const t = ws.getCell(row, colStart);
    t.value = block.title;
    t.font = { bold: true, size: 12, color: { argb: "FF2C2C2A" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
    t.alignment = { vertical: "middle" };
    t.border = thinBorder();
    for (let c = 1; c <= 3; c++) ws.getCell(row, colStart + c).border = thinBorder();
    row++;
    // 컬럼 헤더
    const h0 = ws.getCell(row, colStart);
    h0.value = "지표";
    h0.font = { bold: true, size: 10, color: { argb: "FF5F5E5A" } };
    h0.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
    h0.alignment = { vertical: "middle" };
    h0.border = thinBorder();
    COLS.forEach((label, i) => {
      const hc = ws.getCell(row, colStart + 1 + i);
      hc.value = label;
      hc.font = { bold: true, size: 10, color: { argb: "FF5F5E5A" } };
      hc.alignment = { horizontal: "center", vertical: "middle" };
      hc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
      hc.border = thinBorder();
    });
    row++;
    // 지표 행들
    for (const line of block.lines) {
      const lc = ws.getCell(row, colStart);
      lc.value = line.label;
      lc.font = { size: 11 };
      lc.alignment = { horizontal: "left", vertical: "middle" };
      lc.border = thinBorder();

      const cells: ReportExcelCell[] = [line.amount, line.ratio, line.growth];
      cells.forEach((cell, i) => {
        const xc = ws.getCell(row, colStart + 1 + i);
        if (cell.num !== undefined && cell.num !== null) {
          xc.value = cell.num;
          xc.numFmt = "#,##0";
        } else if (cell.text) {
          xc.value = cell.text;
        }
        xc.font = { size: 11, color: { argb: i === 2 && cell.text?.startsWith("-") ? RED : "FF2C2C2A" } };
        xc.alignment = { horizontal: "right", vertical: "middle" };
        xc.border = thinBorder();
      });
      row++;
    }
    return row; // 다음 시작 행 (블록 사이 여백은 호출측에서)
  }

  // 좌/우 높이 맞춤: 짧은 쪽을 블록 사이 여백으로 패딩해 같은 행에서 끝나게 한다.
  const left = data.leftBlocks;
  const right = data.rightBlocks;
  const unit = (b: ReportExcelBlock) => 2 + b.lines.length;
  const natural = (bs: ReportExcelBlock[]) => bs.reduce((s, b) => s + unit(b), 0);
  const naturalL = natural(left);
  const naturalR = natural(right);
  const internal = (bs: ReportExcelBlock[]) => Math.max(0, bs.length - 1);
  const target = Math.max(naturalL + internal(left), naturalR + internal(right));

  function gapsFor(bs: ReportExcelBlock[], nat: number): number[] {
    const n = bs.length;
    if (n === 0) return [];
    const gaps: number[] = bs.map((_, i) => (i < n - 1 ? 1 : 0));
    let rem = target - nat - gaps.reduce((a, b) => a + b, 0);
    let i = 0;
    while (rem > 0) { gaps[i % n]++; rem--; i++; }
    return gaps;
  }

  function writeSide(colStart: number, bs: ReportExcelBlock[], gaps: number[]) {
    let row = BLOCK_START;
    bs.forEach((b, i) => { row = writeBlock(colStart, row, b); row += gaps[i]; });
  }

  writeSide(1, left, gapsFor(left, naturalL));
  writeSide(6, right, gapsFor(right, naturalR));

  const maxRow = BLOCK_START + target - 1;

  // 행 높이: 내용량에 맞춰 키워 페이지를 채운다(아래 여백 최소화).
  const numContent = Math.max(1, maxRow - BLOCK_START + 1);
  const rowH = Math.max(16, Math.min(30, Math.round(CONTENT_AREA_PT / numContent)));
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 16;
  for (let r = BLOCK_START; r <= maxRow; r++) ws.getRow(r).height = rowH;

  ws.pageSetup.printArea = `A1:I${maxRow}`;

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
