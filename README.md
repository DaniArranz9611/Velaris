# Club de Lectura — PWA

Fase 0: esqueleto del proyecto (React + Vite + PWA + Supabase Auth con magic link).

## Estructura

```
src/
  components/    # componentes reutilizables (ProtectedRoute, etc.)
  lib/           # cliente de Supabase y contexto de autenticación
  pages/         # páginas de la app (Login, Dashboard, ...)
  App.jsx        # rutas
  main.jsx       # punto de entrada
```

## Configurar credenciales de Supabase

1. Copiá `.env.example` a `.env` (ya está copiado si venís del setup inicial).
2. Andá a tu proyecto en [supabase.com](https://supabase.com) → **Project Settings → API**.
3. Pegá `Project URL` en `VITE_SUPABASE_URL` y la `anon public key` en `VITE_SUPABASE_ANON_KEY` dentro de `.env`.
4. En **Authentication → URL Configuration**, agregá `http://localhost:5173` y la URL de producción (Vercel) como *Redirect URLs*.

`.env` está en `.gitignore`, nunca se sube al repo.

## Correr local

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`. Te va a redirigir a `/login`. Ingresá tu email, revisá el correo, tocá el enlace mágico y vas a caer en `/dashboard` con la sesión iniciada.

## Build de producción

```bash
npm run build
npm run preview
```

## Deploy

Deploy en Vercel (o similar): importá el repo, agregá las mismas variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en la configuración del proyecto, y listo.
