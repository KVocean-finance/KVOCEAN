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

function thinBorder(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD3D1C7" } };
  return { top: s, left: s, bottom: s, right: s };
}

/**
 * 한 회사·한 분기 결과물을 양식 표(.xlsx)로 만든다. 섹션을 좌(A~D)·우(F~I) 2단으로
 * 나눠 세로 A4 1페이지에 맞춘다. 금액은 1원 단위(#,##0).
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

  const widths = [20, 15, 11, 11, 2.5, 20, 15, 11, 11];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // 헤더 블록
  ws.mergeCells(1, 1, 1, 9);
  const title = ws.getCell(1, 1);
  title.value = `${data.company} 결과물`;
  title.font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, 9);
  const sub = ws.getCell(2, 1);
  sub.value = `산업분야: ${data.industry || "-"}    |    분기: ${data.periodLabel}    |    금액 단위: 원`;
  sub.font = { size: 10, color: { argb: "FF5F5E5A" } };

  const COLS = ["금액", "비율", "증감율"];

  function writeBlock(colStart: number, startRow: number, block: ReportExcelBlock): number {
    let row = startRow;
    // 섹션 제목
    ws.mergeCells(row, colStart, row, colStart + 3);
    const t = ws.getCell(row, colStart);
    t.value = block.title;
    t.font = { bold: true, size: 11, color: { argb: "FF2C2C2A" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
    t.border = thinBorder();
    for (let c = 1; c <= 3; c++) ws.getCell(row, colStart + c).border = thinBorder();
    row++;
    // 컬럼 헤더
    const h0 = ws.getCell(row, colStart);
    h0.value = "지표";
    h0.font = { bold: true, size: 10, color: { argb: "FF5F5E5A" } };
    h0.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
    h0.border = thinBorder();
    COLS.forEach((label, i) => {
      const hc = ws.getCell(row, colStart + 1 + i);
      hc.value = label;
      hc.font = { bold: true, size: 10, color: { argb: "FF5F5E5A" } };
      hc.alignment = { horizontal: "center" };
      hc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
      hc.border = thinBorder();
    });
    row++;
    // 지표 행들
    for (const line of block.lines) {
      const lc = ws.getCell(row, colStart);
      lc.value = line.label;
      lc.font = { size: 10 };
      lc.alignment = { horizontal: "left" };
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
        xc.font = { size: 10, color: { argb: i === 2 && cell.text?.startsWith("-") ? RED : "FF2C2C2A" } };
        xc.alignment = { horizontal: "right" };
        xc.border = thinBorder();
      });
      row++;
    }
    return row + 1; // 블록 사이 한 줄 띄움
  }

  const BLOCK_START = 4;
  let lr = BLOCK_START;
  for (const b of data.leftBlocks) lr = writeBlock(1, lr, b);
  let rr = BLOCK_START;
  for (const b of data.rightBlocks) rr = writeBlock(6, rr, b);

  const maxRow = Math.max(lr, rr);
  ws.pageSetup.printArea = `A1:I${maxRow}`;

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
