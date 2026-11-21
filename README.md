# Sports Manager Connect

Plataforma de balonmano con 4 tipos de perfil: **aficionado**, **jugador**, **profesional** y **club**.

- **Next.js 16** (App Router, Cache Components, Server Actions) + Tailwind CSS 4
- **Supabase** (Auth + Postgres con RLS), proyecto alojado en la **UE**
- **5 idiomas**: español (por defecto), inglés, francés, alemán y portugués

## Puesta en marcha

1. **Crea el proyecto Supabase en una región de la UE** (la región no se puede cambiar después):
   Dashboard → New project → Region: *Central EU (Frankfurt)* `eu-central-1`, o *West EU (Paris/Ireland)*.
2. Aplica la migración:
   ```bash
   npx supabase link --project-ref <project-ref>
   ```
   ```bash
   npx supabase db push
   ```
3. En **Authentication → Settings** del proyecto replica lo que hay en `supabase/config.toml`
   (o súbelo con `npx supabase config push`):
   - Confirmación por email activada
   - Contraseña: mínimo 10 caracteres, mayúsculas + minúsculas + dígitos
   - Site URL = tu dominio; Redirect URLs: `https://<dominio>/auth/confirm`
   - Plantillas de email *Confirm signup* y *Reset password*: copia `supabase/templates/*.html`
     (enlazan a `/auth/confirm` con `token_hash` y se adaptan al idioma del usuario)
   - Configura un SMTP propio (el de Supabase sólo sirve para pruebas)
4. Variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
5. Arranca:
   ```bash
   npm install
   ```
   ```bash
   npm run dev
   ```

Comandos: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

## Estructura

```
src/
  proxy.ts                     # idioma en la URL + refresco de sesión + guardas de ruta
  app/[locale]/                # todas las páginas cuelgan del idioma (/es, /en, …)
    page.tsx                   # portada
    login/ signup/ forgot-password/ reset-password/ dashboard/
    globals.css                # TOKENS DE DISEÑO (colores, radios, fuentes)
  app/auth/confirm/route.ts    # destino de los enlaces de email (alta y recuperación)
  i18n/                        # config de idiomas + diccionarios tipados (es es la referencia)
  lib/auth/
    permissions.ts             # roles y matriz de permisos (espejo de la BD)
    dal.ts                     # Data Access Layer: getAccount / requireAccount / requirePermission
    actions.ts                 # Server Actions: signUp, signIn, signOut, reset…
    schemas.ts                 # validación con zod
  lib/supabase/                # clientes de Supabase (servidor y proxy)
supabase/
  migrations/                  # esquema, trigger de alta, permisos y RLS
  templates/                   # emails multidioma
tests/                         # vitest
```

## Roles y permisos

El rol se elige **una sola vez** en el registro. El trigger `handle_new_user` crea la fila en
`public.profiles` (y en `player_profiles`, `professional_profiles` o `clubs` según el rol).
Después el cliente **no puede** cambiar `role` ni `verification_status` (privilegios por columna + RLS).

| Permiso                    | Aficionado | Jugador | Profesional | Club |
|----------------------------|:---:|:---:|:---:|:---:|
| Ver contenido, comentar, seguir, editar su perfil | ✓ | ✓ | ✓ | ✓ |
| Mensajes privados          |     | ✓ | ✓ | ✓ |
| Publicar perfil deportivo  |     | ✓ |   |   |
| Publicar perfil profesional|     |   | ✓ |   |
| Inscribirse en ofertas     |     | ✓ | ✓ |   |
| Buscar talento             |     |   | ✓🔒 | ✓🔒 |
| Gestionar club             |     |   |   | ✓ |
| Gestionar plantilla        |     |   |   | ✓🔒 |
| Publicar ofertas           |     |   |   | ✓🔒 |

🔒 = requiere cuenta **verificada**. Profesionales y clubes se registran con
`verification_status = 'pending'`. Para verificar (desde SQL editor / service role):

```sql
update public.profiles set verification_status = 'verified' where id = '<uuid>';
```

**Dónde se aplica la autorización**

1. **Base de datos (la barrera real):** RLS + `public.has_permission('offers.publish')` en las políticas.
   Toda tabla nueva debe activar RLS y usar `has_permission` / `auth.uid()`.
2. **Servidor:** `requireAccount()` / `requirePermission()` en páginas y Server Actions.
3. **Proxy:** sólo redirecciones de UX (login ↔ panel); no es una barrera de seguridad.

Nunca autorices con `user_metadata` del JWT: el usuario puede modificarlo.
La matriz existe en `supabase/migrations/…sql` y en `src/lib/auth/permissions.ts`;
`tests/permissions.test.ts` falla si dejan de coincidir.

## Idiomas

- Rutas con prefijo: `/es/...`, `/en/...`, `/fr/...`, `/de/...`, `/pt/...`.
- Sin prefijo, el proxy redirige según la cookie `NEXT_LOCALE` o la cabecera `Accept-Language`.
- Para añadir textos: edita `src/i18n/dictionaries/es.ts`; TypeScript obliga a completar los otros 4.
- Los nombres de países salen de `Intl.DisplayNames`, no hace falta traducirlos.

## RGPD (lo que ya hay)

- Datos en región UE (al crear el proyecto Supabase).
- Consentimiento explícito de términos y privacidad: sin él el trigger rechaza el alta; la fecha la pone el servidor.
- **Solo mayores de edad (18+):** casilla obligatoria en el registro (en clubes, además, "autorizado/a a registrar
  este club"); sin ella el trigger rechaza el alta y se guarda `adult_confirmed_at`. Menores: fuera de alcance por ahora.
- Marketing: desactivado por defecto (`marketing_opt_in = false`); se pedirá aparte, no en el registro.
- Respuestas idénticas en registro/recuperación para no revelar qué correos existen.

## Diseño

Basado en `prototipo_home.html` (identidad navy/dorado, Manrope + Inter, botones píldora,
sub-páginas oscuras con tarjetas blancas).

- Tokens y clases (`.btn-gold`, `.subhero`, `.card-box`, `.cat-card`, `.price-card`, `.registro-summary`…):
  `src/app/[locale]/globals.css`, portados del prototipo.
- Logo y foto del hero extraídos del prototipo: `public/brand/`.
- En los textos traducidos, `*palabra*` se pinta en dorado (equivale a los `<em>` del prototipo).

No se han trasladado (a propósito) los datos de demostración del prototipo — cifras como
"41.000 perfiles", noticias, movimientos, precios tachados — porque en producción serían datos falsos.

## Textos legales

Copiados **literalmente** de la web actual (aviso legal, política de privacidad y de cookies) a
`src/content/legal/*.es.json` y publicados en `/{idioma}/legal/{legal-notice|privacy|cookies}`.
Solo existen en español; en los demás idiomas se muestra un aviso. Enlazados desde el pie y desde la
casilla del registro. Si cambian en la web actual, hay que volver a importarlos.

## Precios

Todos los perfiles son **gratuitos el primer año**. Los precios se muestran solo como precio futuro
("Después: 12 €/año"); no hay cobros ni pasarela de pago. Cifras en `src/lib/plans.ts`
(aficionado: gratis siempre; jugador 12 €, profesional 24 €, club 84 € al año).

## Flujo de registro

1. `/{idioma}/signup` — elegir tipo de perfil (equivale a "Planes" del prototipo).
2. `/{idioma}/signup/{fan|player|professional|club}` — "Datos de la cuenta": nombre (o nombre del club),
   email, contraseña, país, idioma preferido, casilla de mayoría de edad y casilla de términos + privacidad. El resto del perfil
   (posición, especialidad…) se completará desde el panel.
3. Email de confirmación → `/auth/confirm` → `/{idioma}/dashboard`.
