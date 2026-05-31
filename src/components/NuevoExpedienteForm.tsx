"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DropdownItem {
  id: number;
  nombre: string;
}

interface TiendaDropdownItem {
  id: number;
  nombre: string;
  ciudad: string | null;
}

interface NuevoExpedienteFormProps {
  marcas: DropdownItem[];
  modelosPorMarca: Record<number, DropdownItem[]>;
  tiposVenta: DropdownItem[];
  estadosVehiculo: DropdownItem[];
  tiendas: TiendaDropdownItem[];
}

export default function NuevoExpedienteForm({
  marcas,
  modelosPorMarca,
  tiposVenta,
  estadosVehiculo,
  tiendas
}: NuevoExpedienteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estado del Cliente
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [tiendaId, setTiendaId] = useState(tiendas.length === 1 ? String(tiendas[0].id) : "");

  // Subformularios Dinámicos de Emails y Teléfonos
  const [emails, setEmails] = useState([{ email: "", tipo: "Principal" }]);
  const [telefonos, setTelefonos] = useState([{ telefono: "", tipo: "Principal" }]);

  // Estado del Vehículo y Expediente
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<number | "">("");
  const [modeloSeleccionado, setModeloSeleccionado] = useState<number | "">("");
  const [tipoVentaSeleccionado, setTipoVentaSeleccionado] = useState<number | "">("");
  const [estadoVehiculoSeleccionado, setEstadoVehiculoSeleccionado] = useState<number | "">("");

  const [fechaExpediente, setFechaExpediente] = useState(new Date().toISOString().split("T")[0]);
  const [fechaAfectacion, setFechaAfectacion] = useState("");
  const [fechaMatriculacion, setFechaMatriculacion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [matricula, setMatricula] = useState("");

  // Gestión de Emails Dinámicos
  const addEmail = () => setEmails([...emails, { email: "", tipo: "Alternativo" }]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const handleEmailChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index].email = val;
    setEmails(updated);
  };
  const handleEmailTipoChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index].tipo = val;
    setEmails(updated);
  };

  // Gestión de Teléfonos Dinámicos
  const addTelefono = () => setTelefonos([...telefonos, { telefono: "", tipo: "Alternativo" }]);
  const removeTelefono = (index: number) => setTelefonos(telefonos.filter((_, i) => i !== index));
  const handleTelefonoChange = (index: number, val: string) => {
    const updated = [...telefonos];
    updated[index].telefono = val;
    setTelefonos(updated);
  };
  const handleTelefonoTipoChange = (index: number, val: string) => {
    const updated = [...telefonos];
    updated[index].tipo = val;
    setTelefonos(updated);
  };

  // Obtener modelos de la marca seleccionada
  const modelosDisponibles = marcaSeleccionada !== "" ? modelosPorMarca[Number(marcaSeleccionada)] || [] : [];

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones básicas
    if (!dni || !nombre || !modeloSeleccionado || !tipoVentaSeleccionado || !estadoVehiculoSeleccionado) {
      setError("Por favor, completa los campos obligatorios del cliente y el vehículo.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            dni,
            nombre,
            fecha_de_nacimiento: fechaNacimiento || null,
            tienda_id: tiendaId ? Number(tiendaId) : null,
            emails: emails.filter(e => e.email),
            telefonos: telefonos.filter(t => t.telefono)
          },
          expediente: {
            id_modelo: Number(modeloSeleccionado),
            id_tipo_de_venta: Number(tipoVentaSeleccionado),
            id_estado_vehiculo: Number(estadoVehiculoSeleccionado),
            id_tienda: tiendaId ? Number(tiendaId) : null,
            fecha_expediente: fechaExpediente || null,
            fecha_afectacion: fechaAfectacion || null,
            fecha_matriculacion: fechaMatriculacion || null,
            fecha_entrega: fechaEntrega || null,
            matricula: matricula || null
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al guardar el expediente.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/expedientes");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-panel" style={{ padding: "40px", textAlign: "center", borderLeft: "4px solid var(--success)" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>¡Expediente Creado!</h2>
        <p style={{ color: "var(--text-secondary)" }}>El expediente y los datos del cliente se han guardado con éxito. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {error && (
        <div className="glass-panel" style={{ padding: "16px", color: "var(--danger)", borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.05)" }}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Error:</strong>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px" }}>
        {/* SECCIÓN 1: DATOS DEL CLIENTE */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "24px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Datos del Cliente
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">DNI / NIE *</label>
              <input type="text" className="form-input" value={dni} onChange={e => setDni(e.target.value)} placeholder="Ej. 12345678Z" required />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <input type="text" className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Juan Pérez Gómez" required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Nacimiento</label>
              <input type="date" className="form-input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tienda *</label>
              <select
                className="form-select"
                value={tiendaId}
                onChange={e => setTiendaId(e.target.value)}
                required
              >
                <option value="">Selecciona Tienda</option>
                {tiendas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.ciudad ? `(${t.ciudad})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "16px", flexWrap: "wrap" }}>
            {/* SUBFORMULARIO EMAILS CLIENTE */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Correos Electrónicos</span>
                <button type="button" className="btn btn-secondary" onClick={addEmail} style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-sm)" }}>
                  + Añadir
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {emails.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px" }}>
                    <input type="email" className="form-input" placeholder="correo@ejemplo.com" value={item.email} onChange={e => handleEmailChange(idx, e.target.value)} style={{ flex: 2 }} />
                    <select className="form-select" value={item.tipo} onChange={e => handleEmailTipoChange(idx, e.target.value)} style={{ flex: 1 }}>
                      <option value="Principal">Principal</option>
                      <option value="Trabajo">Trabajo</option>
                      <option value="Personal">Personal</option>
                      <option value="Otro">Otro</option>
                    </select>
                    {emails.length > 1 && (
                      <button type="button" className="btn btn-secondary" onClick={() => removeEmail(idx)} style={{ padding: "10px", color: "var(--danger)", border: "1px solid var(--border-light)" }}>
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SUBFORMULARIO TELÉFONOS CLIENTE */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Teléfonos de Contacto</span>
                <button type="button" className="btn btn-secondary" onClick={addTelefono} style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-sm)" }}>
                  + Añadir
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {telefonos.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px" }}>
                    <input type="text" className="form-input" placeholder="Ej. 600123456" value={item.telefono} onChange={e => handleTelefonoChange(idx, e.target.value)} style={{ flex: 2 }} />
                    <select className="form-select" value={item.tipo} onChange={e => handleTelefonoTipoChange(idx, e.target.value)} style={{ flex: 1 }}>
                      <option value="Principal">Principal</option>
                      <option value="Móvil">Móvil</option>
                      <option value="Fijo">Fijo</option>
                      <option value="Trabajo">Trabajo</option>
                    </select>
                    {telefonos.length > 1 && (
                      <button type="button" className="btn btn-secondary" onClick={() => removeTelefono(idx)} style={{ padding: "10px", color: "var(--danger)", border: "1px solid var(--border-light)" }}>
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DETALLES DEL VEHÍCULO Y EXPEDIENTE */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "24px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Detalles de la Venta y Vehículo
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">Marca *</label>
              <select className="form-select" value={marcaSeleccionada} onChange={e => { setMarcaSeleccionada(e.target.value ? Number(e.target.value) : ""); setModeloSeleccionado(""); }} required>
                <option value="">Selecciona Marca</option>
                {marcas.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Modelo *</label>
              <select className="form-select" value={modeloSeleccionado} onChange={e => setModeloSeleccionado(e.target.value ? Number(e.target.value) : "")} disabled={!marcaSeleccionada} required>
                <option value="">Selecciona Modelo</option>
                {modelosDisponibles.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Venta *</label>
              <select className="form-select" value={tipoVentaSeleccionado} onChange={e => setTipoVentaSeleccionado(e.target.value ? Number(e.target.value) : "")} required>
                <option value="">Selecciona Tipo</option>
                {tiposVenta.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de Vehículo *</label>
              <select className="form-select" value={estadoVehiculoSeleccionado} onChange={e => setEstadoVehiculoSeleccionado(e.target.value ? Number(e.target.value) : "")} required>
                <option value="">Selecciona Estado</option>
                {estadosVehiculo.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginTop: "16px" }}>
            <div className="form-group">
              <label className="form-label">Matrícula</label>
              <input type="text" className="form-input" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Ej. 1234BBB" />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Expediente</label>
              <input type="date" className="form-input" value={fechaExpediente} onChange={e => setFechaExpediente(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Afectación</label>
              <input type="date" className="form-input" value={fechaAfectacion} onChange={e => setFechaAfectacion(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Matriculación</label>
              <input type="date" className="form-input" value={fechaMatriculacion} onChange={e => setFechaMatriculacion(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Entrega</label>
              <input type="date" className="form-input" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "8px" }}>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Guardando..." : "Crear Expediente"}
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
