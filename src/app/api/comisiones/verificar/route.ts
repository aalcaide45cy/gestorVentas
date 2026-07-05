import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { commissionLiquidations, expedientes } from "@/db/schema";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const idPlan = url.searchParams.get("id_plan");
    if (!idPlan) {
      return NextResponse.json({ message: "Falta id_plan" }, { status: 400 });
    }

    // Buscar liquidación del plan
    const liq = await db.query.commissionLiquidations.findFirst({
      where: eq(commissionLiquidations.id_plan, Number(idPlan)),
      with: {
        lines: true
      }
    });

    if (!liq) {
      return NextResponse.json({ 
        success: false, 
        message: "Este plan no tiene una liquidación calculada todavía. Por favor, abre el plan y haz clic en 'Calcular/Recalcular Liquidación' primero." 
      });
    }

    // Obtener el estado real de comision_cobrada, la matrícula y overrides de los expedientes
    const expIds = liq.lines.map(l => l.id_expediente).filter(id => id !== null) as number[];
    let expedientesData: Record<number, { 
      comision_cobrada: boolean; 
      matricula: string | null;
      comision_coche_real: number | null;
      comision_financiacion_real: number | null;
      conceptos_adicionales: string | null;
      vin: string | null;
    }> = {};

    if (expIds.length > 0) {
      const dbExps = await db.select({
        id_expediente: expedientes.id_expediente,
        comision_cobrada: expedientes.comision_cobrada,
        matricula: expedientes.matricula,
        comision_coche_real: expedientes.comision_coche_real,
        comision_financiacion_real: expedientes.comision_financiacion_real,
        conceptos_adicionales: expedientes.conceptos_adicionales,
        vin: expedientes.vin
      }).from(expedientes).where(inArray(expedientes.id_expediente, expIds));

      dbExps.forEach(e => {
        expedientesData[e.id_expediente] = {
          comision_cobrada: e.comision_cobrada,
          matricula: e.matricula,
          comision_coche_real: e.comision_coche_real,
          comision_financiacion_real: e.comision_financiacion_real,
          conceptos_adicionales: e.conceptos_adicionales,
          vin: e.vin
        };
      });
    }

    const linesWithCobrado = liq.lines.map(l => {
      const exp = l.id_expediente ? expedientesData[l.id_expediente] : null;
      return {
        ...l,
        comision_cobrada: exp ? exp.comision_cobrada : false,
        matricula: exp ? exp.matricula : null,
        vin: exp ? exp.vin : null,
        comision_coche_real: exp ? exp.comision_coche_real : null,
        comision_financiacion_real: exp ? exp.comision_financiacion_real : null,
        conceptos_adicionales: exp ? exp.conceptos_adicionales : null
      };
    });

    return NextResponse.json({ success: true, lines: linesWithCobrado }, { status: 200 });
  } catch (error: any) {
    console.error("Error al obtener líneas de liquidación para verificación:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
