export const WEI_PER_GEN = 10n ** 18n;
export function genToWei(gen: bigint | number | string): bigint {
  if (typeof gen === "number" && !Number.isInteger(gen)) throw new Error("GEN amount must be an integer");
  const value = BigInt(gen);
  if (value < 0n) throw new Error("GEN amount cannot be negative");
  return value * WEI_PER_GEN;
}
export function formatGen(wei: bigint | number | string): string {
  const value = BigInt(wei);
  const whole = value / WEI_PER_GEN;
  const fraction = (value % WEI_PER_GEN).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction} GEN`;
}
