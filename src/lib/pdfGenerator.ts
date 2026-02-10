import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import defaultLogoImg from '@/assets/logo-institucional.png';

interface ReportData {
  totalMonthlyIncome: number;
  totalExtraordinaryIncome: number;
  totalExpenses: number;
  balance: number;
  paymentsCount: number;
  pendingCount: number;
  expensesByCategory: Record<string, number>;
  memberPayments: Array<{
    memberName: string;
    totalPaid: number;
    paymentCount: number;
  }>;
  debtors: Array<{
    memberName: string;
    pendingMonths: number;
  }>;
  extraordinaryDetails?: Array<{
    name: string;
    collected: number;
    expected: number;
  }>;
  expensesDetail?: Array<{
    description: string;
    category: string;
    amount: number;
    date: string;
  }>;
}

interface MonthlyBreakdown {
  month: string;
  monthlyIncome: number;
  extraordinaryIncome: number;
  expenses: number;
  balance: number;
}

interface SignatureData {
  treasurerName: string;
  treasurerDegree: string;
  treasurerSignatureUrl?: string | null;
  vmName?: string;
  vmDegree?: string;
  vmSignatureUrl?: string | null;
  logoUrl?: string | null;
}

interface CollectionLetterData {
  memberName: string;
  memberDegree: string;
  institutionName: string;
  monthsOverdue: number;
  totalOwed: number;
  pendingMonths: Array<{ month: number; year: number; amount: number; monthName?: string }>;
  extraordinaryPending?: Array<{ feeName: string; pending: number }>;
  treasurerName: string;
  treasurerDegree: string;
  currentDate: string;
  treasurerSignatureUrl?: string | null;
  vmName?: string;
  vmDegree?: string;
  vmSignatureUrl?: string | null;
  logoUrl?: string | null;
}

const CATEGORIES: Record<string, string> = {
  'alimentacion': 'Alimentación',
  'alquiler': 'Alquiler',
  'servicios': 'Servicios Básicos',
  'articulos': 'Artículos',
  'membresia': 'Membresía',
  'filantropia': 'Filantropía',
  'eventos': 'Eventos',
  'otros': 'Otros',
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper function to add logo to PDF - accepts optional dynamic URL
async function addLogoToPDF(doc: jsPDF, logoUrl?: string | null): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxWidth = 30;
      const maxHeight = 20;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;
      doc.addImage(img, 'PNG', 15, 10, width, height);
      resolve();
    };
    img.onerror = () => {
      if (logoUrl) {
        // Fallback to default static logo
        const fallback = new Image();
        fallback.onload = () => {
          const maxWidth = 30;
          const maxHeight = 20;
          const ratio = Math.min(maxWidth / fallback.width, maxHeight / fallback.height);
          doc.addImage(fallback, 'PNG', 15, 10, fallback.width * ratio, fallback.height * ratio);
          resolve();
        };
        fallback.onerror = () => resolve();
        fallback.src = defaultLogoImg;
      } else {
        resolve();
      }
    };
    img.src = logoUrl || defaultLogoImg;
  });
}

// Helper to load an image from URL for signatures
async function loadImageFromUrl(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Helper: check if content needs a new page, add one if so
function ensureSpace(doc: jsPDF, yPos: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + needed > pageHeight - 20) {
    doc.addPage();
    return 35;
  }
  return yPos;
}

// Helper to add dual signatures to PDF
async function addSignaturesToPDF(doc: jsPDF, yPos: number, signatures: SignatureData): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ensure enough space for signatures
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 35;
  }

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Con estima y fraternidad,', 20, yPos);
  yPos += 12;

  const leftX = 25;
  const rightX = pageWidth / 2 + 15;
  const sigWidth = 50;
  const sigHeight = 18;

  // Treasurer signature (left)
  if (signatures.treasurerSignatureUrl) {
    const sigImg = await loadImageFromUrl(signatures.treasurerSignatureUrl);
    if (sigImg) {
      const ratio = Math.min(sigWidth / sigImg.width, sigHeight / sigImg.height);
      doc.addImage(sigImg, 'PNG', leftX, yPos, sigImg.width * ratio, sigImg.height * ratio);
    }
  }

  // VM signature (right)
  if (signatures.vmSignatureUrl) {
    const sigImg = await loadImageFromUrl(signatures.vmSignatureUrl);
    if (sigImg) {
      const ratio = Math.min(sigWidth / sigImg.width, sigHeight / sigImg.height);
      doc.addImage(sigImg, 'PNG', rightX, yPos, sigImg.width * ratio, sigImg.height * ratio);
    }
  }

  yPos += sigHeight + 2;

  // Lines for signatures
  doc.setLineWidth(0.3);
  doc.line(leftX, yPos, leftX + 60, yPos);
  doc.line(rightX, yPos, rightX + 60, yPos);
  yPos += 4;

  // Names
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const treasurerLabel = `${signatures.treasurerDegree} ${signatures.treasurerName}`.trim().toUpperCase();
  doc.text(treasurerLabel, leftX, yPos);
  
  if (signatures.vmName) {
    const vmLabel = `${signatures.vmDegree || ''} ${signatures.vmName}`.trim().toUpperCase();
    doc.text(vmLabel, rightX, yPos);
  }
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('TESORERO', leftX, yPos);
  if (signatures.vmName) {
    doc.text('VENERABLE MAESTRO', rightX, yPos);
  }

  return yPos + 5;
}

// Add footer to all pages
function addFooterToAllPages(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Guayaquil'
    });
    doc.text(
      `Generado el ${dateStr} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
}

export async function generateMonthlyPDF(
  report: ReportData,
  month: number,
  year: number,
  institutionName: string,
  customTemplate: string,
  signatures?: SignatureData
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const monthName = MONTHS[month - 1];
  
  const logoUrl = signatures?.logoUrl;
  await addLogoToPDF(doc, logoUrl);
  
  let yPos = 35;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(institutionName, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.text('INFORME MENSUAL DE TESORERÍA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthName} ${year}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  // Custom template text
  yPos += 8;
  doc.setFontSize(9);
  const splitTemplate = doc.splitTextToSize(customTemplate, pageWidth - 40);
  doc.text(splitTemplate, 20, yPos);
  yPos += splitTemplate.length * 4 + 4;

  // ─── CUOTAS MENSUALES ─────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUOTAS MENSUALES', 20, yPos);
  
  yPos += 6;
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total recaudado por cuotas mensuales', `$${report.totalMonthlyIncome.toFixed(2)}`],
      ['Miembros que pagaron', report.paymentsCount.toString()],
      ['Miembros que no pagaron', report.pendingCount.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 4;

  // Members who paid
  if (report.memberPayments.filter(m => m.totalPaid > 0).length > 0) {
    yPos = ensureSpace(doc, yPos, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Miembros que pagaron:', 20, yPos);
    yPos += 4;
    autoTable(doc, {
      startY: yPos,
      head: [['Miembro', 'Monto pagado']],
      body: report.memberPayments
        .filter(m => m.totalPaid > 0)
        .map(m => [m.memberName, `$${m.totalPaid.toFixed(2)}`]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 4;
  }

  // Members who did NOT pay
  if (report.debtors.length > 0) {
    yPos = ensureSpace(doc, yPos, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Miembros que NO pagaron:', 20, yPos);
    yPos += 4;
    autoTable(doc, {
      startY: yPos,
      head: [['Miembro']],
      body: report.debtors.map(d => [d.memberName]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── CUOTAS EXTRAORDINARIAS ───────────────────────────
  yPos = ensureSpace(doc, yPos, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUOTAS EXTRAORDINARIAS', 20, yPos);
  
  yPos += 6;
  if (report.extraordinaryDetails && report.extraordinaryDetails.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Nombre de la cuota', 'Valor establecido', 'Valor recaudado', 'Pendiente']],
      body: report.extraordinaryDetails.map(e => [
        e.name,
        `$${e.expected.toFixed(2)}`,
        `$${e.collected.toFixed(2)}`,
        `$${(e.expected - e.collected).toFixed(2)}`
      ]),
      foot: [['TOTAL', '', `$${report.totalExtraordinaryIncome.toFixed(2)}`, '']],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: yPos,
      body: [['No se registraron cuotas extraordinarias en este período']],
      theme: 'plain',
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── GASTOS ───────────────────────────────────────────
  yPos = ensureSpace(doc, yPos, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('GASTOS', 20, yPos);
  
  yPos += 6;
  if (report.expensesDetail && report.expensesDetail.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Descripción', 'Categoría', 'Fecha', 'Monto']],
      body: report.expensesDetail.map(e => [
        e.description,
        CATEGORIES[e.category] || e.category,
        new Date(e.date).toLocaleDateString('es-EC'),
        `$${e.amount.toFixed(2)}`
      ]),
      foot: [['TOTAL DE GASTOS', '', '', `$${report.totalExpenses.toFixed(2)}`]],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: yPos,
      body: [['No se registraron gastos en este período']],
      theme: 'plain',
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── RESUMEN FINANCIERO ───────────────────────────────
  yPos = ensureSpace(doc, yPos, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO DEL PERÍODO', 20, yPos);
  
  yPos += 6;
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total ingresos cuotas mensuales', `$${report.totalMonthlyIncome.toFixed(2)}`],
      ['Total ingresos cuotas extraordinarias', `$${report.totalExtraordinaryIncome.toFixed(2)}`],
      ['Total ingresos', `$${(report.totalMonthlyIncome + report.totalExtraordinaryIncome).toFixed(2)}`],
      ['Total egresos', `$${report.totalExpenses.toFixed(2)}`],
      ['Balance del período', `$${report.balance.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
  });

  // Signatures
  yPos = (doc as any).lastAutoTable.finalY + 8;
  if (signatures) {
    await addSignaturesToPDF(doc, yPos, signatures);
  }

  addFooterToAllPages(doc);
  return doc;
}

export async function generateAnnualPDF(
  report: ReportData,
  year: number,
  institutionName: string,
  customTemplate: string,
  monthlyBreakdown?: MonthlyBreakdown[],
  signatures?: SignatureData
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoUrl = signatures?.logoUrl;
  await addLogoToPDF(doc, logoUrl);
  
  let yPos = 35;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(institutionName, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.text('INFORME ANUAL DE TESORERÍA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Año ${year}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  // Custom template text
  yPos += 8;
  doc.setFontSize(9);
  const splitTemplate = doc.splitTextToSize(customTemplate, pageWidth - 40);
  doc.text(splitTemplate, 20, yPos);
  yPos += splitTemplate.length * 4 + 4;

  // ─── RESUMEN FINANCIERO ANUAL ─────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO ANUAL', 20, yPos);
  
  yPos += 6;
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto Anual']],
    body: [
      ['Total anual cuotas mensuales', `$${report.totalMonthlyIncome.toFixed(2)}`],
      ['Total anual cuotas extraordinarias', `$${report.totalExtraordinaryIncome.toFixed(2)}`],
      ['Total consolidado de ingresos', `$${(report.totalMonthlyIncome + report.totalExtraordinaryIncome).toFixed(2)}`],
      ['Total anual de gastos', `$${report.totalExpenses.toFixed(2)}`],
      ['Balance anual', `$${report.balance.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ─── CUOTAS MENSUALES - DETALLE ───────────────────────
  yPos = ensureSpace(doc, yPos, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUOTAS MENSUALES - DETALLE', 20, yPos);
  yPos += 6;

  // Members who paid during the year
  if (report.memberPayments.filter(m => m.totalPaid > 0).length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Miembros que pagaron en el año:', 20, yPos);
    yPos += 4;
    autoTable(doc, {
      startY: yPos,
      head: [['Miembro', 'Total pagado', 'Meses pagados']],
      body: report.memberPayments
        .filter(m => m.totalPaid > 0)
        .map(m => [m.memberName, `$${m.totalPaid.toFixed(2)}`, m.paymentCount.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 4;
  }

  // Annual debtors
  if (report.debtors.length > 0) {
    yPos = ensureSpace(doc, yPos, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Miembros con pagos pendientes:', 20, yPos);
    yPos += 4;
    autoTable(doc, {
      startY: yPos,
      head: [['Miembro', 'Meses sin pagar']],
      body: report.debtors.map(d => [d.memberName, d.pendingMonths.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── CUOTAS EXTRAORDINARIAS ───────────────────────────
  yPos = ensureSpace(doc, yPos, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE CUOTAS EXTRAORDINARIAS', 20, yPos);
  
  yPos += 6;
  if (report.extraordinaryDetails && report.extraordinaryDetails.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Cuota', 'Valor establecido', 'Valor recaudado', 'Pendiente']],
      body: report.extraordinaryDetails.map(e => [
        e.name,
        `$${e.expected.toFixed(2)}`,
        `$${e.collected.toFixed(2)}`,
        `$${(e.expected - e.collected).toFixed(2)}`
      ]),
      foot: [[
        `Total cuotas: ${report.extraordinaryDetails.length}`, 
        `$${report.extraordinaryDetails.reduce((s, e) => s + e.expected, 0).toFixed(2)}`,
        `$${report.totalExtraordinaryIncome.toFixed(2)}`,
        ''
      ]],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: yPos,
      body: [['No se registraron cuotas extraordinarias en el año']],
      theme: 'plain',
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── MONTHLY BREAKDOWN ────────────────────────────────
  if (monthlyBreakdown && monthlyBreakdown.length > 0) {
    yPos = ensureSpace(doc, yPos, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN MENSUAL COMPARATIVO', 20, yPos);
    
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [['Mes', 'Cuotas Mensuales', 'Extraordinarios', 'Egresos', 'Balance']],
      body: monthlyBreakdown.map(m => [
        m.month,
        `$${m.monthlyIncome.toFixed(2)}`,
        `$${m.extraordinaryIncome.toFixed(2)}`,
        `$${m.expenses.toFixed(2)}`,
        `$${m.balance.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── EGRESOS POR CATEGORÍA ────────────────────────────
  const categoryEntries = Object.entries(report.expensesByCategory);
  if (categoryEntries.length > 0) {
    yPos = ensureSpace(doc, yPos, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EGRESOS ANUALES POR CATEGORÍA', 20, yPos);
    
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [['Categoría', 'Monto Total']],
      body: categoryEntries.map(([cat, amount]) => [
        CATEGORIES[cat] || cat,
        `$${amount.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // Signatures
  if (signatures) {
    await addSignaturesToPDF(doc, yPos, signatures);
  }

  addFooterToAllPages(doc);
  return doc;
}

export async function generateCollectionLetterPDF(data: CollectionLetterData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = 4;
  
  // Add logo
  await addLogoToPDF(doc, data.logoUrl);
  
  let yPos = 35;

  // ─── TITLE ──────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMUNICADO POR MORA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.institutionName, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.setLineWidth(0.4);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);

  yPos += 6;
  
  // Date - right aligned
  doc.setFontSize(9);
  doc.text(`Quito, ${data.currentDate}`, pageWidth - marginRight, yPos, { align: 'right' });
  
  yPos += 8;
  
  // Recipient
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`H∴ ${data.memberName}`, marginLeft, yPos);
  yPos += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Presente.-', marginLeft, yPos);
  
  yPos += 7;
  
  // Body - single compact paragraph
  const bodyText = `Reciba un cordial saludo fraternal. Le informamos que, según nuestros registros, usted mantiene obligaciones pendientes con la ${data.institutionName}. A continuación se detalla el estado de sus cuotas:`;
  
  doc.setFontSize(9);
  let splitText = doc.splitTextToSize(bodyText, contentWidth);
  doc.text(splitText, marginLeft, yPos);
  yPos += splitText.length * lineHeight + 4;
  
  // Monthly debt table
  if (data.pendingMonths && data.pendingMonths.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Cuotas mensuales pendientes:', marginLeft, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [['Mes', 'Año', 'Monto']],
      body: data.pendingMonths.map(pm => {
        const monthName = pm.monthName || MONTHS[pm.month - 1] || '';
        return [monthName, pm.year.toString(), `$${pm.amount.toFixed(2)}`];
      }),
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.2 },
      margin: { left: marginLeft, right: marginRight },
    });
    yPos = (doc as any).lastAutoTable.finalY + 3;
  }

  // Extraordinary debt table
  if (data.extraordinaryPending && data.extraordinaryPending.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Cuotas extraordinarias pendientes:', marginLeft, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [['Cuota', 'Monto']],
      body: data.extraordinaryPending.map(ep => [ep.feeName, `$${ep.pending.toFixed(2)}`]),
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.2 },
      margin: { left: marginLeft, right: marginRight },
    });
    yPos = (doc as any).lastAutoTable.finalY + 3;
  }

  // Total box
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, yPos, contentWidth, 10, 2, 2, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ADEUDADO:', marginLeft + 5, yPos + 7);
  doc.text(`$${data.totalOwed.toFixed(2)}`, pageWidth - marginRight - 5, yPos + 7, { align: 'right' });
  yPos += 14;
  
  // Closing paragraph - single compact text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const closingText = `Le solicitamos regularizar su situación a la brevedad posible. Si considera que existe algún error, comuníquese con el Tesorero para revisión. Confiamos en su disposición para resolver esta situación oportunamente.`;
  splitText = doc.splitTextToSize(closingText, contentWidth);
  doc.text(splitText, marginLeft, yPos);
  yPos += splitText.length * lineHeight + 4;
  
  // Dual signatures
  await addSignaturesToPDF(doc, yPos, {
    treasurerName: data.treasurerName,
    treasurerDegree: data.treasurerDegree,
    treasurerSignatureUrl: data.treasurerSignatureUrl,
    vmName: data.vmName,
    vmDegree: data.vmDegree,
    vmSignatureUrl: data.vmSignatureUrl,
  });

  return doc;
}
