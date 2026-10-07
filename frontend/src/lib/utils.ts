/**
 * F4.1 — Utilitas UI bersama.
 *
 * `cn()` adalah helper standar shadcn/ui untuk menggabungkan class Tailwind
 * dengan aman (conditional class tanpa bentrok). 12 komponen `ui/*` sudah
 * memakainya sejak awal — file ini yang supplying.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}