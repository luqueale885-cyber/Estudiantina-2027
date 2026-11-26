# ESTUDIANTINA 2027 — Instituto Contardo Ferrini

React + TypeScript + Vite + Supabase. Publicación en Netlify.

## 1. Supabase
1. Creá un proyecto en https://supabase.com.
2. SQL Editor → pegá y ejecutá `supabase/schema.sql` (tablas, RLS, datos iniciales).
3. Authentication → Users → *Add user* (correo + contraseña) para cada organizador.
4. Autorizalo como administrador (SQL Editor):
   `insert into administradores (user_id) select id from auth.users where email = 'organizador@correo.com';`
5. Project Settings → API: copiá **Project URL** y la clave **anon public** (nunca la service_role).

## 2. Local
```
cp .env.example .env   # completá las dos variables
npm install
npm run dev
```
Colocá el escudo en `public/escudo.png` (sin modificarlo).

## 3. GitHub + Netlify
1. `git init && git add . && git commit -m "Estudiantina 2027"` y subilo a un repo público (el `.env` está ignorado).
2. Netlify → Add new site → Import from Git. Build: `npm run build`, publish: `dist` (ya en `netlify.toml`).
3. Site settings → Environment variables: cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Redeploy.

Rutas: `/` ranking · `/#/juegos` · `/#/admin` (organizadores).
