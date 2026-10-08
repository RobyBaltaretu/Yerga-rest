#!/usr/bin/env bash
# =============================================================================
# Configura TODOS los secretos de producción de Arrocería Yerga de una vez.
#
# Se ejecuta UNA VEZ en el ordenador del propietario (no en la nube), desde la raíz
# del repositorio:
#
#     bash scripts/infra/configurar-secretos.sh
#
# Necesita:
#   - Sesiones iniciadas: `gh auth login`, `pnpm wrangler login`, `pnpm supabase login`.
#   - ~/yerga-secrets.txt con dos credenciales temporales (formato NOMBRE=valor):
#       CLOUDFLARE_BOOTSTRAP_TOKEN  token creado con la plantilla «Create Additional
#                                   Tokens» + lectura de Turnstile
#       RESEND_BOOTSTRAP_KEY        clave de Resend con acceso completo
#   - Opcional: SUPABASE_ACCESS_TOKEN en el entorno o en ese mismo archivo. Si no está,
#     se lee el que deja `supabase login` en ~/.supabase/access-token o se pide.
#
# Qué hace (docs/INFRA-COSTE-CERO.md, secciones 0.2 y 2):
#   1. Genera CRON_SECRET y una contraseña nueva de la base de datos (la fija en Supabase).
#   2. Lee las claves anon y service_role de Supabase.
#   3. Crea el token de Cloudflare `yerga-deploy` y lee la clave secreta de Turnstile.
#   4. Crea la clave de Resend `yerga-email` (solo envío).
#   5. Lo carga todo en GitHub Actions (secretos y variables, entorno `produccion`).
#   6. Escribe .env.local y .dev.vars (ignorados por git).
#   7. Exige el trabajo «verificar» en `main` y lanza el despliegue.
#   8. Revoca el token temporal de Cloudflare y borra ~/yerga-secrets.txt.
#
# No imprime ningún valor secreto. Los valores solo pasan por un archivo temporal con
# permisos 600 que se borra al terminar (también si el script falla).
# =============================================================================
set -euo pipefail
umask 077

REPO="RobyBaltaretu/Yerga-rest"
PROJECT_REF="gudvwapcvoymmsgkmonc"
SITE_URL="https://arroceria-yerga.roberto-baltaretu.workers.dev"
TURNSTILE_SITE_KEY="0x4AAAAAAFRWL14UgnLaftpB"
TURNSTILE_NOMBRE="yerga-reservas"
EMAIL_FROM="Arrocería Yerga <onboarding@resend.dev>"
CREDENCIALES="${YERGA_SECRETS_FILE:-$HOME/yerga-secrets.txt}"

TMP="$(mktemp "${TMPDIR:-/tmp}/yerga-secretos.XXXXXX")"
trap 'rm -f "$TMP" "$TMP".*' EXIT

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
fallo() { printf '  ✗ %s\n' "$*" >&2; exit 1; }
# Lee un campo de un JSON por stdin con una expresión JS sobre `d` (sin depender de jq).
json() { node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);const v=('"$1"');if(v===undefined||v===null){process.exit(3)}process.stdout.write(String(v))})'; }

[ -f package.json ] && grep -q '"name": "yerga"' package.json || fallo "Ejecútalo desde la raíz del repositorio Yerga-rest."

# -----------------------------------------------------------------------------
paso "0. Sesiones y credenciales temporales"
gh auth status >/dev/null 2>&1 || fallo "Sin sesión de GitHub: ejecuta «gh auth login»."
ok "gh"
pnpm -s wrangler whoami >/dev/null 2>&1 || fallo "Sin sesión de Cloudflare: ejecuta «pnpm wrangler login»."
ok "wrangler"
pnpm -s supabase projects list >/dev/null 2>&1 || fallo "Sin sesión de Supabase: ejecuta «pnpm supabase login»."
ok "supabase"

[ -f "$CREDENCIALES" ] || fallo "No encuentro $CREDENCIALES."
leer() { grep -E "^$1=" "$CREDENCIALES" | head -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//'; }
CF_BOOT="$(leer CLOUDFLARE_BOOTSTRAP_TOKEN)"
RESEND_BOOT="$(leer RESEND_BOOTSTRAP_KEY)"
[ -n "$CF_BOOT" ] || fallo "Falta CLOUDFLARE_BOOTSTRAP_TOKEN en $CREDENCIALES."
[ -n "$RESEND_BOOT" ] || fallo "Falta RESEND_BOOTSTRAP_KEY en $CREDENCIALES."
ok "credenciales temporales leídas"

cf() { # cf MÉTODO RUTA [cuerpo-json]
  local m="$1" r="$2" b="${3:-}"
  if [ -n "$b" ]; then
    curl -fsS -X "$m" "https://api.cloudflare.com/client/v4$r" -H "Authorization: Bearer $CF_BOOT" -H "Content-Type: application/json" --data "$b"
  else
    curl -fsS -X "$m" "https://api.cloudflare.com/client/v4$r" -H "Authorization: Bearer $CF_BOOT"
  fi
}

# -----------------------------------------------------------------------------
paso "1. Secretos generados"
CRON_SECRET="$(openssl rand -hex 32)"
ok "CRON_SECRET"

SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-$(leer SUPABASE_ACCESS_TOKEN)}"
if [ -z "$SUPABASE_ACCESS_TOKEN" ] && [ -f "$HOME/.supabase/access-token" ]; then
  SUPABASE_ACCESS_TOKEN="$(cat "$HOME/.supabase/access-token")"
fi
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "  La CLI de Supabase guarda su token en el llavero del sistema y no se puede leer."
  echo "  Crea uno en https://supabase.com/dashboard/account/tokens (nombre «yerga-ci») y pégalo:"
  read -r -s -p "  SUPABASE_ACCESS_TOKEN: " SUPABASE_ACCESS_TOKEN; echo
fi
[ -n "$SUPABASE_ACCESS_TOKEN" ] || fallo "Sin SUPABASE_ACCESS_TOKEN."
ok "SUPABASE_ACCESS_TOKEN"

# Contraseña nueva de la base (solo letras y números: no rompe ninguna URL).
SUPABASE_DB_PASSWORD="$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 40)"
curl -fsS -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/database/password" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data "{\"password\":\"$SUPABASE_DB_PASSWORD\"}" >/dev/null || fallo "Supabase rechazó el cambio de contraseña de la base."
ok "SUPABASE_DB_PASSWORD (fijada en Supabase)"

# -----------------------------------------------------------------------------
paso "2. Claves de Supabase"
curl -fsS "https://api.supabase.com/v1/projects/$PROJECT_REF/api-keys?reveal=true" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" > "$TMP.keys" || fallo "No se pudieron leer las claves del proyecto."
ANON_KEY="$(json 'd.find(k=>k.name==="anon")?.api_key' < "$TMP.keys")" || fallo "Sin clave anon."
SERVICE_ROLE_KEY="$(json 'd.find(k=>k.name==="service_role")?.api_key' < "$TMP.keys")" || fallo "Sin clave service_role."
rm -f "$TMP.keys"
ok "NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY"

# -----------------------------------------------------------------------------
paso "3. Cloudflare"
cf GET /user/tokens/verify > "$TMP.cf" || fallo "El token temporal de Cloudflare no es válido."
CF_BOOT_ID="$(json 'd.result.id' < "$TMP.cf")"
cf GET /accounts > "$TMP.cf" || fallo "El token temporal no puede listar cuentas."
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$(json 'd.result.length===1?d.result[0].id:undefined' < "$TMP.cf")}" \
  || fallo "El token ve varias cuentas: exporta CLOUDFLARE_ACCOUNT_ID y vuelve a ejecutar."
ok "cuenta"

cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/challenges/widgets/$TURNSTILE_SITE_KEY" > "$TMP.cf" \
  || fallo "No se pudo leer el widget de Turnstile «$TURNSTILE_NOMBRE» (¿falta permiso de lectura de Turnstile?)."
TURNSTILE_SECRET_KEY="$(json 'd.result.secret' < "$TMP.cf")" || fallo "La respuesta de Turnstile no trae la clave secreta."
ok "TURNSTILE_SECRET_KEY"

# Permisos equivalentes a la plantilla «Edit Cloudflare Workers», sin R2 (no se usa),
# más D1 (caché de la web) y lectura de analítica (medir la CPU por petición).
cf GET /user/tokens/permission_groups > "$TMP.cf" || fallo "No se pudieron leer los grupos de permisos."
GRUPOS="$(json '(()=>{const q=["Workers Scripts Write","Workers KV Storage Write","D1 Write","Account Settings Read","Workers Tail Read","Account Analytics Read"];const r=q.map(n=>{const g=d.result.find(x=>x.name.toLowerCase()===n.toLowerCase());if(!g){console.error("Falta el grupo: "+n);process.exit(4)}return {id:g.id}});return JSON.stringify(r)})()' < "$TMP.cf")" \
  || fallo "Algún grupo de permisos no existe con ese nombre (ver arriba)."
CUERPO="{\"name\":\"yerga-deploy\",\"policies\":[{\"effect\":\"allow\",\"resources\":{\"com.cloudflare.api.account.$CLOUDFLARE_ACCOUNT_ID\":\"*\"},\"permission_groups\":$GRUPOS}]}"
cf POST /user/tokens "$CUERPO" > "$TMP.cf" || fallo "No se pudo crear el token yerga-deploy."
CLOUDFLARE_API_TOKEN="$(json 'd.result.value' < "$TMP.cf")"
rm -f "$TMP.cf"
ok "CLOUDFLARE_API_TOKEN (token «yerga-deploy» creado)"

# -----------------------------------------------------------------------------
paso "4. Resend"
curl -fsS -X POST https://api.resend.com/api-keys -H "Authorization: Bearer $RESEND_BOOT" \
  -H "Content-Type: application/json" --data '{"name":"yerga-email","permission":"sending_access"}' > "$TMP.rs" \
  || fallo "Resend rechazó la creación de la clave."
RESEND_API_KEY="$(json 'd.token' < "$TMP.rs")"
rm -f "$TMP.rs"
ok "RESEND_API_KEY (clave «yerga-email», solo envío)"

ADMIN_EMAIL="$(gh api user --jq '.email // empty' 2>/dev/null || true)"
[ -n "$ADMIN_EMAIL" ] || ADMIN_EMAIL="$(gh api user/emails --jq '[.[]|select(.primary)][0].email // empty' 2>/dev/null || true)"
if [ -z "$ADMIN_EMAIL" ]; then read -r -p "  Correo del administrador del panel: " ADMIN_EMAIL; fi
ok "ADMIN_EMAIL"

# -----------------------------------------------------------------------------
paso "5. GitHub Actions (entorno «produccion»)"
gh api -X PUT "repos/$REPO/environments/produccion" >/dev/null
cat > "$TMP" <<EOF
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF=$PROJECT_REF
SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY
RESEND_API_KEY=$RESEND_API_KEY
EMAIL_FROM=$EMAIL_FROM
CRON_SECRET=$CRON_SECRET
EOF
gh secret set -f "$TMP" --repo "$REPO" >/dev/null
ok "10 secretos de repositorio"
cat > "$TMP" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY
NEXT_PUBLIC_SITE_URL=$SITE_URL
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
gh variable set -f "$TMP" --repo "$REPO" >/dev/null
: > "$TMP"
ok "5 variables de repositorio"
# Los cuatro NEXT_PUBLIC_* estaban también como secretos: ahora son variables.
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_TURNSTILE_SITE_KEY NEXT_PUBLIC_SITE_URL; do
  gh secret delete "$v" --repo "$REPO" >/dev/null 2>&1 || true
done
ok "NEXT_PUBLIC_* retirados de los secretos (ya son variables)"

# -----------------------------------------------------------------------------
paso "6. .env.local y .dev.vars (ignorados por git)"
for f in .env.local .dev.vars; do
  cat > "$f" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY
RESEND_API_KEY=$RESEND_API_KEY
EMAIL_FROM=$EMAIL_FROM
NEXT_PUBLIC_SITE_URL=$SITE_URL
CRON_SECRET=$CRON_SECRET
EOF
  chmod 600 "$f"
done
git check-ignore -q .env.local .dev.vars || fallo ".env.local o .dev.vars no están ignorados por git."
ok "escritos con permisos 600 (apuntan a PRODUCCIÓN; para desarrollo local usa los de «supabase status»)"

# -----------------------------------------------------------------------------
paso "7. Protección de main y despliegue"
gh api -X PUT "repos/$REPO/branches/main/protection" --input - >/dev/null <<'EOF'
{
  "required_status_checks": { "strict": false, "contexts": ["verificar"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
ok "«verificar» obligatorio en main; sin push forzado ni borrado"
gh workflow run ci.yml --repo "$REPO" --ref main >/dev/null
ok "despliegue lanzado: https://github.com/$REPO/actions"

# -----------------------------------------------------------------------------
paso "8. Limpieza"
cf DELETE "/user/tokens/$CF_BOOT_ID" >/dev/null && ok "token temporal de Cloudflare revocado" \
  || echo "  ! Revoca tú el token temporal de Cloudflare en https://dash.cloudflare.com/profile/api-tokens"
rm -f "$CREDENCIALES" && ok "$CREDENCIALES borrado"
echo "  ! Borra la clave temporal de Resend en https://resend.com/api-keys (deja solo «yerga-email»)."

paso "Comprobación (solo nombres)"
gh secret list --repo "$REPO"
gh variable list --repo "$REPO"
echo
echo "Listo. Cuando termine el despliegue, la CI verifica $SITE_URL por sí sola."
echo "Primer acceso al panel: $SITE_URL/panel/acceso → «¿Has olvidado tu contraseña?» con tu correo."
