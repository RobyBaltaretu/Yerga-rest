-- Consulta sin consumir: ¿se ha superado el límite de intentos para esta clave?
-- El acceso al panel solo cuenta los intentos fallidos.
create function public.intentos_superados(p_clave text, p_maximo int, p_ventana_seg int)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select l.contador >= p_maximo
      from public.limite_intentos l
     where l.clave = p_clave
       and l.ventana_inicio >= now() - make_interval(secs => p_ventana_seg)), false)
$$;

revoke execute on function public.intentos_superados(text, int, int) from public, anon, authenticated;
