import { useMemo } from 'react';
import { Member } from './useDataCache';
import { isBirthdayToday } from '@/lib/dateUtils';
import { openWhatsApp, formatPhoneForWhatsApp, generateBirthdayMessage } from '@/lib/whatsappUtils';

export interface BirthdayMember extends Member {
  isToday: boolean;
}

/**
 * Hook to check which members have birthdays today
 * Uses centralized system date
 */
export function useBirthdayMembers(members: Member[]): BirthdayMember[] {
  return useMemo(() => {
    return members
      .filter(member => isBirthdayToday(member.birth_date))
      .map(member => ({
        ...member,
        isToday: true,
      }));
  }, [members]);
}

/**
 * Generate WhatsApp deep link with birthday message
 * Uses wa.me which works on both mobile and desktop
 */
export function generateBirthdayWhatsAppLink(member: Member): string {
  const formattedPhone = formatPhoneForWhatsApp(member.phone);
  const firstName = member.full_name.split(' ')[0];
  const message = generateBirthdayMessage(firstName);
  
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp with birthday message for a member
 * MUST be called from a user-initiated click event
 */
export function sendBirthdayWhatsApp(member: Member): void {
  const firstName = member.full_name.split(' ')[0];
  const message = generateBirthdayMessage(firstName);
  openWhatsApp(member.phone || '', message);
}

/**
 * Check if member has birthday today
 */
export function hasBirthdayToday(member: Member): boolean {
  return isBirthdayToday(member.birth_date);
}
