const PHONE_AUTH_DOMAIN = "phone.grassroots.invalid";

export function normalizeZimbabwePhone(value = "") {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `263${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) digits = `263${digits}`;
  return /^2637\d{8}$/.test(digits) ? `+${digits}` : "";
}

export function phoneNumberToAuthEmail(value) {
  const phoneNumber = normalizeZimbabwePhone(value);
  return phoneNumber
    ? `${phoneNumber.slice(1)}@${PHONE_AUTH_DOMAIN}`
    : "";
}

export function isPhoneAuthEmail(value = "") {
  return String(value).toLowerCase().endsWith(`@${PHONE_AUTH_DOMAIN}`);
}

export function phoneNumberFromAuthEmail(value = "") {
  if (!isPhoneAuthEmail(value)) return "";
  const digits = String(value).split("@")[0];
  return /^2637\d{8}$/.test(digits) ? `+${digits}` : "";
}

export function resolvePasswordAuthEmail(identifier = "") {
  const value = String(identifier).trim();
  if (value.includes("@")) return value.toLowerCase();
  return phoneNumberToAuthEmail(value);
}
