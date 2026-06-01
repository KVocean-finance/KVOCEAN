import { google, type sheets_v4 } from "googleapis";

export type SheetsConfig = {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetName: string;
};

export function getSheetsConfig(): SheetsConfig | null {
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !privateKeyRaw || !spreadsheetId) {
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_TAB_NAME ?? "최종결과물"
  };
}

// 계정트리(분류DB 단일 소스) 스프레드시트. 결과물 출력 시트와 다른 문서다.
// env 미설정 시 알려진 트리 문서 id로 폴백 (현재 공개 읽기 가능).
const DEFAULT_TREE_SPREADSHEET_ID = "114f0ecQGCLcEM84p2D5JIo4SwXD6wdeC0Ct8vLzLXP0";

/**
 * 계정트리 시트 읽기 설정. 같은 서비스계정 JWT를 쓰되 트리 문서를 가리킨다.
 * 시트가 공개 읽기든 서비스계정 공유든 둘 다 동작 (잠그면 공유 필요).
 */
export function getTreeSheetsConfig(): { sheets: sheets_v4.Sheets; spreadsheetId: string; tabName: string } | null {
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!email || !privateKeyRaw) {
    return null;
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: process.env.GOOGLE_SHEETS_TREE_SPREADSHEET_ID ?? DEFAULT_TREE_SPREADSHEET_ID,
    tabName: process.env.GOOGLE_SHEETS_TREE_TAB_NAME ?? "통합"
  };
}

/**
 * Non-secret diagnostics about whether each env var is set and looks valid.
 * Used by the sync endpoint to give actionable errors instead of a vague "disabled".
 */
export function getSheetsEnvDiagnostics() {
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  return {
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: {
      present: !!email,
      length: email?.length ?? 0,
      looksLikeEmail: !!email && email.includes("@") && email.includes(".iam.gserviceaccount.com")
    },
    GOOGLE_SHEETS_PRIVATE_KEY: {
      present: !!privateKey,
      length: privateKey?.length ?? 0,
      hasBeginMarker: !!privateKey && privateKey.includes("BEGIN PRIVATE KEY"),
      hasEndMarker: !!privateKey && privateKey.includes("END PRIVATE KEY")
    },
    GOOGLE_SHEETS_SPREADSHEET_ID: {
      present: !!spreadsheetId,
      length: spreadsheetId?.length ?? 0
    }
  };
}
