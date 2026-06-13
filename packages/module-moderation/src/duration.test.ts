import { describe, expect, it } from "vitest";
import { MAX_TIMEOUT_MS, parseDuration } from "./duration.ts";

describe("parseDuration", () => {
  it("interpreta minutos con sufijo m", () => {
    expect(parseDuration("5m")).toBe(5 * 60_000);
  });

  it("interpreta horas con sufijo h", () => {
    expect(parseDuration("1h")).toBe(60 * 60_000);
  });

  it("interpreta días con sufijo d", () => {
    expect(parseDuration("1d")).toBe(24 * 60 * 60_000);
  });

  it("interpreta segundos con sufijo s", () => {
    expect(parseDuration("30s")).toBe(30_000);
  });

  it("interpreta un número desnudo como minutos", () => {
    expect(parseDuration("10")).toBe(10 * 60_000);
  });

  it("ignora espacios y mayúsculas", () => {
    expect(parseDuration(" 2H ")).toBe(2 * 60 * 60_000);
  });

  it("rechaza valores no parseables devolviendo null", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("5x")).toBeNull();
    expect(parseDuration("-3m")).toBeNull();
  });

  it("rechaza cero o negativo", () => {
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("0")).toBeNull();
  });

  it("rechaza duraciones por encima del máximo de Discord (28 días)", () => {
    expect(parseDuration("29d")).toBeNull();
    expect(parseDuration("28d")).toBe(MAX_TIMEOUT_MS);
  });
});
