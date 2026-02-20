import type { Request } from "express";
import { AppError } from "../middlewares/errorHandler";

export function getRequiredRouteParam(req: Request, paramName: string): string {
  const value = req.params[paramName];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
    if (first) {
      return first.trim();
    }
  }

  throw new AppError(400, `Invalid route param: ${paramName}`);
}

