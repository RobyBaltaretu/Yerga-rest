// Crea el primer administrador del panel en producción, una sola vez.
//
// Si ya existe algún administrador, no hace nada. Si no, da de alta el correo de
// ADMIN_EMAIL con una contraseña aleatoria que no se guarda ni se muestra, y con cambio
// de contraseña obligatorio. Para entrar, el propietario usa «¿Has olvidado tu
// contraseña?» en /panel/acceso y elige la suya.
//
// Variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL.
// El script no imprime el correo ni ningún secreto (el registro de la CI es público).
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !clave || !correo) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o ADMIN_EMAIL.");
  process.exit(1);
}

const db = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: admins, error: errAdmins } = await db.from("usuario").select("id").eq("rol", "administrador").limit(1);
if (errAdmins) {
  console.error("No se ha podido consultar la tabla usuario:", errAdmins.message);
  process.exit(1);
}
if (admins.length) {
  console.log("Ya hay un administrador: no se crea ninguno.");
  process.exit(0);
}

let id;
const { data: creado, error: errCrear } = await db.auth.admin.createUser({
  email: correo,
  password: randomBytes(32).toString("base64url"),
  email_confirm: true,
  user_metadata: { nombre: "Administrador" },
});
if (creado?.user) {
  id = creado.user.id;
} else {
  // Puede existir ya en Auth (por ejemplo, de un intento anterior a medias).
  for (let pagina = 1; !id; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    id = data.users.find((u) => u.email?.toLowerCase() === correo)?.id;
  }
  if (!id) {
    console.error("No se ha podido crear el usuario en Auth:", errCrear?.message);
    process.exit(1);
  }
}

const { error: errPerfil } = await db
  .from("usuario")
  .upsert({ id, nombre: "Administrador", correo, rol: "administrador", activo: true, debe_cambiar_clave: true });
if (errPerfil) {
  console.error("No se ha podido crear el perfil del administrador:", errPerfil.message);
  process.exit(1);
}
console.log("Administrador creado. Primer acceso: /panel/acceso → «¿Has olvidado tu contraseña?».");
