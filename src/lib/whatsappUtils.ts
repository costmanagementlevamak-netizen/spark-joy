/**
 * WhatsApp utilities using the official wa.me deep link.
 * This is the ONLY permitted method for WhatsApp integration.
 * 
 * PROHIBITED:
 * - api.whatsapp.com
 * - iframes
 * - fetch/axios
 * - automatic redirects
 * - WebViews
 * - unofficial WhatsApp APIs
 * 
 * REQUIRED:
 * - https://wa.me/ links only
 * - User-initiated clicks only
 * - window.open for opening
 */

/**
 * Format phone number for WhatsApp (Ecuador format)
 * Removes non-digits and adds country code if needed
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Remove leading zeros and add Ecuador country code if needed
  if (cleanPhone.startsWith('0')) {
    return '593' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('593') && cleanPhone.length > 0) {
    return '593' + cleanPhone;
  }
  
  return cleanPhone;
}

/**
 * Open WhatsApp with a pre-filled message.
 * MUST be called from a user-initiated click event.
 * 
 * @param phone - Phone number (will be formatted automatically)
 * @param message - Message to pre-fill
 */
export function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  if (!cleanPhone) {
    console.warn('WhatsApp: No valid phone number provided');
    return;
  }
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  // MUST use window.open with user-initiated click
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!newWindow) {
    // Fallback for popup blockers - navigate directly
    window.location.href = url;
  }
}

/**
 * Generate birthday message for a member
 */
export function generateBirthdayMessage(firstName: string): string {
  return (
    `Estimado H∴ ${firstName},\n\n` +
    `Reciba un fraternal saludo en este día especial.\n` +
    `La Logia le desea un feliz cumpleaños, lleno de salud, sabiduría y prosperidad.\n\n` +
    `Con estima y fraternidad.`
  );
}

/**
 * Generate delinquency/debt reminder message for a member
 */
export function generateDebtReminderMessage(
  memberName: string,
  institutionName: string,
  pendingMonths: Array<{ monthName?: string; year: number }>,
  totalOwed: number
): string {
  const firstName = memberName.split(' ')[0];
  const monthsList = pendingMonths
    .slice(0, 6)
    .map(pm => `${pm.monthName || ''} ${pm.year}`)
    .join(', ');
  
  const moreMonths = pendingMonths.length > 6 
    ? ` y ${pendingMonths.length - 6} mes(es) más` 
    : '';

  return (
    `Estimado H∴ ${firstName},\n\n` +
    `Reciba un fraternal saludo de parte de ${institutionName}.\n\n` +
    `Por medio de la presente, le comunicamos que según nuestros registros, ` +
    `usted tiene pendiente el pago de las siguientes cuotas mensuales:\n\n` +
    `📅 Meses pendientes: ${monthsList}${moreMonths}\n` +
    `💰 Total acumulado: $${totalOwed.toFixed(2)}\n\n` +
    `Le solicitamos de la manera más atenta regularizar su situación a la brevedad posible.\n\n` +
    `Quedamos a su disposición para cualquier consulta.\n\n` +
    `Fraternalmente,\n` +
    `Tesorería de ${institutionName}`
  );
}
