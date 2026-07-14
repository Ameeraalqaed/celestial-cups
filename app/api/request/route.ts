import { NextResponse } from "next/server";

const NOTION_DATABASE_ID = "43a20e49-365f-4fdf-adff-fa946f63b0c7";
const NOTION_VERSION = "2026-03-11";
const TUB_FINISHES = ["Solid", "Gradient", "Metallic", "Celeste's Choice"];
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per file, generous after client-side compression

function richText(value: string) {
  const trimmed = value.slice(0, 1900);
  return trimmed ? { rich_text: [{ text: { content: trimmed } }] } : { rich_text: [] };
}

async function uploadFileToNotion(file: File, token: string) {
  const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!createRes.ok) {
    throw new Error(`file_upload_create_failed_${createRes.status}`);
  }
  const created = (await createRes.json()) as { id: string; upload_url: string };

  const sendForm = new FormData();
  sendForm.append("file", file, file.name || "reference.jpg");
  const sendRes = await fetch(created.upload_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
    },
    body: sendForm,
  });
  if (!sendRes.ok) {
    throw new Error(`file_upload_send_failed_${sendRes.status}`);
  }

  return { id: created.id, name: file.name || "reference.jpg" };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    if ((form.get("company") as string | null)?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = ((form.get("name") as string) || "").trim().slice(0, 200);
    const contact = ((form.get("contact") as string) || "").trim().slice(0, 200);
    if (!name || !contact) {
      return NextResponse.json({ ok: false, code: "missing_fields" }, { status: 400 });
    }

    let tubColors: string[] = [];
    try {
      const raw = JSON.parse((form.get("tubColors") as string) || "[]");
      if (Array.isArray(raw)) {
        tubColors = raw
          .map((c) => (typeof c === "string" ? c.trim().replace(/,/g, " ").slice(0, 80) : ""))
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch {
      // ignore malformed input, tubColors stays empty
    }

    const emojiChallenge = ((form.get("emojiChallenge") as string) || "").trim().slice(0, 100);
    const rawFinish = ((form.get("tubFinish") as string) || "").trim();
    const tubFinish = TUB_FINISHES.includes(rawFinish) ? rawFinish : "";
    const theme = ((form.get("theme") as string) || "").trim().slice(0, 1900);
    const specialRequests = ((form.get("specialRequests") as string) || "").trim().slice(0, 1900);

    const images = form
      .getAll("referenceImages")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
      .slice(0, MAX_IMAGES);

    if (images.length === 0) {
      return NextResponse.json({ ok: false, code: "missing_images" }, { status: 400 });
    }
    for (const img of images) {
      if (img.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, code: "image_too_large" }, { status: 400 });
      }
    }

    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) {
      console.error("NOTION_TOKEN not set");
      return NextResponse.json({ ok: false, code: "notion_not_configured" }, { status: 503 });
    }

    let uploadedFiles: { id: string; name: string }[] = [];
    try {
      uploadedFiles = await Promise.all(
        images.map((img) => uploadFileToNotion(img, NOTION_TOKEN)),
      );
    } catch (error) {
      console.error("image upload to Notion failed:", error);
      return NextResponse.json({ ok: false, code: "image_upload_failed" }, { status: 500 });
    }

    const properties: Record<string, unknown> = {
      Name: { title: [{ text: { content: name || "Untitled request" } }] },
      Contact: richText(contact),
      "3 Emoji Challenge": richText(emojiChallenge),
      Theme: richText(theme),
      "Special Requests": richText(specialRequests),
      "Tub Colors": { multi_select: tubColors.map((n: string) => ({ name: n })) },
      "Reference Images": {
        files: uploadedFiles.map((f) => ({
          type: "file_upload",
          file_upload: { id: f.id },
          name: f.name,
        })),
      },
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
