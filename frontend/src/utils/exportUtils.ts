import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

/**
 * Export data to Excel with multiple sheets
 */
export function exportToExcel(
  sheets: Array<{
    name: string;
    data: any[];
    headers?: string[];
  }>,
  filename: string
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    let wsData: any[][];

    if (sheet.headers && sheet.headers.length > 0) {
      // Include headers
      wsData = [sheet.headers, ...sheet.data.map((row) => Object.values(row))];
    } else if (sheet.data.length > 0) {
      // Auto-generate headers from first row keys
      const firstRow = sheet.data[0];
      const headers = Object.keys(firstRow);
      wsData = [headers, ...sheet.data.map((row) => headers.map((key) => row[key] || ''))];
    } else {
      wsData = [];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
  });

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${dateStr}.xlsx`);
}

/**
 * Export chart as PNG
 */
export async function exportChartAsPNG(
  chartElementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(chartElementId);
  if (!element) {
    throw new Error(`Chart element with id "${chartElementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
  });

  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
  link.href = url;
  link.click();
}

/**
 * Export chart as SVG
 */
export function exportChartAsSVG(
  svgElement: SVGSVGElement,
  filename: string
): void {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const link = document.createElement('a');
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.svg`;
  link.href = svgUrl;
  link.click();
  URL.revokeObjectURL(svgUrl);
}

/**
 * Format data for Excel export (handles dates, numbers, etc.)
 */
export function formatForExport(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

