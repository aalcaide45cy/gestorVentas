import { pgTable, serial, varchar, date, integer, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// TABLA: TIENDAS
export const tiendas = pgTable('tiendas', {
  id_tienda: serial('id_tienda').primaryKey(),
  nombre: text('nombre').notNull(),
  ciudad: varchar('ciudad', { length: 255 }),
});

// TABLA: USUARIOS
export const usuarios = pgTable('usuarios', {
  id_usuario: serial('id_usuario').primaryKey(),
  clerk_id: varchar('clerk_id', { length: 255 }).notNull().unique(),
  nombre: varchar('nombre', { length: 255 }),
  rol: varchar('rol', { length: 50 }), // administrador, director, jefe_zona, jefe_tienda, vendedor, invitado
  fecha_de_registro: date('fecha_de_registro'),
  bloqueado: boolean('bloqueado').default(false),
});

// TABLA: USUARIOS_TIENDAS (Relación Muchos a Muchos N-a-N)
export const usuariosTiendas = pgTable('usuarios_tiendas', {
  id_usuario_tienda: serial('id_usuario_tienda').primaryKey(),
  id_usuario: integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'cascade' }).notNull(),
  id_tienda: integer('id_tienda').references(() => tiendas.id_tienda, { onDelete: 'cascade' }).notNull(),
});

// TABLA: EMAILS_USUARIOS
export const emailsUsuarios = pgTable('emails_usuarios', {
  id_email_usuario: serial('id_email_usuario').primaryKey(),
  id_usuario: integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  tipo_email: varchar('tipo_email', { length: 100 }),
});

// TABLA: TELEFONOS_USUARIOS
export const telefonosUsuarios = pgTable('telefonos_usuarios', {
  id_telefono_usuario: serial('id_telefono_usuario').primaryKey(),
  id_usuario: integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  telefono: varchar('telefono', { length: 50 }).notNull(),
  tipo_telefono: varchar('tipo_telefono', { length: 100 }),
});

// TABLA: CLIENTES
export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  cliente_id: varchar('cliente_id', { length: 255 }).notNull().unique(),
  dni: varchar('dni', { length: 50 }),
  nombre: varchar('nombre', { length: 255 }),
  fecha_de_nacimiento: date('fecha_de_nacimiento'),
  tienda_id: integer('tienda_id').references(() => tiendas.id_tienda),
});

// TABLA: EMAILS_CLIENTES
export const emailsClientes = pgTable('emails_clientes', {
  id_email_cliente: serial('id_email_cliente').primaryKey(),
  id_cliente: integer('id_cliente').references(() => clientes.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  tipo_email: varchar('tipo_email', { length: 100 }),
});

// TABLA: TELEFONOS_CLIENTES
export const telefonosClientes = pgTable('telefonos_clientes', {
  id_telefono_cliente: serial('id_telefono_cliente').primaryKey(),
  id_cliente: integer('id_cliente').references(() => clientes.id, { onDelete: 'cascade' }),
  telefono: varchar('telefono', { length: 50 }).notNull(),
  tipo_telefono: varchar('tipo_telefono', { length: 100 }),
});

// TABLA: MARCAS
export const marcas = pgTable('marcas', {
  id_marca: serial('id_marca').primaryKey(),
  nombre: text('nombre').notNull(),
  activo: boolean('activo').default(true),
});

// TABLA: MODELOS
export const modelos = pgTable('modelos', {
  id_modelo: serial('id_modelo').primaryKey(),
  marca_id: integer('marca_id').references(() => marcas.id_marca, { onDelete: 'cascade' }),
  nombre_modelo: text('nombre_modelo').notNull(),
});

// TABLA: TIPO_DE_VENTA
export const tipoDeVenta = pgTable('tipo_de_venta', {
  id_tipo_de_venta: serial('id_tipo_de_venta').primaryKey(),
  nombre_tipo_venta: text('nombre_tipo_venta').notNull(),
});

// TABLA: ESTADO_VEHICULO
export const estadoVehiculo = pgTable('estado_vehiculo', {
  id_estado_vehiculo: serial('id_estado_vehiculo').primaryKey(),
  nombre_estado_vehiculo: text('nombre_estado_vehiculo').notNull(),
});

// TABLA: EXPEDIENTES
export const expedientes = pgTable('expedientes', {
  id_expediente: serial('id_expediente').primaryKey(),
  id_usuario: integer('id_usuario').references(() => usuarios.id_usuario),
  id_cliente: integer('id_cliente').references(() => clientes.id),
  id_modelo: integer('id_modelo').references(() => modelos.id_modelo),
  id_tienda: integer('id_tienda').references(() => tiendas.id_tienda),
  fecha_expediente: date('fecha_expediente'),
  fecha_afectacion: date('fecha_afectacion'),
  fecha_matriculacion: date('fecha_matriculacion'),
  fecha_entrega: date('fecha_entrega'),
  matricula: varchar('matricula', { length: 50 }),
  id_tipo_de_venta: integer('id_tipo_de_venta').references(() => tipoDeVenta.id_tipo_de_venta),
  id_estado_vehiculo: integer('id_estado_vehiculo').references(() => estadoVehiculo.id_estado_vehiculo),
});

// === RELACIONES DRIZZLE (Para facilitar consultas y joins de TypeScript) ===

export const tiendasRelations = relations(tiendas, ({ many }) => ({
  usuariosTiendas: many(usuariosTiendas),
  clientes: many(clientes),
  expedientes: many(expedientes),
}));

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  emails: many(emailsUsuarios),
  telefonos: many(telefonosUsuarios),
  expedientes: many(expedientes),
  tiendas: many(usuariosTiendas),
}));

export const usuariosTiendasRelations = relations(usuariosTiendas, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [usuariosTiendas.id_usuario],
    references: [usuarios.id_usuario],
  }),
  tienda: one(tiendas, {
    fields: [usuariosTiendas.id_tienda],
    references: [tiendas.id_tienda],
  }),
}));

export const emailsUsuariosRelations = relations(emailsUsuarios, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [emailsUsuarios.id_usuario],
    references: [usuarios.id_usuario],
  }),
}));

export const telefonosUsuariosRelations = relations(telefonosUsuarios, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [telefonosUsuarios.id_usuario],
    references: [usuarios.id_usuario],
  }),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  emails: many(emailsClientes),
  telefonos: many(telefonosClientes),
  expedientes: many(expedientes),
  tienda: one(tiendas, {
    fields: [clientes.tienda_id],
    references: [tiendas.id_tienda],
  }),
}));

export const emailsClientesRelations = relations(emailsClientes, ({ one }) => ({
  cliente: one(clientes, {
    fields: [emailsClientes.id_cliente],
    references: [clientes.id],
  }),
}));

export const telefonosClientesRelations = relations(telefonosClientes, ({ one }) => ({
  cliente: one(clientes, {
    fields: [telefonosClientes.id_cliente],
    references: [clientes.id],
  }),
}));

export const marcasRelations = relations(marcas, ({ many }) => ({
  modelos: many(modelos),
}));

export const modelosRelations = relations(modelos, ({ one, many }) => ({
  marca: one(marcas, {
    fields: [modelos.marca_id],
    references: [marcas.id_marca],
  }),
  expedientes: many(expedientes),
}));

export const expedientesRelations = relations(expedientes, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [expedientes.id_usuario],
    references: [usuarios.id_usuario],
  }),
  cliente: one(clientes, {
    fields: [expedientes.id_cliente],
    references: [clientes.id],
  }),
  modelo: one(modelos, {
    fields: [expedientes.id_modelo],
    references: [modelos.id_modelo],
  }),
  tienda: one(tiendas, {
    fields: [expedientes.id_tienda],
    references: [tiendas.id_tienda],
  }),
  tipoDeVenta: one(tipoDeVenta, {
    fields: [expedientes.id_tipo_de_venta],
    references: [tipoDeVenta.id_tipo_de_venta],
  }),
  estadoVehiculo: one(estadoVehiculo, {
    fields: [expedientes.id_estado_vehiculo],
    references: [estadoVehiculo.id_estado_vehiculo],
  }),
}));
