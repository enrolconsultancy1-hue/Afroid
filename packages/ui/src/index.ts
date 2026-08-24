/**
 * @afroid/ui — Component exports.
 */

export * from "./components/button";
export * from "./components/card";
export * from "./components/badge";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
