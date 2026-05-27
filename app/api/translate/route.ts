import { NextRequest } from "next/server";

export const runtime = "edge";

type ReqBody = {
  fields: Record<string, string>;
  source: "en" | "ja";
  target: "en" | "ja";
};

export async function POST(req: NextRequest) {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const { fields, source, target } = body;
  if (!fields || typeof fields !== "object") {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }
  if (source !== "en" && source !== "ja") {
    return Response.json({ error: "invalid source" }, { status: 400 });
  }
  if (target !== "en" && target !== "ja") {
    return Response.json({ error: "invalid target" }, { status: 400 });
  }
  if (source === target) {
    return Response.json({ translations: fields });
  }

  const langpair = `${source}|${target}`;
  const entries = await Promise.all(
    Object.entries(fields)
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(async ([key, text]) => {
        const clipped = text.slice(0, 500);
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clipped)}&langpair=${langpair}`;
        try {
          const r = await fetch(url, { headers: { Accept: "application/json" } });
          if (!r.ok) return [key, clipped] as const;
          const data = (await r.json()) as { responseData?: { translatedText?: string } };
          return [key, data?.responseData?.translatedText ?? clipped] as const;
        } catch {
          return [key, clipped] as const;
        }
      }),
  );
  return Response.json({ translations: Object.fromEntries(entries) });
}
