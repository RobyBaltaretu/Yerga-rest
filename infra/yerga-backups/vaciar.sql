-- Vacía las tablas de la aplicación (las llena el contenido de ejemplo de las migraciones)
do $$
declare t text;
begin
  for t in select format('%I.%I', schemaname, tablename) from pg_tables where schemaname = 'public' loop
    execute 'truncate ' || t || ' cascade';
  end loop;
end $$;
