import { NextResponse } from "next/server";

const NOTION_DATABASE_ID = "43a20e49-365f-4fdf-adff-fa946f63b0c7";
const NOTION_VERSION = "2022-06-28";
const TUB_FINISHES = ["Solid", "Gradient", "Metallic", "Celeste's Choice"];

function richText(value: string) {
  const trimmed = value.slice(0, 1900);
  return trimmed ? { rich_text: [{ text: { content: trimmed } }] } : { rich_text: [] };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Honeypot
    if (body.company) return NextResponse.json({ ok: true });

    const name = (body.name || "").trim().slice(0, 200);
    const contact = (body.contact || "").trim().slice(0, 200);
    if (!name || !contact) {
      return NextResponse.json({ ok: false, code: "missing_fields" }, { status: 400 });
    }

    const tubColors = (body.tubColors || [])
      .map((c: string) => (c || "").trim().replace(/,/g, " ").slice(0, 80))
      .filter(Boolean)
      .slice(0, 3);

    const rawFinish = (body.tubFinish || "").trim();
    const tubFinish = TUB_FINISHES.includes(rawFinish) ? rawFinish : "";
    const theme = (body.theme || "").trim().slice(0, 1900);
    const specialRequests = (body.specialRequests || "").trim().slice(0, 1900);

    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) {
      console.error("NOTION_TOKEN not set");
      return NextResponse.json({ ok: false, code: "notion_not_configured" }, { status: 503 });
    }

    const properties: Record<string, unknown> = {
      Name: { title: [{ text: { content: name || "Untitled request" } }] },
      Contact: richText(contact),
      Theme: richText(theme),
      "Special Requests": richText(specialRequests),
      "Tub Colors": { multi_select: tubColors.map((n: string) => ({ name: n })) },
    };

    if (tubFinish) {
      properties["Tub Finish"] = { select: { name: tubFinish } };
    }

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Notion create failed (${res.status}): ${detail.slice(0, 500)}`);
      return NextResponse.json({ ok: false, code: "notion_write_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("cup request failed:", error);
    return NextResponse.json({ ok: false, code: "unknown_error" }, { status: 500 });
  }
}
