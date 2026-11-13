import { describe, expect, it } from "vitest";
import { amountToMinorUnits, currencyFractionDigits, formatMoney } from "./money";
describe("currency precision", () => {
  it.each([["XOF",0],["XAF",0],["GNF",0],["MAD",2],["TND",3],["CDF",2]])("%s uses %i fractional digits",(currency,digits)=>expect(currencyFractionDigits(currency)).toBe(digits));
});
describe("amountToMinorUnits",()=>{
  it("converts zero-decimal CFA amounts",()=>{expect(amountToMinorUnits("12500","XOF")).toBe(12500);expect(amountToMinorUnits("12 500","XAF")).toBe(12500);});
  it("converts currencies with two and three decimals",()=>{expect(amountToMinorUnits("12,50","MAD")).toBe(1250);expect(amountToMinorUnits("1,275","TND")).toBe(1275);});
  it.each(["","0","-4","abc","NaN"])("rejects invalid amount %s",value=>expect(amountToMinorUnits(value,"XOF")).toBeNull());
});
describe("formatMoney",()=>{
  it("formats currencies with native precision",()=>{expect(formatMoney(12500,"XOF")).toContain("12");expect(formatMoney(1250,"MAD")).toContain("12,50");expect(formatMoney(1275,"TND")).toContain("1,275");});
});