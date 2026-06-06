import { syncUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function InformesPage() {
  const user = await syncUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Datos analíticos simulados
  const totalFacturacion = 214500;
  const ticketPromedio = 23833;
  const expedientesMes = 14;

  const ventasPorMarca = [
    { marca: "Renault", unidades: 8, porcentaje: 66, color: "var(--primary)" },
    { marca: "Dacia", unidades: 4, porcentaje: 34, color: "var(--secondary)" },
  ];

  const ventasPorMetodo = [
    { metodo: "Renting", porcentaje: 40, color: "var(--primary)" },
    { metodo: "Preference", porcentaje: 30, color: "var(--secondary)" },
    { metodo: "Financiado", porcentaje: 20, color: "var(--accent)" },
    { metodo: "Contado", porcentaje: 10, color: "var(--text-muted)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* CABECERA / TITULO */}
      <div>
        <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Informes de Rendimiento</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Consulta métricas estadísticas, volumen total de negocio y distribución de ventas por marcas y métodos de pago.
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
            Volumen de Negocio (Mes)
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {totalFacturacion.toLocaleString()} €
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--success)" }}>+8.4% vs. mes anterior</span>
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
            Ticket Promedio
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {ticketPromedio.toLocaleString()} €
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>por vehículo vendido</span>
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
            Expedientes del Mes
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {expedientesMes}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--success)" }}>12 entregados, 2 en curso</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        gap: "24px"
      }}>
        {/* GRÁFICO 1: VENTAS POR MARCA */}
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>Distribución por Marca</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
            Proporción de vehículos vendidos en el mes actual clasificados por fabricante.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            {ventasPorMarca.map((item) => (
              <div key={item.marca} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.marca}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{item.unidades} uds ({item.porcentaje}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${item.porcentaje}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: "4px"
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 2: VENTAS POR TIPO DE PAGO */}
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>Métodos de Pago Utilizados</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
            Cuota de participación de cada método de pago sobre el total de ventas.
          </p>

          {/* GRÁFICO EN BARRA SEGMENTADA */}
          <div style={{
            display: "flex",
            width: "100%",
            height: "24px",
            borderRadius: "6px",
            overflow: "hidden",
            marginTop: "16px",
            background: "rgba(255, 255, 255, 0.05)"
          }}>
            {ventasPorMetodo.map((item) => (
              <div key={item.metodo} style={{
                width: `${item.porcentaje}%`,
                height: "100%",
                backgroundColor: item.color,
                transition: "width 0.3s ease"
              }} title={`${item.metodo}: ${item.porcentaje}%`}></div>
            ))}
          </div>

          {/* LEYENDA DEL GRÁFICO */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
            marginTop: "8px"
          }}>
            {ventasPorMetodo.map((item) => (
              <div key={item.metodo} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: item.color }}></div>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{item.metodo}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{item.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXPORTAR INFORMES */}
      <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "4px" }}>Descarga y Exportación</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Genera un informe completo consolidado con todas las actividades, expedientes y facturación del periodo actual.
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {/* BOTÓN PDF */}
          <button type="button" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar como PDF
          </button>

          {/* BOTÓN EXCEL */}
          <button type="button" className="btn btn-secondary glass-panel-interactive" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            Generar Hoja Excel
          </button>

          {/* BOTÓN CSV */}
          <button type="button" className="btn btn-secondary glass-panel-interactive" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
