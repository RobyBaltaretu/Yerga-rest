#!/usr/bin/env bash
# Une migraciones y semilla en un solo archivo para pegarlo en el editor SQL de
# un proyecto de Supabase recién creado (vista previa sin la CLI de Supabase).
set -euo pipefail
cd "$(dirname "$0")/.."
salida=supabase/vista-previa.sql
{
  echo "-- Generado con scripts/sql-vista-previa.sh: migraciones + datos de ejemplo."
  echo "-- Solo para un proyecto de Supabase vacío de vista previa. No usar en producción."
  for f in supabase/migrations/*.sql supabase/seed.sql; do
    printf '\n-- ===== %s =====\n' "$f"
    cat "$f"
  done
} > "$salida"
echo "Escrito $salida"
