import { revalidatePath } from "next/cache";

const PATHS = [
  "/dashboard",
  "/projects",
  "/clients",
  "/invoices",
  "/approvals",
  "/activity",
  "/team",
  "/settings",
  "/notifications",
];

export function refreshWorkspace() {
  for (const path of PATHS) revalidatePath(path);
}
