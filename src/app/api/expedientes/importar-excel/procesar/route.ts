import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { usuarios, clientes, expedientes, emailsClientes, telefonosClientes } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const localUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.clerk_id, userId),
    });
    if (!localUser || localUser.rol === "invitado") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }

    let processedCount = 0;

    for (const update of updates) {
      const { id_cliente, id_expediente, nif, bastidor, matricula, f_afect, f_mat, email, f_exp, telefono, f_entrega } = update;

      if (!id_cliente || !id_expediente) {
        continue;
      }

      // 1. Actualizar Cliente
      const clientUpdate: any = {};
      if (nif && nif.trim()) {
        clientUpdate.dni = nif.trim();
      }
      if (Object.keys(clientUpdate).length > 0) {
        await db.update(clientes).set(clientUpdate).where(eq(clientes.id, id_cliente));
      }

      // 2. Insertar Email del Cliente si no existe ya
      if (email && email.trim()) {
        const cleanedEmail = email.trim();
        const existingEmail = await db.query.emailsClientes.findFirst({
          where: and(
            eq(emailsClientes.id_cliente, id_cliente),
            ilike(emailsClientes.email, cleanedEmail)
          )
        });

        if (!existingEmail) {
          await db.insert(emailsClientes).values({
            id_cliente,
            email: cleanedEmail,
            tipo_email: "Principal"
          });
        }
      }

      // 2b. Insertar Teléfono del Cliente si no existe ya
      if (telefono && String(telefono).trim()) {
        let rawTel = String(telefono).trim();
        if (rawTel.endsWith(".0")) {
          rawTel = rawTel.slice(0, -2);
        }
        const cleanedTel = rawTel.replace(/[^\d+]/g, "");

        if (cleanedTel) {
          const existingTel = await db.query.telefonosClientes.findFirst({
            where: and(
              eq(telefonosClientes.id_cliente, id_cliente),
              eq(telefonosClientes.telefono, cleanedTel)
            )
          });

          if (!existingTel) {
            await db.insert(telefonosClientes).values({
              id_cliente,
              telefono: cleanedTel,
              tipo_telefono: "Principal"
            });
          }
        }
      }

      // 3. Actualizar Expediente
      const expUpdate: any = {};
      if (bastidor && bastidor.trim()) {
        expUpdate.vin = bastidor.trim();
      }
      if (matricula && matricula.trim()) {
        // Limpiar matrícula (ej: 9512NPP(29-06-2026) -> 9512NPP)
        const cleanedMatricula = matricula.split("(")[0].trim();
        if (cleanedMatricula) {
          expUpdate.matricula = cleanedMatricula;
        }
      }
      if (f_afect) {
        expUpdate.fecha_afectacion = f_afect;
      }
      if (f_mat) {
        expUpdate.fecha_matriculacion = f_mat;
      }
      if (f_exp) {
        expUpdate.fecha_expediente = f_exp;
      }
      if (f_entrega) {
        expUpdate.fecha_entrega = f_entrega;
      }

      if (Object.keys(expUpdate).length > 0) {
        await db.update(expedientes).set(expUpdate).where(eq(expedientes.id_expediente, id_expediente));
      }

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      processedCount,
      message: `Se han actualizado con éxito ${processedCount} expedientes.`
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error al procesar actualizaciones de Excel:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
