"use client";

import { useRef, useState } from "react";

const FINISHES = ["Solid", "Gradient", "Metallic", "Celeste's Choice"];
const MAX_COLORS = 3;
const MAX_IMAGES = 6;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

type Status = "idle" | "submitting" | "success" | "error";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium tracking-wide text-[#ceaaff]">{children}</span>
      {hint ? <span className="text-xs text-[#ceaaff]/45">{hint}</span> : null}
    </div>
  );
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode_failed"));
    };
    img.src = url;
  });
}

export function RequestForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [colorText, setColorText] = useState("");
  const [finish, setFinish] = useState("");
  const [theme, setTheme] = useState("");
  const [special, setSpecial] = useState("");
  const [company, setCompany] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImageError("");
    const incoming = Array.from(fileList);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const toAdd = incoming.slice(0, room);
    try {
      const compressed = await Promise.all(toAdd.map(compressImage));
      setImages((prev) => [...prev, ...compressed]);
    } catch {
      setImageError("One of those images couldn't be processed. Try a different file.");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setError("");
    if (!name.trim() || !contact.trim()) {
      setError("Please add your name and a way to reach you.");
      setStatus("error");
      return;
    }
    if (images.length === 0) {
      setError("Please attach at least one reference image.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("contact", contact.trim());
      formData.append(
        "tubColors",
        JSON.stringify(
          colorText
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, MAX_COLORS),
        ),
      );
      formData.append("tubFinish", finish);
      formData.append("theme", theme.trim());
      formData.append("specialRequests", special.trim());
      formData.append("company", company);
      images.forEach((img) => formData.append("referenceImages", img, img.name));

      const res = await fetch("/api/request", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) throw new Error("send_failed");
      setStatus("success");
    } catch {
      setError("Something went wrong sending your request. Please try again in a moment.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="cc-rise mx-auto max-w-xl rounded-[28px] border border-[#ceaaff]/25 bg-[#ceaaff]/[0.06] px-8 py-14 text-center">
        <StarBurst />
        <h3 className="mt-5 text-2xl font-semibold text-[#ceaaff]">Your request is in orbit</h3>
        <p className="mt-3 text-[#ceaaff]/70">
          Celeste has your details and will reach out to you soon. Thank you for trusting her with your cup.
        </p>
        <button
          type="button"
          onClick={() => {
            setName(""); setContact(""); setColorText(""); setFinish("");
            setTheme(""); setSpecial(""); setImages([]); setStatus("idle");
          }}
          className="mt-7 rounded-full border border-[#ceaaff]/40 px-6 py-2.5 text-sm font-medium text-[#ceaaff] transition hover:border-[#ceaaff] hover:bg-[#ceaaff]/10"
        >
          Send another request
        </button>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <div className="mx-auto max-w-xl">
      <div className="space-y-6">
        <div>
          <Label>Your name</Label>
          <input className="cc-field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>

        <div>
          <Label hint="phone or WhatsApp">Contact</Label>
          <input className="cc-field" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" />
        </div>

        <div>
          <Label hint={`up to ${MAX_COLORS}, separate with commas`}>Tub color</Label>
          <input className="cc-field" value={colorText} onChange={(e) => setColorText(e.target.value)} />
        </div>

        <div>
          <Label>Tub finish</Label>
          <div className="flex flex-wrap gap-2.5">
            {FINISHES.map((f) => {
              const active = finish === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFinish(active ? "" : f)}
                  className={
                    "rounded-full border px-4 py-2 text-sm transition " +
                    (active
                      ? "border-[#ceaaff] bg-[#ceaaff]/15 text-[#ceaaff]"
                      : "border-[#ceaaff]/20 text-[#ceaaff]/75 hover:border-[#ceaaff]/50")
                  }
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Theme or idea</Label>
          <textarea
            className="cc-field"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Go wild, no idea too crazy or too weird. It could be anything!"
          />
        </div>

        <div>
          <Label hint={`images, up to ${MAX_IMAGES}`}>Reference images</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="w-full rounded-2xl border border-dashed border-[#ceaaff]/35 px-4 py-6 text-sm text-[#ceaaff]/70 transition hover:border-[#ceaaff]/60 hover:text-[#ceaaff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add inspiration images
          </button>

          {imageError ? <p className="mt-2 text-sm text-[#ff9db8]">{imageError}</p> : null}

          {images.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {images.map((img, i) => (
                <li
                  key={`${img.name}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-[#ceaaff]/20 bg-[#ceaaff]/[0.04] px-4 py-2.5 text-sm text-[#ceaaff]/85"
                >
                  <span className="truncate pr-3">{img.name}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="shrink-0 text-[#ceaaff]/60 transition hover:text-[#ceaaff]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <Label hint="optional">Special requests</Label>
          <textarea className="cc-field" value={special} onChange={(e) => setSpecial(e.target.value)} />
        </div>

        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
        </div>

        {status === "error" && error ? <p className="text-sm text-[#ff9db8]">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full rounded-full bg-[#ceaaff] px-6 py-4 text-base font-semibold text-[#160f2e] shadow-[0_0_40px_-8px_rgba(206,170,255,0.6)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Sending your request..." : "Send my cup request"}
        </button>
      </div>
    </div>
  );
}

function StarBurst() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" className="mx-auto" aria-hidden="true">
      <path d="M23 2c1.5 11 8 17.5 19 19-11 1.5-17.5 8-19 19-1.5-11-8-17.5-19-19C15 19.5 21.5 13 23 2Z" fill="#ceaaff" opacity="0.9" />
    </svg>
  );
}
