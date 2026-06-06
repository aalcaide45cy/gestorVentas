import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/date-utils";

export default async function ComisionesPage() {
  const user = await syncUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Datos simulados para dar un aspecto real y premium
  const totalComisiones = 1420;
  const expedientesComisionables = 9;
  const proximoPago = "2026-06-10";
  const proximoBonus = 250;
  const progresoObjetivo = 75; // 75% del objetivo mensual

  const comisionesList = [
    { id: 104, exp: "#EXP-0104", cliente: "Sofía Ruiz", vehiculo: "Renault Clio", fecha: "2026-05-28", tipoPago: "Preference", comision: 150, estado: "Pendiente" },
    { id: 101, exp: "#EXP-0101", cliente: "Carlos Mendoza", vehiculo: "Dacia Sandero", fecha: "2026-05-24", tipoPago: "Renting", comision: 180, estado: "Pagado" },
    { id: 98, exp: "#EXP-0098", cliente: "Marta Gómez", vehiculo: "Renault Captur", fecha: "2026-05-20", tipoPago: "Financiado", comision: 200, estado: "Pagado" },
    { id: 95, exp: "#EXP-0095", cliente: "Alejandro Sanz", vehiculo: "Renault Megane", fecha: "2026-05-18", tipoPago: "Contado", comision: 120, estado: "Pagado" },
    { id: 92, exp: "#EXP-0092", cliente: "Lucía Fernández", vehiculo: "Dacia Duster", fecha: "2026-05-15", tipoPago: "Preference", comision: 150, estado: "Pagado" },
    { id: 89, exp: "#EXP-0089", cliente: "Pedro Jiménez", vehiculo: "Renault Clio", fecha: "2026-05-11", tipoPago: "Financiado", comision: 200, estado: "Pagado" },
    { id: 86, exp: "#EXP-0086", cliente: "Laura Castro", vehiculo: "Dacia Jogger", fecha: "2026-05-08", tipoPago: "Renting", comision: 180, estado: "Pagado" },
    { id: 83, exp: "#EXP-0083", cliente: "Juan Pérez", vehiculo: "Renault Rafale", fecha: "2026-05-05", tipoPago: "Contado", comision: 240, estado: "Pagado" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA / BIENVENIDA */}
      <div>
        <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Comisiones e Incentivos</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Visualiza tus ingresos por comisiones de ventas y el avance hacia tus objetivos mensuales.
        </p>
      </div>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "24px"
      }}>
        {/* KPI 1 */}
        <div className="glass-panel" style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          borderLeft: "4px solid var(--primary)"
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Comisiones Acumuladas
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {totalComisiones} €
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--success)" }}>+12% vs. mes anterior</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          borderLeft: "4px solid var(--secondary)"
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ventas Comisionadas
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {expedientesComisionables}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>expedientes activos</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          borderLeft: "4px solid var(--accent)"
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Próxima Liquidación
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {formatDate(proximoPago)}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Fecha Estimada</span>
          </div>
        </div>
      </div>

      {/* OBJETIVO MENSUAL Y BONUS TIER */}
      <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "4px" }}>
              Objetivo Mensual de Ventas
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Completa 12 expedientes comisionables para activar el bonus adicional de <strong style={{ color: "var(--accent)" }}>{proximoBonus} €</strong>.
            </p>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
            {expedientesComisionables} / 12 Ventas
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div style={{ width: "100%", height: "12px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{
            width: `${progresoObjetivo}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--primary), var(--secondary))",
            borderRadius: "6px",
            transition: "width 0.5s ease-in-out"
          }}></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <span>Progreso: {progresoObjetivo}%</span>
          <span>Faltan 3 ventas para el Bonus Tier</span>
        </div>
      </div>

      {/* TABLA DE DETALLES DE COMISIONES */}
      <div className="glass-panel" style={{ padding: "28px" }}>
        <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "20px" }}>
          Detalle de Liquidación Reciente
        </h2>
        <div className="table-container">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Expediente</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Método Pago</th>
                <th style={{ textAlign: "center" }}>Fecha Venta</th>
                <th style={{ textAlign: "right" }}>Comisión</th>
                <th style={{ textAlign: "center" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {comisionesList.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: "var(--primary)" }}>{item.exp}</td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.cliente}</td>
                  <td>{item.vehiculo}</td>
                  <td>
                    <span className="badge badge-vendedor" style={{ fontSize: "0.75rem" }}>
                      {item.tipoPago}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{formatDate(item.fecha)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.comision} €
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${item.estado === "Pagado" ? "badge-tienda" : "badge-admin"}`} style={{ fontSize: "0.75rem" }}>
                      {item.estado === "Pagado" ? "✓ " : "⏳ "}{item.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
