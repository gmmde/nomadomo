"use client";

import { useState, useCallback } from "react";

type State = {
  showing: "original" | "translated";
  translations: Record<string, string>;
  loading: boolean;
  err: string | null;
};

export function useTranslate() {
  const [state, setState] = useState<State>({
    showing: "original",
    translations: {},
    loading: false,
    err: null,
  });

  const translate = useCallback(async (fields: Record<string, string>, target: "en" | "ja") => {
    const source: "en" | "ja" = target === "en" ? "ja" : "en";
    setState((s) => ({ ...s, loading: true, err: null }));
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, source, target }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`translate API ${r.status}: ${txt.slice(0, 120)}`);
      }
      const data = (await r.json()) as { translations?: Record<string, string>; error?: string };
      if (data.error) throw new Error(data.error);
      setState({
        showing: "translated",
        translations: data.translations ?? {},
        loading: false,
        err: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "translation failed";
      setState((s) => ({ ...s, loading: false, err: msg }));
    }
  }, []);

  const toggle = useCallback(() => {
    setState((s) => ({ ...s, showing: s.showing === "translated" ? "original" : "translated" }));
  }, []);

  const reset = useCallback(() => {
    setState({ showing: "original", translations: {}, loading: false, err: null });
  }, []);

  return { ...state, translate, toggle, reset };
}
