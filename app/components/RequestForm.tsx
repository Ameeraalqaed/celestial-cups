"use client";

import { useState } from "react";

const FINISHES = ["Solid", "Gradient", "Metallic", "Celeste's Choice"];
const MAX_COLORS = 3;

type Status = "idle" | "submitting" | "success" | "error";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium tracking-wide text-[#ceaaff]">{children}</span>
      {hint ? <span className="text-xs text-[#ceaaff]/45">{hint}</span> : null}
    </div>
  );
}

export function RequestForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [colorText, setColorText] = useState("");
  const [finish, setFinish] = useState("");
  const [theme, setTheme] = useState("");
  const [special, setSpecial] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!name.trim() || !contact.trim()) {
      setError("Please add your name and a way to reach you.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          tubColors: colorText
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, MAX_COLORS),
          tubFinish: finish,
          theme: theme.trim(),
          specialRequests: special.trim(),
          company,
        }),
      });
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
            setTheme(""); setSpecial(""); setStatus("idle");
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
          <Label hint="optional">Special requests</Label>
          <textarea className="cc-field" value={special} onChange={(e) => setSpecial(e.target.value)} />
        </div>

        {/* Honeypot */}
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
