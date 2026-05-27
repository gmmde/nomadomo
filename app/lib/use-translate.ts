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
    setState((s) => ({ ...s, loading: true, err: null }));
    try {
      const source = target === "en" ? "ja" : "en";
      const langpair = `${source}|${target}`;
      const entries = await Promise.all(
        Object.entries(fields)
          .filter(([, v]) => v && v.trim().length > 0)
          .map(async ([key, text]) => {
            try {
              const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${langpair}`;
              const r = await fetch(url);
              const data = await r.json();
              const translated = data?.responseData?.translatedText ?? text;
              return [key, translated] as const;
            } catch {
              return [key, text] as const;
            }
          }),
      );
      setState({ showing: "translated", translations: Object.fromEntries(entries), loading: false, err: null });
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
