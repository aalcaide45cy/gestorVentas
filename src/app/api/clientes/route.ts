import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clientes, emailsClientes, telefonosClientes, usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar rol del usuario local
    const localUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.clerk_id, userId),
    });

    if (!localUser || localUser.rol === "invitado") {
      return NextResponse.json({ message: "No tienes permisos para crear clientes" }, { status: 403 });
    }

    const body = await req.json();
    const { dni, nombre, fecha_de_nacimiento, tienda_id, emails, telefonos } = body;

    if (!dni || !nombre) {
      return NextResponse.json({ message: "DNI y Nombre son campos obligatorios" }, { status: 400 });
    }

    // Verificar si el cliente ya existe por DNI
    const clienteExistente = await db.query.clientes.findFirst({
      where: eq(clientes.dni, dni),
    });

    if (clienteExistente) {
      return NextResponse.json({ message: "Ya existe un cliente registrado con este DNI/NIE." }, { status: 409 });
    }

    // 1. Insertar el cliente
    const [nuevoCliente] = await db.insert(clientes).values({
      cliente_id: crypto.randomUUID(),
      dni,
      nombre,
      fecha_de_nacimiento: fecha_de_nacimiento || null,
      tienda_id: tienda_id ? Number(tienda_id) : null
    }).returning();

    const clienteId = nuevoCliente.id;

    // 2. Insertar emails
    if (emails && emails.length > 0) {
      await db.insert(emailsClientes).values(
        emails.map((e: any) => ({
          id_cliente: clienteId,
          email: e.email,
          tipo_email: e.tipo || "Principal"
        }))
      );
    }

    // 3. Insertar teléfonos
    if (telefonos && telefonos.length > 0) {
      await db.insert(telefonosClientes).values(
        telefonos.map((t: any) => ({
          id_cliente: clienteId,
          telefono: t.telefono,
          tipo_telefono: t.tipo || "Principal"
        }))
      );
    }

    return NextResponse.json({ success: true, data: nuevoCliente }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear cliente:", error);
    return NextResponse.json({ message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
