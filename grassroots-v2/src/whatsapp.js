// Free WhatsApp sharing: no API, no business account, no cost.
// wa.me/?text=… lets the user pick a chat or group. wa.me/<number>?text=… opens one person.
import { cleanPhone } from "./store/common.js";

export function waLink(text, phone) {
  const n = phone ? cleanPhone(phone) : "";
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
export function openWA(text, phone) {
  window.open(waLink(text, phone), "_blank", "noopener");
}
