const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());

export const isValidOtp = (value: string) => /^\d{6}$/.test(value.trim());
