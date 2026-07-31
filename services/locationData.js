import AsyncStorage from "./storage";

const API_ROOT = "https://countriesnow.space/api/v0.1";
const CACHE_PREFIX = "grassroots_location_v1";
const memoryCache = new Map();

const FALLBACK = {
  Zimbabwe: {
    Harare: ["Harare", "Chitungwiza", "Epworth"],
    Bulawayo: ["Bulawayo"],
    Manicaland: ["Mutare", "Rusape", "Chipinge", "Nyanga"],
    "Mashonaland Central": ["Bindura", "Shamva", "Mazowe"],
    "Mashonaland East": ["Marondera", "Murehwa", "Mutoko"],
    "Mashonaland West": ["Chinhoyi", "Kadoma", "Kariba", "Chegutu"],
    Masvingo: ["Masvingo", "Chiredzi", "Triangle"],
    "Matabeleland North": ["Hwange", "Victoria Falls", "Lupane"],
    "Matabeleland South": ["Gwanda", "Beitbridge", "Plumtree"],
    Midlands: ["Gweru", "Kwekwe", "Zvishavane", "Shurugwi"],
  },
  Botswana: {},
  Mozambique: {},
  "South Africa": {},
  Zambia: {},
};

const cacheKey = (...parts) =>
  `${CACHE_PREFIX}_${parts.map((part) => String(part).toLowerCase()).join("_")}`;

const readCache = async (key) => {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const stored = await AsyncStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.length) {
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
};

const writeCache = async (key, value) => {
  memoryCache.set(key, value);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const request = async (path, body) => {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 9000) : null;
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
    if (!response.ok) throw new Error("Location service unavailable");
    const payload = await response.json();
    if (payload?.error || payload?.data == null)
      throw new Error("Location list unavailable");
    return payload.data;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const alphabetical = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const cleanProvinceName = (name, country) =>
  country === "Zimbabwe" ? String(name).replace(/ Province$/i, "") : String(name);

export const fallbackCountries = () => Object.keys(FALLBACK);

export const fallbackProvinces = (country) =>
  Object.keys(FALLBACK[country] || {}).map((name) => ({ name, apiName: name }));

export const fallbackCities = (country, province) =>
  FALLBACK[country]?.[province] || [];

export async function loadCountries() {
  const key = cacheKey("countries");
  const cached = await readCache(key);
  if (cached) return cached;
  const data = await request("/countries/iso");
  if (!Array.isArray(data)) throw new Error("Country list unavailable");
  const countries = alphabetical(data.map((item) => item?.name));
  const ordered = ["Zimbabwe", ...countries.filter((name) => name !== "Zimbabwe")];
  await writeCache(key, ordered);
  return ordered;
}

export async function loadProvinces(country) {
  const key = cacheKey("provinces", country);
  const cached = await readCache(key);
  if (cached) return cached;
  const data = await request("/countries/states", { country });
  const states = Array.isArray(data) ? data : data?.states;
  if (!Array.isArray(states)) throw new Error("Province list unavailable");
  const provinces = states
    .map((item) => ({
      name: cleanProvinceName(item?.name, country),
      apiName: item?.name,
    }))
    .filter((item) => item.name && item.apiName)
    .sort((a, b) => a.name.localeCompare(b.name));
  await writeCache(key, provinces);
  return provinces;
}

export async function loadCities(country, provinceApiName) {
  const key = cacheKey("cities", country, provinceApiName);
  const cached = await readCache(key);
  if (cached) return cached;
  const data = await request("/countries/state/cities", {
    country,
    state: provinceApiName,
  });
  if (!Array.isArray(data)) throw new Error("City list unavailable");
  const cities = alphabetical(data);
  await writeCache(key, cities);
  return cities;
}
