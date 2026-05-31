"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarcaItem {
  id_marca: number;
  nombre: string;
  activo: boolean | null;
  modelos: {
    id_modelo: number;
    nombre_modelo: string;
  }[];
}

interface DropdownItem {
  id: number;
  nombre: string;
}

interface AdminCatalogosFormProps {
  marcasIniciales: MarcaItem[];
  tiposVentaIniciales: DropdownItem[];
  estadosVehiculoIniciales: DropdownItem[];
}

export default function AdminCatalogosForm({
  marcasIniciales,
  tiposVentaIniciales,
  estadosVehiculoIniciales
}: AdminCatalogosFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vehiculos" | "ventas">("vehiculos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Datos locales
  const [marcas, setMarcas] = useState<MarcaItem[]>(marcasIniciales);
  const [tiposVenta, setTiposVenta] = useState<DropdownItem[]>(tiposVentaIniciales);
  const [estadosVehiculo, setEstadosVehiculo] = useState<DropdownItem[]>(estadosVehiculoIniciales);

  // Estados de formularios
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [nuevoModeloMarcaId, setNuevoModeloMarcaId] = useState<number | "">("");
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
  const [nuevoTipoVentaNombre, setNuevoTipoVentaNombre] = useState("");
  const [nuevoEstadoVehiculoNombre, setNuevoEstadoVehiculoNombre] = useState("");

  const showNotification = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(text);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  // --- ACCIONES DE CREACIÓN ---

  const handleCrearMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMarcaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", nombre: nuevaMarcaNombre })
      });

      if (!res.ok) throw new Error("Error al crear la marca");
      const result = await res.json();
      
      setMarcas([...marcas, { ...result.data, modelos: [] }]);
      setNuevaMarcaNombre("");
      showNotification("Marca creada correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoModeloMarcaId || !nuevoModeloNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "modelo",
          marca_id: nuevoModeloMarcaId,
          nombre_modelo: nuevoModeloNombre
        })
      });

      if (!res.ok) throw new Error("Error al crear el modelo");
      const result = await res.json();

      setMarcas(marcas.map(m => {
        if (m.id_marca === Number(nuevoModeloMarcaId)) {
          return {
            ...m,
            modelos: [...m.modelos, { id_modelo: result.data.id_modelo, nombre_modelo: result.data.nombre_modelo }]
          };
        }
        return m;
      }));

      setNuevoModeloNombre("");
      showNotification("Modelo creado correctamente", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTipoVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTipoVentaNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tipo_venta", nombre_tipo_venta: nuevoTipoVentaNombre })
      });

      if (!res.ok) throw new Error("Error al crear tipo de venta");
      const result = await res.json();

      setTiposVenta([...tiposVenta, { id: result.data.id_tipo_de_venta, nombre: result.data.nombre_tipo_venta }]);
      setNuevoTipoVentaNombre("");
      showNotification("Tipo de venta creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEstadoVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEstadoVehiculoNombre.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "estado_vehiculo", nombre_estado_vehiculo: nuevoEstadoVehiculoNombre })
      });

      if (!res.ok) throw new Error("Error al crear estado");
      const result = await res.json();

      setEstadosVehiculo([...estadosVehiculo, { id: result.data.id_estado_vehiculo, nombre: result.data.nombre_estado_vehiculo }]);
      setNuevoEstadoVehiculoNombre("");
      showNotification("Estado de vehículo creado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE ELIMINACIÓN / MODIFICACIÓN ---

  const handleToggleMarcaActiva = async (idMarca: number, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "marca", id: idMarca, toggleActivo: true, activo: nuevoEstado })
      });

      if (!res.ok) throw new Error("Error al cambiar estado de la marca");

      setMarcas(marcas.map(m => m.id_marca === idMarca ? { ...m, activo: nuevoEstado } : m));
      showNotification(`Marca ${nuevoEstado ? "activada" : "desactivada"}`, "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarModelo = async (idModelo: number, idMarca: number) => {
    if (!confirm("¿Seguro que deseas eliminar este modelo? Se borrará del catálogo.")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "modelo", id: idModelo })
      });

      if (!res.ok) throw new Error("Error al eliminar modelo");

      setMarcas(marcas.map(m => {
        if (m.id_marca === idMarca) {
          return { ...m, modelos: m.modelos.filter(mod => mod.id_modelo !== idModelo) };
        }
        return m;
      }));
      showNotification("Modelo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarTipoVenta = async (idTipo: number) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de venta?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tipo_venta", id: idTipo })
      });

      if (!res.ok) throw new Error("Error al eliminar");

      setTiposVenta(tiposVenta.filter(t => t.id !== idTipo));
      showNotification("Tipo de venta eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEliminarEstadoVehiculo = async (idEstado: number) => {
    if (!confirm("¿Seguro que deseas eliminar este estado de vehículo?")) return;

    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "estado_vehiculo", id: idEstado })
      });

      if (!res.ok) throw new Error("Error al eliminar");

      setEstadosVehiculo(estadosVehiculo.filter(ev => ev.id !== idEstado));
      showNotification("Estado de vehículo eliminado", "success");
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* NOTIFICACIONES */}
      {error && (
        <div className="glass-panel" style={{ padding: "16px", color: "var(--danger)", borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.05)" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{ padding: "16px", color: "var(--success)", borderLeft: "4px solid var(--success)", background: "rgba(16, 185, 129, 0.05)" }}>
          {success}
        </div>
      )}

      {/* PESTAÑAS (TABS) */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
        <button
          type="button"
          className={`btn ${activeTab === "vehiculos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("vehiculos")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          🚗 Marcas y Modelos
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "ventas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("ventas")}
          style={{ padding: "10px 20px", fontSize: "0.9rem" }}
        >
          💰 Tipos y Estados
        </button>
      </div>

      {activeTab === "vehiculos" ? (
        /* PESTAÑA 1: VEHÍCULOS (MARCAS & MODELOS) */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", flexWrap: "wrap" }}>
          {/* GESTIÓN DE MARCAS */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
              Marcas de Vehículos
            </h3>
            
            <form onSubmit={handleCrearMarca} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre de nueva marca... (Ej. Nissan)"
                value={nuevaMarcaNombre}
                onChange={e => setNuevaMarcaNombre(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: "12px 20px" }} disabled={loading}>
                + Agregar
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
              {marcas.map(m => (
                <div key={m.id_marca} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)"
                }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, color: m.activo ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {m.nombre}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {m.modelos.length} modelo(s)
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleToggleMarcaActiva(m.id_marca, !!m.activo)}
                      style={{ padding: "6px 12px", fontSize: "0.8rem", color: m.activo ? "var(--success)" : "var(--warning)", border: "1px solid var(--border-light)" }}
                    >
                      {m.activo ? "Activa" : "Inactiva"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GESTIÓN DE MODELOS */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Modelos del Catálogo</h3>

            <form onSubmit={handleCrearModelo} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  className="form-select"
                  value={nuevoModeloMarcaId}
                  onChange={e => setNuevoModeloMarcaId(e.target.value ? Number(e.target.value) : "")}
                  required
                  style={{ flex: 1 }}
                >
                  <option value="">Selecciona Marca</option>
                  {marcas.filter(m => m.activo).map(m => (
                    <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre de modelo..."
                  value={nuevoModeloNombre}
                  onChange={e => setNuevoModeloNombre(e.target.value)}
                  disabled={loading || !nuevoModeloMarcaId}
                  required
                  style={{ flex: 2 }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={loading || !nuevoModeloMarcaId}>
                + Agregar Modelo
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
              {marcas.map(m => (
                <div key={m.id_marca} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>{m.nombre}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "4px", paddingLeft: "10px", borderLeft: "2px solid rgba(124, 58, 237, 0.2)" }}>
                    {m.modelos.map(mod => (
                      <div key={mod.id_modelo} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        background: "rgba(255, 255, 255, 0.01)"
                      }}>
                        <span style={{ fontSize: "0.9rem" }}>{mod.nombre_modelo}</span>
                        <button
                          type="button"
                          onClick={() => handleEliminarModelo(mod.id_modelo, m.id_marca)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {m.modelos.length === 0 && (
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Sin modelos</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* PESTAÑA 2: VENTAS (TIPOS DE VENTA & ESTADOS) */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", flexWrap: "wrap" }}>
          {/* TIPOS DE VENTA */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Tipos de Venta</h3>

            <form onSubmit={handleCrearTipoVenta} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nuevo tipo... (Ej. Leasing)"
                value={nuevoTipoVentaNombre}
                onChange={e => setNuevoTipoVentaNombre(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                + Agregar
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto" }}>
              {tiposVenta.map(t => (
                <div key={t.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)"
                }}>
                  <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                  <button
                    type="button"
                    onClick={() => handleEliminarTipoVenta(t.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ESTADOS DE VEHÍCULO */}
          <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Estados del Vehículo</h3>

            <form onSubmit={handleCrearEstadoVehiculo} style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nuevo estado... (Ej. Renting)"
                value={nuevoEstadoVehiculoNombre}
                onChange={e => setNuevoEstadoVehiculoNombre(e.target.value)}
                disabled={loading}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                + Agregar
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto" }}>
              {estadosVehiculo.map(ev => (
                <div key={ev.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)"
                }}>
                  <span style={{ fontWeight: 600 }}>{ev.nombre}</span>
                  <button
                    type="button"
                    onClick={() => handleEliminarEstadoVehiculo(ev.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
