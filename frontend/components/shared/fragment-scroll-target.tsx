"use client";

import { useEffect } from "react";

export function fragmentTargetsElement(
  hash: string,
  targetId: string,
): boolean {
  if (!hash.startsWith("#")) return false;

  const fragment = hash.slice(1);
  if (!fragment) return false;

  try {
    return decodeURIComponent(fragment) === targetId;
  } catch {
    return false;
  }
}

export function FragmentScrollTarget({ targetId }: { targetId: string }): null {
  useEffect(() => {
    if (!fragmentTargetsElement(window.location.hash, targetId)) return;

    document
      .getElementById(targetId)
      ?.scrollIntoView({ block: "start", inline: "nearest" });
  }, [targetId]);

  return null;
}
