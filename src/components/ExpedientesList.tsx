"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/date-utils";

interface Cliente {
  id: number;
  dni: string | null;
  nombre: string | null;
}

interface Marca {
  id_marca: number;
  nombre: string;
}

interface Modelo {
  id_modelo: number;
  nombre_modelo: string;
  marca?: Marca | null;
}

interface TipoDeVenta {
  id_tipo_de_venta: number;
  nombre_tipo_venta: string;
  color: string | null;
}

interface EstadoVehiculo {
  id_estado_vehiculo: number;
  nombre_estado_vehiculo: string;
}

interface Usuario {
  id_usuario: number;
  nombre: string | null;
}

interface Expediente {
  id_expediente: number;
  id_usuario: number | null;
  id_cliente: number | null;
  id_modelo: number | null;
  id_tienda: number | null;
  fecha_expediente: string | null;
  fecha_afectacion: string | null;
  fecha_matriculacion: string | null;
  fecha_entrega: string | null;
  matricula: string | null;
  id_tipo_de_venta: number | null;
  id_estado_vehiculo: number | null;
  vin: string | null;
  
  cliente?: Cliente | null;
  modelo?: Modelo | null;
  tipoDeVenta?: TipoDeVenta | null;
  estadoVehiculo?: EstadoVehiculo | null;
  usuario?: Usuario | null;
}

interface ExpedientesListProps {
  expedientesIniciales: Expediente[];
}

export default function ExpedientesList({ expedientesIniciales }: ExpedientesListProps) {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>(expedientesIniciales);
  const [confirmDeleteExpediente, setConfirmDeleteExpediente] = useState<Expediente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Modales y estados para fechas inline
  const [editDateModal, setEditDateModal] = useState<{
    expediente: Expediente;
    fieldName: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega";
    displayName: string;
  } | null>(null);

  const [deleteDateModal, setDeleteDateModal] = useState<{
    expediente: Expediente;
    fieldName: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega";
    displayName: string;
  } | null>(null);

  const [inputDate, setInputDate] = useState("");

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleOpenEditDate = (exp: Expediente, field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega", displayName: string) => {
    const today = new Date().toISOString().split("T")[0];
    setInputDate(today);
    setEditDateModal({ expediente: exp, fieldName: field, displayName });
  };

  const handleSaveDate = async () => {
    if (!editDateModal) return;
    setLoading(true);
    setError(null);

    const { expediente, fieldName, displayName } = editDateModal;

    try {
      const response = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_expediente: expediente.id_expediente,
          expediente: {
            [fieldName]: inputDate || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al actualizar la fecha");
      }

      setExpedientes(prev => prev.map(e => e.id_expediente === expediente.id_expediente ? {
        ...e,
        [fieldName]: inputDate || null,
      } : e));

      showNotification(`Fecha de ${displayName} actualizada correctamente.`, "success");
      setEditDateModal(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error al guardar la fecha.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDate = (exp: Expediente, field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega", displayName: string) => {
    setDeleteDateModal({ expediente: exp, fieldName: field, displayName });
  };

  const handleDeleteDate = async () => {
    if (!deleteDateModal) return;
    setLoading(true);
    setError(null);

    const { expediente, fieldName, displayName } = deleteDateModal;

    try {
      const response = await fetch("/api/expedientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_expediente: expediente.id_expediente,
          expediente: {
            [fieldName]: null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar la fecha");
      }

      setExpedientes(prev => prev.map(e => e.id_expediente === expediente.id_expediente ? {
        ...e,
        [fieldName]: null,
      } : e));

      showNotification(`Fecha de ${displayName} eliminada correctamente.`, "success");
      setDeleteDateModal(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error al eliminar la fecha.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpediente = async () => {
    if (!confirmDeleteExpediente) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/expedientes?id=${confirmDeleteExpediente.id_expediente}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al eliminar el expediente");
      }

      setExpedientes(prev => prev.filter(e => e.id_expediente !== confirmDeleteExpediente.id_expediente));
      showNotification(`Expediente eliminado con éxito.`, "success");
      setConfirmDeleteExpediente(null);
      router.refresh();
    } catch (err: any) {
      showNotification(err.message || "Ocurrió un error inesperado al eliminar el expediente.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Renderizador inline de fecha con botones
  const renderDateField = (
    exp: Expediente,
    field: "fecha_afectacion" | "fecha_matriculacion" | "fecha_entrega",
    displayName: string,
    backgroundColor?: string
  ) => {
    const val = exp[field];
    return (
      <td style={{ textAlign: "center", backgroundColor }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: val ? "var(--text-primary)" : "var(--text-muted)", fontWeight: val ? 500 : 400 }}>
            {formatDate(val)}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => handleOpenEditDate(exp, field, displayName)}
              style={{
                border: "none",
                background: "rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
                fontSize: "0.8rem",
                padding: "4px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              title={`Modificar fecha de ${displayName}`}
              className="glass-panel-interactive"
            >
              ✏️
            </button>
            {val && (
              <button
                onClick={() => handleOpenDeleteDate(exp, field, displayName)}
                style={{
                  border: "none",
                  background: "rgba(239, 68, 68, 0.05)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                title={`Eliminar fecha de ${displayName}`}
                className="glass-panel-interactive"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </td>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* NOTIFICACIONES FLOTANTES */}
      {error && (
        <div className="glass-panel" style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          boxShadow: "var(--shadow-lg)",
          padding: "12px 24px",
          color: "var(--danger)",
          borderLeft: "4px solid var(--danger)",
          background: "rgba(239, 68, 68, 0.95)",
          backdropFilter: "blur(8px)",
          minWidth: "300px",
          textAlign: "center",
          animation: "fadeIn 0.3s ease"
        }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          boxShadow: "var(--shadow-lg)",
          padding: "12px 24px",
          color: "var(--success)",
          borderLeft: "4px solid var(--success)",
          background: "rgba(16, 185, 129, 0.95)",
          backdropFilter: "blur(8px)",
          minWidth: "300px",
          textAlign: "center",
          animation: "fadeIn 0.3s ease"
        }}>
          ✓ {success}
        </div>
      )}

      {/* TABLA DE EXPEDIENTES */}
      <div className="glass-panel" style={{ padding: "8px" }}>
        <div className="table-container">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Tipo Venta</th>
                <th>Estado Vehículo</th>
                <th>Vendedor</th>
                 <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>F. Exp.</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)" }}>F. Afect</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>F. Mat</th>
                <th style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.09)" }}>F. Entrega</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map((exp) => (
                <tr key={exp.id_expediente}>
                  <td style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
                    {exp.cliente?.nombre || "Sin Cliente"}
                  </td>
                  <td>
                    {exp.modelo ? (
                      <>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {exp.modelo.nombre_modelo}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {exp.modelo.marca?.nombre}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>VO (Sin modelo)</span>
                    )}
                    {exp.matricula && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>Matrícula: {exp.matricula}</div>}
                    {exp.vin && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "1px" }}>VIN: {exp.vin}</div>}
                  </td>
                  <td>
                    {exp.tipoDeVenta ? (
                      <span className="badge" style={{
                        fontSize: "0.7rem",
                        padding: "3px 8px",
                        backgroundColor: exp.tipoDeVenta.color || "#3b82f6",
                        color: "#fff"
                      }}>
                        {exp.tipoDeVenta.nombre_tipo_venta}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>N/D</span>
                    )}
                  </td>
                  <td>
                    {exp.estadoVehiculo ? (
                      <span className={`badge badge-${exp.estadoVehiculo.nombre_estado_vehiculo?.toLowerCase() === 'nuevo' ? 'tienda' : 'vendedor'}`} style={{ fontSize: "0.7rem", padding: "3px 8px" }}>
                        {exp.estadoVehiculo.nombre_estado_vehiculo}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>N/D</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{exp.usuario?.nombre || "N/D"}</div>
                  </td>
                   <td style={{ textAlign: "center", backgroundColor: "rgba(128, 128, 128, 0.03)" }}>
                    <span style={{ fontSize: "0.85rem" }}>{formatDate(exp.fecha_expediente)}</span>
                  </td>
                  {renderDateField(exp, "fecha_afectacion", "Afectación", "rgba(128, 128, 128, 0.09)")}
                  {renderDateField(exp, "fecha_matriculacion", "Matriculación", "rgba(128, 128, 128, 0.03)")}
                  {renderDateField(exp, "fecha_entrega", "Entrega", "rgba(128, 128, 128, 0.09)")}
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Link href={`/dashboard/expedientes/editar/${exp.id_expediente}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                        ✏️ Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteExpediente(exp)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          color: "var(--danger)",
                          background: "rgba(239, 68, 68, 0.05)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          marginLeft: "8px",
                          fontWeight: 600,
                          transition: "all 0.2s ease"
                        }}
                        className="glass-panel-interactive"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expedientes.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                    No hay expedientes de venta registrados en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA EDITAR FECHA */}
      {editDateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Establecer fecha de {editDateModal.displayName}
            </h3>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Selecciona Fecha</label>
              <input
                type="date"
                className="form-input"
                value={inputDate}
                onChange={e => setInputDate(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditDateModal(null)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveDate}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ELIMINAR FECHA */}
      {deleteDateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            borderLeft: "4px solid var(--danger)"
          }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0 }}>
              Eliminar fecha de {deleteDateModal.displayName}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>
              ¿Estás seguro de que deseas eliminar la fecha de <strong>{deleteDateModal.displayName}</strong> de este expediente?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteDateModal(null)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDeleteDate}
                disabled={loading}
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {loading ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN DE EXPEDIENTE */}
      {confirmDeleteExpediente && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "450px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            borderLeft: "4px solid var(--danger)"
          }}>
            <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", margin: 0 }}>
              Confirmar Eliminación
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
              ¿Estás seguro de que deseas eliminar permanentemente este expediente? Esta acción no se podrá deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteExpediente(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDeleteExpediente}
                disabled={deleting}
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {deleting ? "Eliminando..." : "Eliminar Expediente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
