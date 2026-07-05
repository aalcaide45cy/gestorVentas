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

    // Obtener el estado real de comision_cobrada de los expedientes
    const expIds = liq.lines.map(l => l.id_expediente).filter(id => id !== null) as number[];
    let expedientesCobrados: Record<number, boolean> = {};

    if (expIds.length > 0) {
      const dbExps = await db.select({
        id_expediente: expedientes.id_expediente,
        comision_cobrada: expedientes.comision_cobrada
      }).from(expedientes).where(inArray(expedientes.id_expediente, expIds));

      dbExps.forEach(e => {
        expedientesCobrados[e.id_expediente] = e.comision_cobrada;
      });
    }

    const linesWithCobrado = liq.lines.map(l => ({
      ...l,
      comision_cobrada: l.id_expediente ? (expedientesCobrados[l.id_expediente] || false) : false
    }));

    return NextResponse.json({ success: true, lines: linesWithCobrado }, { status: 200 });
  } catch (error: any) {
    console.error("Error al obtener líneas de liquidación para verificación:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
