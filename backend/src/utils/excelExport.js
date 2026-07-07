import ExcelJS from "exceljs";

/**
 * Streams an Excel (.xlsx) file to the response.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {{header:string,key:string,width?:number}[]} columns
 * @param {object[]} rows
 * @param {string} [sheetName]
 */
export async function streamExcel(res, filename, columns, rows, sheetName = "Sheet1") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B1628" },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  rows.forEach((row) => sheet.addRow(row));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}
