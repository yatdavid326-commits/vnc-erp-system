import { jsPDF } from 'jspdf';

export interface ReportSummary {
  tipo: string;
  periodo: string;
  total_ventas: number;
  total_compras: number;
  total_ingresos_caja: number;
  total_egresos_caja: number;
  total_clientes: number;
  total_proveedores: number;
  total_productos: number;
  total_asistencias: number;
}

export function createReportPdf(reports: readonly ReportSummary[]): jsPDF {
  const pdf = new jsPDF();
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  reports.forEach((report, index) => {
    if (index > 0) pdf.addPage();
    let y = 22;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('VNC Systems', margin, y);
    y += 11;

    pdf.setFontSize(14);
    pdf.text('Reporte de gestión', margin, y);
    y += 9;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Tipo: ${report.tipo}`, margin, y);
    y += 6;
    pdf.text(`Período: ${report.periodo}`, margin, y);
    y += 11;

    const rows: Array<[string, string]> = [
      ['Ventas', `$${report.total_ventas.toFixed(2)}`],
      ['Compras', `$${report.total_compras.toFixed(2)}`],
      ['Ingresos de caja', `$${report.total_ingresos_caja.toFixed(2)}`],
      ['Egresos de caja', `$${report.total_egresos_caja.toFixed(2)}`],
      ['Clientes', String(report.total_clientes)],
      ['Proveedores', String(report.total_proveedores)],
      ['Productos', String(report.total_productos)],
      ['Asistencias', String(report.total_asistencias)],
    ];

    pdf.setFont('helvetica', 'bold');
    rows.forEach(([label, value]) => {
      if (y + 8 > pageHeight - margin) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(label, margin, y);
      pdf.text(value, pageWidth - margin, y, { align: 'right' });
      pdf.setDrawColor(220);
      pdf.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 10;
    });
  });

  return pdf;
}
