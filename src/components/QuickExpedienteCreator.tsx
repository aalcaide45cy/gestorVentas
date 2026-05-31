"use strict";

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TipoVenta {
  id_tipo_de_venta: number;
  nombre_tipo_venta: string;
}

interface Modelo {
  id_modelo: number;
  nombre_modelo: string;
  acceso_rapido: boolean | null;
}

interface Marca {
  id_marca: number;
  nombre: string;
  acceso_rapido: boolean | null;
  modelos: Modelo[];
}

interface QuickExpedienteCreatorProps {
  marcas: Marca[];
  tiposVenta: TipoVenta[];
}

export default function QuickExpedienteCreator({ marcas, tiposVenta }: QuickExpedienteCreatorProps) {
  const router = useRouter();
  const [loadingModelId, setLoadingModelId] = useState<number | null>(null);
  const [loadingTipoVentaId, setLoadingTipoVentaId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleQuickCreate = async (modeloId: number, modeloNombre: string, tipoVentaId: number, tipoVentaNombre: string) => {
    setLoadingModelId(modeloId);
    setLoadingTipoVentaId(tipoVentaId);
    setFeedback(null);

    try {
      const response = await fetch("/api/expedientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expediente: {
            id_modelo: modeloId,
            id_tipo_de_venta: tipoVentaId,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al crear el expediente rápido");
      }

      setFeedback({
        text: `¡Expediente rápido creado con éxito para ${modeloNombre} (${tipoVentaNombre})!`,
        type: "success",
      });
      
      router.refresh();
      
      // Limpiar feedback después de unos segundos
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (error: any) {
      setFeedback({
        text: error.message || "Ocurrió un error inesperado al crear el expediente.",
        type: "error",
      });
    } finally {
      setLoadingModelId(null);
      setLoadingTipoVentaId(null);
    }
  };

  // Filtrar marcas que tengan modelos con acceso rápido
  const marcasConModelos = marcas.filter(m => m.modelos && m.modelos.length > 0);

  if (marcasConModelos.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "28px", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Acceso Rápido a Modelos</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
          No hay marcas o modelos configurados para Acceso Rápido en este momento. Puedes configurarlos en la sección de Administración.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "4px" }}>Acceso Rápido a Modelos</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
          Crea expedientes de venta de forma instantánea pulsando en el método de pago bajo cada modelo.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.9rem",
          background: feedback.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: feedback.type === "success" ? "var(--success)" : "var(--danger)",
          border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "fadeIn 0.3s ease"
        }}>
          {feedback.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {marcasConModelos.map((marca) => (
          <div key={marca.id_marca} style={{
            borderBottom: "1px solid var(--border-light)",
            paddingBottom: "20px",
            lastChild: { borderBottom: "none", paddingBottom: 0 }
          } as any}>
            <h4 style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--primary)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              {marca.nombre}
            </h4>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px"
            }}>
              {marca.modelos.map((modelo) => (
                <div key={modelo.id_modelo} className="glass-panel-interactive" style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "rgba(255, 255, 255, 0.02)"
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {modelo.nombre_modelo}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {tiposVenta.map((tv) => {
                      const isThisLoading = loadingModelId === modelo.id_modelo && loadingTipoVentaId === tv.id_tipo_de_venta;
                      return (
                        <button
                          key={tv.id_tipo_de_venta}
                          onClick={() => handleQuickCreate(modelo.id_modelo, modelo.nombre_modelo, tv.id_tipo_de_venta, tv.nombre_tipo_venta)}
                          disabled={loadingModelId !== null}
                          className="btn-action"
                          style={{
                            fontSize: "0.75rem",
                            padding: "6px 10px",
                            flex: "1 1 auto",
                            minWidth: "70px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            background: isThisLoading ? "rgba(255, 255, 255, 0.1)" : "rgba(var(--primary-rgb, 99, 102, 241), 0.1)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-light)",
                            borderRadius: "4px",
                            cursor: loadingModelId !== null ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                            opacity: loadingModelId !== null && !isThisLoading ? 0.5 : 1
                          }}
                        >
                          {isThisLoading ? (
                            <span className="spinner-mini" style={{
                              width: "12px",
                              height: "12px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid var(--text-primary)",
                              borderRadius: "50%",
                              display: "inline-block",
                              animation: "spin 0.8s linear infinite"
                            }}></span>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          )}
                          {tv.nombre_tipo_venta}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
