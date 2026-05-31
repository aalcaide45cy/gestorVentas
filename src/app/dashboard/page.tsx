import { syncUser } from "@/lib/auth-utils";
import Link from "next/link";
import { db } from "@/db";
import { expedientes, clientes } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function DashboardPage() {
  const user = await syncUser();

  if (!user) {
    return null;
  }

  const userRole = user.rol || "invitado";
  const isInvitado = userRole === "invitado";

  // Consultar datos reales de la BD
  const dbExpedientesAll = await db.query.expedientes.findMany();
  const dbClientesAll = await db.query.clientes.findMany();

  const expedientesCount = dbExpedientesAll.length;
  const clientesCount = dbClientesAll.length;
  const ventasTotalesValue = expedientesCount * 28500; // promedio estimado de €28.500 por auto
  const ventasTotalesFormatted = ventasTotalesValue.toLocaleString("es-ES") + " €";

  // Obtener los 5 últimos expedientes para mostrar en el feed de actividad
  const dbExpedientesRecientes = await db.query.expedientes.findMany({
    orderBy: [desc(expedientes.id_expediente)],
    limit: 5,
    with: {
      cliente: true,
      modelo: {
        with: {
          marca: true
        }
      },
      tipoDeVenta: true,
      estadoVehiculo: true
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA / BIENVENIDA */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>¡Hola, {user.nombre}!</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Bienvenido al panel del Gestor de Ventas. Aquí tienes el resumen de hoy.
          </p>
        </div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Fecha de registro: {user.fecha_de_registro}
        </div>
      </div>

      {isInvitado ? (
        /* VISTA PARA ROL INVITADO */
        <div className="glass-panel" style={{
          padding: "40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          borderLeft: "4px solid var(--warning)"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(234, 179, 8, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--warning)",
            marginBottom: "8px"
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.4rem" }}>Cuenta Pendiente de Aprobación</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "500px", lineHeight: "1.6" }}>
            Tu usuario ha sido creado correctamente en el sistema con el rol predeterminado de <strong>Invitado</strong>.
            Para acceder a las herramientas de registro y control de ventas, solicita a un administrador que asigne tu rol definitivo (Vendedor, Jefe de Tienda, etc.).
          </p>
        </div>
      ) : (
        /* VISTA PARA ROLES ACTIVOS */
        <>
          {/* MÉTRICAS CLAVE (GRIDS DE TARJETAS) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px"
          }}>
            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>VOLUMEN VENTAS (EST.)</span>
                <span style={{ color: "var(--success)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{ventasTotalesFormatted}</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Basado en el histórico total</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>EXPEDIENTES TOTALES</span>
                <span style={{ color: "var(--primary)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{expedientesCount}</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Registrados en base de datos</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>CLIENTES REGISTRADOS</span>
                <span style={{ color: "var(--secondary)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{clientesCount}</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Directorio activo</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>TASA DE EFECTIVIDAD</span>
                <span style={{ color: "var(--accent)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>100%</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Ratio de procesamiento</p>
            </div>
          </div>

          {/* EXPEDIENTES RECIENTES */}
          <div className="glass-panel" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.2rem" }}>Últimos Expedientes Activos</h3>
              <Link href="/dashboard/expedientes" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                Ver todos
              </Link>
            </div>

            <div className="table-container">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Vehículo</th>
                    <th>Método de Venta</th>
                    <th>Estado Vehículo</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {dbExpedientesRecientes.map((exp) => (
                    <tr key={exp.id_expediente}>
                      <td style={{ fontWeight: "bold", color: "var(--primary)" }}>
                        #EXP-{String(exp.id_expediente).padStart(4, "0")}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{exp.cliente?.nombre || "Sin Cliente"}</div>
                        {exp.cliente?.dni && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{exp.cliente.dni}</div>}
                      </td>
                      <td>
                        {exp.modelo ? (
                          <>
                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{exp.modelo.nombre_modelo}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{exp.modelo.marca?.nombre}</div>
                          </>
                        ) : "N/D"}
                      </td>
                      <td>
                        <span className="badge badge-zona" style={{ fontSize: "0.7rem" }}>
                          {exp.tipoDeVenta?.nombre_tipo_venta || "N/D"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${exp.estadoVehiculo?.nombre_estado_vehiculo?.toLowerCase() === 'nuevo' ? 'tienda' : 'vendedor'}`}>
                          {exp.estadoVehiculo?.nombre_estado_vehiculo || "N/D"}
                        </span>
                      </td>
                      <td>{exp.fecha_expediente || "N/D"}</td>
                    </tr>
                  ))}
                  {dbExpedientesRecientes.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", padding: "20px" }}>
                        No hay expedientes de venta registrados en la base de datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
