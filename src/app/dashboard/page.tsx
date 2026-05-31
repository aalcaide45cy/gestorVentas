import { syncUser } from "@/lib/auth-utils";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await syncUser();

  if (!user) {
    return null;
  }

  const userRole = user.rol || "invitado";
  const isInvitado = userRole === "invitado";

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
          {/* MÉTRIQUES CLAVE (GRIDS DE TARJETAS) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px"
          }}>
            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>VENTAS TOTALES</span>
                <span style={{ color: "var(--success)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>124.500 €</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>+12% respecto al mes anterior</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>EXPEDIENTES ACTIVOS</span>
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
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>32</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>4 pendientes de firma</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>NUEVOS CLIENTES</span>
                <span style={{ color: "var(--secondary)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>18</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Este mes de mayo</p>
            </div>

            <div className="glass-panel-interactive" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>TASA DE CIERRE</span>
                <span style={{ color: "var(--accent)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>78.4%</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Eficiencia del equipo</p>
            </div>
          </div>

          {/* EXPEDIENTES RECIENTES */}
          <div className="glass-panel" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.2rem" }}>Últimos Expedientes</h3>
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
                    <th>Modelo</th>
                    <th>Venta</th>
                    <th>Estado Vehículo</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>#EXP-2026-001</td>
                    <td>Juan Pérez Gómez</td>
                    <td>Toyota RAV4 Hybrid</td>
                    <td>Financiación Preference</td>
                    <td><span className="badge badge-tienda">Nuevo</span></td>
                    <td>31/05/2026</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>#EXP-2026-002</td>
                    <td>María López Fernández</td>
                    <td>Hyundai Tucson</td>
                    <td>Contado</td>
                    <td><span className="badge badge-vendedor">Seminuevo</span></td>
                    <td>30/05/2026</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>#EXP-2026-003</td>
                    <td>Carlos Sáez Ruiz</td>
                    <td>Peugeot 3008</td>
                    <td>Financiación Crédito</td>
                    <td><span className="badge badge-admin">Buyback</span></td>
                    <td>28/05/2026</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", color: "var(--primary)" }}>#EXP-2026-004</td>
                    <td>Ana Belén Santos</td>
                    <td>Renault Captur</td>
                    <td>Contado</td>
                    <td><span className="badge badge-invitado">Usado</span></td>
                    <td>25/05/2026</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
