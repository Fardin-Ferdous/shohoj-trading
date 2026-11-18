export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
  isAcceptable: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  let score = 0;
  let label: PasswordStrength['label'] = 'Too weak';

  if (password.length === 0) {
    score = 0;
    label = 'Too weak';
  } else if (passed <= 2) {
    score = 1;
    label = 'Weak';
  } else if (passed === 3) {
    score = 2;
    label = 'Fair';
  } else if (passed === 4) {
    score = 3;
    label = 'Good';
  } else {
    score = 4;
    label = 'Strong';
  }

  return {
    score,
    label,
    checks,
    isAcceptable: checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber,
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const ALLOWED_KYC_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const ALLOWED_KYC_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateKycFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_KYC_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const hasValidMime = ALLOWED_KYC_MIME_TYPES.includes(file.type) || hasValidExt;

  if (!hasValidMime) {
    return 'Please choose a JPG, PNG, or PDF file.';
  }
  if (file.size > MAX_KYC_FILE_BYTES) {
    return 'File is larger than 5 MB. Please pick a smaller file.';
  }
  return null;
}

export function getDeviceLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile Browser';
  if (/Mac/i.test(ua)) return 'Desktop Browser on Mac';
  if (/Windows/i.test(ua)) return 'Desktop Browser on Windows';
  return 'Web Browser';
}
