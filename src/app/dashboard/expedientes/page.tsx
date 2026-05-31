import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/db";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { expedientes } from "@/db/schema";

export default async function ExpedientesPage() {
  const user = await syncUser();

  if (!user || user.rol === "invitado") {
    redirect("/dashboard");
  }

  const userRole = user.rol || "invitado";
  const canCreate = ["administrador", "jefe_tienda", "vendedor"].includes(userRole);

  // Obtener expedientes de la base de datos con relaciones resueltas por Drizzle ORM
  const dbExpedientes = await db.query.expedientes.findMany({
    orderBy: [desc(expedientes.id_expediente)],
    with: {
      cliente: true,
      modelo: {
        with: {
          marca: true
        }
      },
      tipoDeVenta: true,
      estadoVehiculo: true,
      usuario: true
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", marginBottom: "8px" }}>Control de Expedientes</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Listado completo de ventas realizadas y seguimiento de expedientes.
          </p>
        </div>

        {canCreate && (
          <Link href="/dashboard/expedientes/nuevo" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Expediente
          </Link>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {dbExpedientes.length === 0 ? (
        /* VISTA VACÍA */
        <div className="glass-panel" style={{
          padding: "60px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(124, 58, 237, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            marginBottom: "8px"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.4rem" }}>No hay expedientes registrados</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "460px", lineHeight: "1.6" }}>
            Aún no se ha guardado ninguna venta en el sistema. Registra un nuevo expediente para comenzar a llevar el control.
          </p>
          {canCreate && (
            <Link href="/dashboard/expedientes/nuevo" className="btn btn-primary" style={{ marginTop: "8px" }}>
              Registrar Primera Venta
            </Link>
          )}
        </div>
      ) : (
        /* TABLA DE EXPEDIENTES */
        <div className="glass-panel" style={{ padding: "8px" }}>
          <div className="table-container">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Cliente (DNI)</th>
                  <th>Vehículo</th>
                  <th>Tipo Venta</th>
                  <th>Estado Vehículo</th>
                  <th>Vendedor</th>
                  <th>Fechas</th>
                </tr>
              </thead>
              <tbody>
                {dbExpedientes.map((exp) => (
                  <tr key={exp.id_expediente}>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>
                      #EXP-{String(exp.id_expediente).padStart(4, "0")}
                      {exp.matricula && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Matrícula: {exp.matricula}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{exp.cliente?.nombre}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{exp.cliente?.dni}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {exp.modelo?.nombre_modelo}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {exp.modelo?.marca?.nombre}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-zona" style={{ fontSize: "0.7rem", padding: "3px 8px" }}>
                        {exp.tipoDeVenta?.nombre_tipo_venta}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() === 'nuevo' ? 'tienda' : 'vendedor'}`} style={{ fontSize: "0.7rem", padding: "3px 8px" }}>
                        {exp.estadoVehiculo?.nombre_estado_vehiculo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{exp.usuario?.nombre}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {exp.fecha_expediente && <span>📄 Exp: {exp.fecha_expediente}</span>}
                        {exp.fecha_matriculacion && <span>🚗 Matr: {exp.fecha_matriculacion}</span>}
                        {exp.fecha_entrega && <span>📦 Entr: {exp.fecha_entrega}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
