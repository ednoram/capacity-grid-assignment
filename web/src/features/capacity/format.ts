const hoursFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export function formatHours(hours: number): string {
  return hoursFormat.format(hours);
}
