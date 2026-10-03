import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "./errors";
import { uuid } from "@/lib/validation/common";

/** Resolve a loader, turning "not found" (including other users' IDs) into a 404 page. */
export async function or404<T>(id: string, load: (id: string) => Promise<T>): Promise<T> {
  if (!uuid.safeParse(id).success) notFound();
  try {
    return await load(id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
