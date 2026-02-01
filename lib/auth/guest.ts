const GUEST_KEY = "taxbuddy_guest";

export function setGuestSession(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_KEY, "true");
  }
}

export function isGuestSession(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(GUEST_KEY) === "true";
  }
  return false;
}

export function clearGuestSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_KEY);
  }
}
