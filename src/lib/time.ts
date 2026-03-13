export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isOnOrBefore(left: string, right: string): boolean {
  return left <= right;
}

export function isOnOrAfter(left: string, right: string): boolean {
  return left >= right;
}
