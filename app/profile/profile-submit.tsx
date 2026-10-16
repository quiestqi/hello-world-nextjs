"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function ProfileSubmit({ children, pendingText, secondary = false }: { children: ReactNode; pendingText: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`profile-submit${secondary ? " secondary" : ""}`} type="submit" disabled={pending} aria-busy={pending}>{pending ? pendingText : children}</button>;
}
