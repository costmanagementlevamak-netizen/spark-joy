import jsPDF from 'jspdf';
import defaultLogoImg from '@/assets/logo-institucional.png';
import { supabase } from '@/integrations/supabase/client-unsafe';

interface SignatureInfo {
  name: string;
  cargo: string;
  signatureUrl?: string | null;
}

interface ReceiptData {
  receiptNumber: string;
  memberName: string;
  memberDegree?: string;
  concept: string;
  totalAmount: number;
  amountPaid: number;
  paymentDate: string;
  institutionName: string;
  logoUrl?: string | null;
  remainingBalance?: number;
  details?: string[];
  treasurer?: SignatureInfo;
  venerableMaestro?: SignatureInfo;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function numberToWords(n: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  if (n === 0) return 'cero';
  if (n === 100) return 'cien';

  let result = '';
  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);

  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    if (thousands === 1) result += 'mil ';
    else result += numberToWords(thousands) + ' mil ';
  }

  const remainder = intPart % 1000;
  if (remainder >= 100) {
    result += hundreds[Math.floor(remainder / 100)] + ' ';
  }

  const lastTwo = remainder % 100;
  if (lastTwo >= 10 && lastTwo <= 19) {
    result += teens[lastTwo - 10];
  } else {
    if (lastTwo >= 20) {
      result += tens[Math.floor(lastTwo / 10)];
      if (lastTwo % 10 !== 0) {
        result += ' y ' + units[lastTwo % 10];
      }
    } else if (lastTwo > 0) {
      result += units[lastTwo];
    }
  }

  result = result.trim();
  if (decPart > 0) {
    result += ` con ${decPart}/100`;
  } else {
    result += ' con 00/100';
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Generate a clean, formal payment receipt (portrait A4).
 * Visual structure inspired by classic invoice layout:
 *   - Header: Logo (left) + Title & receipt info (right)
 *   - Info block: Recibido de, Concepto
 *   - Amount block: Monto highlighted
 *   - Footer: Two signature columns + institutional footer
 */
export async function generatePaymentReceipt(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const pageWidth = 210;
  const pageHeight = 297;
  const ml = 25; // margin left
  const mr = 25; // margin right
  const cw = pageWidth - ml - mr; // content width

  // ─── HEADER ───────────────────────────────────────────
  let y = 25;

  // Logo (left)
  const logoSrc = data.logoUrl || defaultLogoImg;
  let logoImg = await loadImage(logoSrc);
  if (!logoImg && data.logoUrl) {
    logoImg = await loadImage(defaultLogoImg);
  }
  if (logoImg) {
    const maxW = 30;
    const maxH = 30;
    const r = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    doc.addImage(logoImg, 'PNG', ml, y - 5, logoImg.width * r, logoImg.height * r);
  }

  // Title (right-aligned, large)
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', pageWidth - mr, y + 5, { align: 'right' });

  // Institution name below title
  y += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.institutionName, pageWidth - mr, y, { align: 'right' });

  // Receipt number & date below institution
  y += 8;
  doc.setFontSize(10);
  doc.text(`Recibo N°: ${data.receiptNumber}`, pageWidth - mr, y, { align: 'right' });
  y += 5;
  doc.text(`Fecha: ${formatDate(data.paymentDate)}`, pageWidth - mr, y, { align: 'right' });

  // Separator line
  y += 10;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.6);
  doc.line(ml, y, pageWidth - mr, y);

  // ─── MEMBER INFO BLOCK ────────────────────────────────
  y += 15;
  const labelCol = ml;
  const valueCol = ml + 45;

  doc.setFontSize(11);

  // Recibido de
  doc.setFont('helvetica', 'bold');
  doc.text('Recibido de:', labelCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.memberName, valueCol, y);
  y += 8;

  // Grado (if available)
  if (data.memberDegree) {
    doc.setFont('helvetica', 'bold');
    doc.text('Grado:', labelCol, y);
    doc.setFont('helvetica', 'normal');
    const degreeLabels: Record<string, string> = {
      aprendiz: 'Aprendiz',
      companero: 'Compañero',
      maestro: 'Maestro',
    };
    doc.text(degreeLabels[data.memberDegree] || data.memberDegree, valueCol, y);
    y += 8;
  }

  // Concepto
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto:', labelCol, y);
  doc.setFont('helvetica', 'normal');
  const conceptLines = doc.splitTextToSize(data.concept, cw - 50);
  doc.text(conceptLines, valueCol, y);
  y += conceptLines.length * 6 + 4;

  // Additional details
  if (data.details && data.details.length > 0) {
    y += 4;
    doc.setFontSize(10);
    for (const detail of data.details) {
      doc.text(`• ${detail}`, labelCol + 5, y);
      y += 6;
    }
  }

  // ─── AMOUNT SECTION ───────────────────────────────────
  y += 12;

  // Background box for amount
  const boxY = y;
  const hasRemaining = data.remainingBalance !== undefined && data.remainingBalance > 0;
  const boxH = hasRemaining ? 55 : 45;

  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(ml, boxY, cw, boxH, 3, 3, 'FD');

  y = boxY + 12;

  // Valor total
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Valor de la cuota:', ml + 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.totalAmount.toFixed(2)}`, ml + cw - 10, y, { align: 'right' });
  y += 10;

  // MONTO PAGADO (highlighted)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTO PAGADO:', ml + 10, y);
  doc.text(`$${data.amountPaid.toFixed(2)}`, ml + cw - 10, y, { align: 'right' });
  y += 8;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const amountWords = `(${numberToWords(data.amountPaid)} dólares)`;
  doc.text(amountWords, ml + 10, y);
  doc.setTextColor(0, 0, 0);

  // Remaining balance
  if (hasRemaining) {
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text('Saldo pendiente:', ml + 10, y);
    doc.text(`$${data.remainingBalance!.toFixed(2)}`, ml + cw - 10, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // ─── CONFORMITY TEXT ──────────────────────────────────
  y = boxY + boxH + 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const conformityText = 'Para constancia de lo recibido, se firma el presente comprobante en señal de conformidad.';
  doc.text(conformityText, pageWidth / 2, y, { align: 'center' });

  // ─── SIGNATURES ───────────────────────────────────────
  const sigY = y + 45;
  const sigLineW = 60;
  const leftX = ml + cw * 0.25;
  const rightX = ml + cw * 0.75;

  // Treasurer signature image (right)
  if (data.treasurer?.signatureUrl) {
    const sigImg = await loadImage(data.treasurer.signatureUrl);
    if (sigImg) {
      const r = Math.min(55 / sigImg.width, 28 / sigImg.height);
      doc.addImage(sigImg, 'PNG', rightX - (sigImg.width * r) / 2, sigY - 30, sigImg.width * r, sigImg.height * r);
    }
  }

  // VM signature image (left)
  if (data.venerableMaestro?.signatureUrl) {
    const sigImg = await loadImage(data.venerableMaestro.signatureUrl);
    if (sigImg) {
      const r = Math.min(55 / sigImg.width, 28 / sigImg.height);
      doc.addImage(sigImg, 'PNG', leftX - (sigImg.width * r) / 2, sigY - 30, sigImg.width * r, sigImg.height * r);
    }
  }

  // Signature lines
  doc.setLineWidth(0.4);
  doc.setDrawColor(60, 60, 60);

  // Left: Tesorero
  doc.line(leftX - sigLineW / 2, sigY, leftX + sigLineW / 2, sigY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.treasurer?.name || 'Tesorero', leftX, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(data.treasurer?.cargo || 'Tesorero', leftX, sigY + 10, { align: 'center' });

  // Right: Venerable Maestro
  doc.line(rightX - sigLineW / 2, sigY, rightX + sigLineW / 2, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.venerableMaestro?.name || 'Venerable Maestro', rightX, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(data.venerableMaestro?.cargo || 'Venerable Maestro', rightX, sigY + 10, { align: 'center' });

  // ─── FOOTER ───────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.setLineWidth(0.2);
  doc.line(ml, pageHeight - 20, pageWidth - mr, pageHeight - 20);
  doc.text(
    'Este comprobante de pago es un documento válido emitido por la tesorería de la institución.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);

  return doc;
}

/** Get next sequential receipt number from database */
export async function getNextReceiptNumber(module: 'treasury' | 'extraordinary' | 'degree'): Promise<string> {
  try {
    const { data, error } = await (supabase as any).rpc('get_next_receipt_number', { p_module: module });
    if (error) throw error;
    return data as string;
  } catch (err) {
    console.error('Error getting receipt number:', err);
    const now = new Date();
    const prefix = module === 'treasury' ? 'TSR' : module === 'extraordinary' ? 'EXT' : 'GRD';
    return `${prefix}${now.getTime().toString().slice(-7)}`;
  }
}

export function downloadReceipt(doc: jsPDF, memberName: string) {
  const safeName = memberName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  doc.save(`Recibo_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function getReceiptWhatsAppMessage(
  memberName: string,
  concept: string,
  amountPaid: number,
  remaining?: number
): string {
  const firstName = memberName.split(' ')[0];
  let msg = `Estimado H∴ ${firstName},\n\n` +
    `Se ha registrado su pago correspondiente a: ${concept}\n` +
    `💰 Monto pagado: $${amountPaid.toFixed(2)}\n`;

  if (remaining && remaining > 0) {
    msg += `⚠️ Saldo pendiente: $${remaining.toFixed(2)}\n`;
  }

  msg += `\nFraternalmente,\nTesorería`;
  return msg;
}
