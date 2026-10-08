# yerga-backups (privado)

Copia diaria y cifrada de la base de datos de producción de Arrocería Yerga (Supabase,
plan gratuito, que no incluye copias descargables). Coste: 0 €.

- **Qué guarda:** los datos de los esquemas `public` (reservas, clientes, carta,
  configuración…) y `auth` (usuarios del panel). La estructura no hace falta: la crean
  las migraciones del repositorio `Yerga-rest`.
- **Cuándo:** cada día a las 03:17 UTC (`.github/workflows/copia.yml`), y a mano con
  «Run workflow».
- **Cómo:** `supabase db dump --data-only`, comprimido y cifrado con
  [age](https://age-encryption.org). Solo se guarda la clave **pública** (variable
  `AGE_RECIPIENT`). La privada está únicamente en `~/yerga-backup-key.txt` del
  propietario: **guárdala también fuera del ordenador** (gestor de contraseñas). Sin ella
  no se puede restaurar.
- **Retención:** se borran del árbol las copias de más de 30 días.

## Configuración (la hace `scripts/infra/configurar-secretos.sh` de Yerga-rest)

| Nombre | Tipo | Valor |
|---|---|---|
| `SUPABASE_DB_URL` | secreto | Conexión al pooler en modo sesión: `postgresql://postgres.<ref>:<contraseña>@<host>:5432/postgres` |
| `AGE_RECIPIENT` | variable | Clave pública de age (`age1…`) |

## Restaurar

Probado de principio a fin contra una base de Supabase recién creada.

1. **Base nueva con el esquema.** En un proyecto de Supabase vacío (o el mismo, si se
   quiere volver atrás), desde `Yerga-rest`:
   ```bash
   pnpm supabase link --project-ref <ref>
   pnpm supabase db push
   ```
2. **Descifrar la copia** (en el ordenador que tiene la clave privada):
   ```bash
   age -d -i ~/yerga-backup-key.txt copias/yerga-AAAA-MM-DD.tar.gz.age | tar xzf -
   ```
3. **Cargar los datos.** `vaciar.sql` vacía las tablas de la aplicación (las migraciones
   cargan contenido de ejemplo) y `session_replication_role = replica` evita que los
   disparadores dupliquen el registro de cambios:
   ```bash
   psql "<SUPABASE_DB_URL>" --single-transaction --variable ON_ERROR_STOP=1 \
     --command 'SET session_replication_role = replica' \
     --file vaciar.sql --file datos.sql
   ```
4. **Comprobar:** entrar en el panel con un usuario existente y revisar las reservas del
   día. Si es un proyecto nuevo, actualizar las claves en GitHub y en el Worker
   (`scripts/infra/configurar-secretos.sh` de Yerga-rest) y volver a desplegar.
