// Mobile Money Payment Link & Redirection Helper (Wave & Orange Money Senegal)

export interface MobileMoneyConfig {
  waveMerchantUrl?: string;
  wavePhone?: string;
  orangeMoneyMerchantCode?: string;
  orangeMoneyPhone?: string;
  freeMoneyPhone?: string;
}

export const defaultMobileMoneyConfig: MobileMoneyConfig = {
  waveMerchantUrl: 'https://pay.wave.com/m/M_fital_immo_dakar',
  wavePhone: '+221 77 845 20 10',
  orangeMoneyMerchantCode: '894210',
  orangeMoneyPhone: '+221 77 845 20 10',
  freeMoneyPhone: '+221 76 540 12 30',
};

/**
 * Clean and format phone numbers for Senegal / International (+221...)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '221770000000';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('221') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 9) {
    return `221${digits}`;
  }
  return digits;
}

/**
 * Generate official Wave Payment Redirection URL
 * Direct Web Checkout or Universal App Deep Link
 */
export function generateWavePaymentUrl(
  amount: number,
  recipientPhoneOrLink: string = defaultMobileMoneyConfig.wavePhone || '+221 77 845 20 10',
  reference?: string
): string {
  const cleanPhone = cleanPhoneNumber(recipientPhoneOrLink);
  const cleanRef = reference ? encodeURIComponent(reference) : `LOYER-${Date.now().toString().slice(-6)}`;
  
  // If a custom Wave merchant link is configured
  if (recipientPhoneOrLink.startsWith('https://pay.wave.com/')) {
    return `${recipientPhoneOrLink}?amount=${amount}&client_reference=${cleanRef}`;
  }
  
  // Universal Wave Checkout / Pay link format
  return `https://pay.wave.com/m/M_fital_immo?amount=${amount}&ref=${cleanRef}&phone=${cleanPhone}`;
}

export const generateWavePaymentLink = generateWavePaymentUrl;

/**
 * Generate Wave App Deep Link for direct opening on mobile devices
 */
export function generateWaveDeepLink(
  amount: number,
  recipientPhone: string = defaultMobileMoneyConfig.wavePhone || '+221 77 845 20 10',
  reference?: string
): string {
  const cleanPhone = cleanPhoneNumber(recipientPhone);
  const cleanRef = reference || `LOYER-${Date.now().toString().slice(-6)}`;
  return `wave://send?phone=${cleanPhone}&amount=${amount}&note=${encodeURIComponent(cleanRef)}`;
}

/**
 * Generate Orange Money USSD code string
 */
export function generateOrangeMoneyUssd(
  merchantCode: string = defaultMobileMoneyConfig.orangeMoneyMerchantCode || '894210',
  amount?: number
): string {
  if (amount && merchantCode) {
    // USSD syntax for Orange Money Marchand Senegal: #144*391*CODE*MONTANT#
    return `#144*391*${merchantCode}*${amount}#`;
  }
  return '#144#';
}

/**
 * Generate Orange Money Click-to-Dial URL for smartphones
 */
export function generateOrangeMoneyDialerUrl(
  merchantCode: string = defaultMobileMoneyConfig.orangeMoneyMerchantCode || '894210',
  amount?: number
): string {
  // Use URL encoded '#' as '%23' for standard tel: protocol
  if (amount && merchantCode) {
    return `tel:*144*391*${merchantCode}*${amount}%23`;
  }
  return 'tel:%23144%23';
}

/**
 * Generate Free Money USSD code & dialer URL
 */
export function generateFreeMoneyDialerUrl(): string {
  return 'tel:%23150%23';
}

/**
 * Generate live QR Code image URL for scanning
 */
export function generatePaymentQRCodeUrl(dataString: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0A111D&bgcolor=FFFFFF&margin=1&data=${encodeURIComponent(
    dataString
  )}`;
}
