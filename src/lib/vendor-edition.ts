export function vendorsForEdition<T extends { edition: string | null }>(vendors: T[], edition: string): T[] {
  return vendors.filter(vendor => vendor.edition === edition);
}