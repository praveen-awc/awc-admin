import clsx, { type ClassValue } from "clsx";

/** Conditional className helper. */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
