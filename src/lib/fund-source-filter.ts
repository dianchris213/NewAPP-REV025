/**
 * Pure filter logic for fund sources (Sumber Dana).
 *
 * Invariant enforced here: a persisted filter must never silently hide every
 * fund source. If a stored filter cannot match any wallet, it is treated as
 * invalid and sanitized back to a neutral value ("all" / empty query), so the
 * list always shows the user's real data instead of an empty state.
 */

export type FundSourceTypeFilter = "all" | string;

export type FundSourceFilters = {
  query: string;
  type: FundSourceTypeFilter;
};

export type FilterableWallet = {
  id: string;
  name: string;
  type: string;
};

export const matchesFilters = (w: FilterableWallet, filters: FundSourceFilters): boolean => {
  const q = filters.query.trim().toLowerCase();
  if (filters.type !== "all" && w.type !== filters.type) return false;
  if (q && !w.name.toLowerCase().includes(q)) return false;
  return true;
};

/** Applies filters without mutating the input array. */
export function filterWallets<T extends FilterableWallet>(
  wallets: readonly T[],
  filters: FundSourceFilters,
): T[] {
  return wallets.filter((w) => matchesFilters(w, filters));
}

export type SanitizeResult = {
  filters: FundSourceFilters;
  /** True when at least one stored filter value had to be discarded. */
  changed: boolean;
  /** Which filters were discarded, for precise announcements. */
  reasons: Array<"type" | "query">;
};

/**
 * Validates persisted filters against the wallets that are actually loaded.
 *
 * - A type filter that matches no wallet is reset to "all".
 * - A query that matches no wallet (after the type check) is cleared.
 *
 * Idempotent: calling it with already-valid filters returns them unchanged,
 * so it is safe to run on every render/hydration pass without a one-shot ref.
 */
export function sanitizeFilters(
  wallets: readonly FilterableWallet[],
  filters: FundSourceFilters,
): SanitizeResult {
  const reasons: SanitizeResult["reasons"] = [];
  let type = filters.type;
  let query = filters.query;

  if (wallets.length === 0) {
    return { filters: { type, query }, changed: false, reasons };
  }

  if (type !== "all" && !wallets.some((w) => w.type === type)) {
    type = "all";
    reasons.push("type");
  }

  if (query.trim() && filterWallets(wallets, { type, query }).length === 0) {
    query = "";
    reasons.push("query");
  }

  return { filters: { type, query }, changed: reasons.length > 0, reasons };
}
