/** States and union territories of India (2026). */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** A short list used for suggestions; any city may be typed. */
export const MAJOR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Varanasi",
  "Srinagar",
  "Amritsar",
  "Coimbatore",
  "Kochi",
  "Thiruvananthapuram",
  "Mysuru",
  "Guwahati",
  "Bhubaneswar",
  "Chandigarh",
  "Dehradun",
  "Noida",
  "Gurugram",
] as const;

/**
 * Normalise an Indian phone number. Accepts "+91 98765 43210", "098765-43210",
 * "9876543210" and landlines with STD codes. Returns E.164 or null.
 */
export function normaliseIndianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let rest = digits;
  if (rest.startsWith("+91")) rest = rest.slice(3);
  else if (rest.startsWith("0091")) rest = rest.slice(4);
  else if (rest.length === 12 && rest.startsWith("91")) rest = rest.slice(2);
  else if (rest.startsWith("0")) rest = rest.slice(1);
  if (rest.includes("+")) return null;
  // Mobile: 10 digits starting 6-9. Landline: STD code + number = 10 digits starting 1-5.
  if (!/^\d{10}$/.test(rest)) return null;
  return `+91${rest}`;
}

export function isValidIndianPhone(input: string) {
  return normaliseIndianPhone(input) !== null;
}

export function formatIndianPhone(e164: string | null | undefined) {
  if (!e164) return "";
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Public emergency numbers in India (shown in safety notices). */
export const INDIA_EMERGENCY = {
  unified: "112",
  ambulance: "108",
  mentalHealth: "14416", // Tele-MANAS
} as const;
