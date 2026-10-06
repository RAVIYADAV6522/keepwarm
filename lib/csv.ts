// Plain CSV for "my data is mine" exports (Excel and Google Sheets open it directly).

type Cell = string | number | boolean | Date | null | undefined;

function cell(value: Cell): string {
  if (value == null) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // A cell starting with = + - @ would run as a formula in a spreadsheet.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
