"use strict";

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TipoVenta {
  id_tipo_de_venta: number;
  nombre_tipo_venta: string;
  color?: string | null;
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
  const [loadingModelId, setLoadingModelId] = useState<number | "VO" | null>(null);
  const [loadingTipoVentaId, setLoadingTipoVentaId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleQuickCreate = async (modeloId: number | null, modeloNombre: string, tipoVentaId: number, tipoVentaNombre: string, estadoNombre?: string) => {
    setLoadingModelId(modeloId ?? "VO");
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
            estado_nombre: estadoNombre,
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

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        justifyContent: "center",
        width: "100%"
      }}>
        {marcasConModelos.map((marca) => (
          <div key={marca.id_marca} style={{
            width: "350px",
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: "350px",
            maxWidth: "100%",
            padding: "20px",
            background: "rgba(255, 255, 255, 0.01)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <h4 style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--primary)",
              borderBottom: "1px solid var(--border-light)",
              paddingBottom: "10px",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              {marca.nombre}
            </h4>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%" }}>
              {marca.modelos.map((modelo) => (
                <div key={modelo.id_modelo} className="glass-panel-interactive" style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)",
                  flex: "1 1 200px",
                  minWidth: "160px",
                  maxWidth: "100%"
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {modelo.nombre_modelo}
                  </div>

                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    {tiposVenta.map((tv) => {
                      const isThisLoading = loadingModelId === modelo.id_modelo && loadingTipoVentaId === tv.id_tipo_de_venta;
                      return (
                        <button
                          key={tv.id_tipo_de_venta}
                          onClick={() => handleQuickCreate(modelo.id_modelo, modelo.nombre_modelo, tv.id_tipo_de_venta, tv.nombre_tipo_venta)}
                          disabled={loadingModelId !== null}
                          style={{
                            fontSize: "0.75rem",
                            padding: "8px 4px",
                            flex: "1 1 0px",
                            minWidth: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            background: isThisLoading ? "rgba(255, 255, 255, 0.2)" : (tv.color || "#3b82f6"),
                            color: "#ffffff",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "4px",
                            cursor: loadingModelId !== null ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                            opacity: loadingModelId !== null && !isThisLoading ? 0.5 : 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                          title={`Crear rápido ${modelo.nombre_modelo} - ${tv.nombre_tipo_venta}`}
                          className="glass-panel-interactive"
                        >
                          {isThisLoading ? (
                            <span className="spinner-mini" style={{
                              width: "10px",
                              height: "10px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid var(--text-primary)",
                              borderRadius: "50%",
                              display: "inline-block",
                              animation: "spin 0.8s linear infinite"
                            }}></span>
                          ) : null}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tv.nombre_tipo_venta}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tarjeta VO */}
        <div style={{
          width: "350px",
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: "350px",
          maxWidth: "100%",
          padding: "20px",
          background: "rgba(255, 255, 255, 0.01)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <h4 style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--primary)",
            borderBottom: "1px solid var(--border-light)",
            paddingBottom: "10px",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            VO
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              Crea un expediente rápido para un vehículo usado (sin marca/modelo preasignados).
            </div>

            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              {tiposVenta.map((tv) => {
                const isThisLoading = loadingModelId === "VO" && loadingTipoVentaId === tv.id_tipo_de_venta;
                return (
                  <button
                    key={tv.id_tipo_de_venta}
                    onClick={() => handleQuickCreate(null, "Vehículo Usado (VO)", tv.id_tipo_de_venta, tv.nombre_tipo_venta, "usado")}
                    disabled={loadingModelId !== null}
                    style={{
                      fontSize: "0.75rem",
                      padding: "8px 4px",
                      flex: "1 1 0px",
                      minWidth: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      background: isThisLoading ? "rgba(255, 255, 255, 0.2)" : (tv.color || "#3b82f6"),
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "4px",
                      cursor: loadingModelId !== null ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      opacity: loadingModelId !== null && !isThisLoading ? 0.5 : 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    title={`Crear rápido VO - ${tv.nombre_tipo_venta}`}
                    className="glass-panel-interactive"
                  >
                    {isThisLoading ? (
                      <span className="spinner-mini" style={{
                        width: "10px",
                        height: "10px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid var(--text-primary)",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.8s linear infinite"
                      }}></span>
                    ) : null}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tv.nombre_tipo_venta}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
