"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard/buscar?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", position: "relative", width: "320px" }}>
      <input
        type="text"
        className="form-input"
        placeholder="Buscar expediente, matrícula, DNI, cliente..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          padding: "10px 40px 10px 16px",
          fontSize: "0.85rem",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-input)",
          border: "1px solid var(--border-light)",
          color: "var(--text-primary)",
          width: "100%"
        }}
      />
      <button
        type="submit"
        style={{
          position: "absolute",
          right: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  );
}
