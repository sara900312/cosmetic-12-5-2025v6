import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// Basic frontend sanitizers (React already escapes rendering; this protects payloads and URLs)
export function sanitizeText(value, maxLen = 2000) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, maxLen);
  // Remove control chars and HTML brackets to reduce injection vectors before sending to backend
  return trimmed.replace(/[\u0000-\u001F\u007F<>]/g, '');
}

export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed, window.location.origin);
    const allowed = ['http:', 'https:'];
    // إذا كانت القيمة المُدخلة فارغة سابقاً أو غير صالح�� فلن نُرجِع دومًا رابط الموقع
    return allowed.includes(u.protocol) ? u.toString() : '';
  } catch {
    return '';
  }
}

export function safeNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) return min;
  const clamped = Math.max(min, Math.min(max, n));
  return clamped;
}

export async function generateBarcode(supabase) {
  const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  let barcode;
  let isUnique = false;
  while (!isUnique) {
    barcode = generateRandomString(8);
    const { data, error } = await supabase
      .from('products')
      .select('barcode')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      console.error('Error checking barcode uniqueness:', error);
      throw error;
    }

    if (!data) {
      isUnique = true;
    }
  }
  return barcode;
}
