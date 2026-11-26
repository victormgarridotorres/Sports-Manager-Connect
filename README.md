# Sports Manager Connect

Plataforma de balonmano con 4 tipos de perfil: **aficionado**, **jugador**, **profesional** y **club**.

- **Next.js 16** (App Router, Cache Components, Server Actions) + Tailwind CSS 4
- **Supabase** (Auth + Postgres con RLS), proyecto alojado en la **UE**
- **5 idiomas**: español (por defecto), inglés, francés, alemán y portugués

## Puesta en marcha

Requisitos: Git y Node.js 22 (LTS). No hace falta Docker.

1. Descarga el código e instala las dependencias:
   ```bash
   git clone https://github.com/victormgarridotorres/Sports-Manager-Connect.git
   ```
   ```bash
   cd Sports-Manager-Connect
   ```
   ```bash
   npm install
   ```
2. **Crea el proyecto Supabase en una región de la UE** (la región no se puede cambiar después):
   Dashboard → New project → Region: *Central EU (Frankfurt)* `eu-central-1`, o *West EU (Paris/Ireland)*.
   Apunta la contraseña de la base de datos.
3. Conecta con el proyecto y crea las tablas (desde la carpeta del proyecto). El *project ref* es el
   código que aparece en la URL del panel (`/dashboard/project/<project-ref>`):
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <project-ref>
   ```
   ```bash
   npx supabase db push --remote
   ```
   Sin `--remote`, la CLI intenta usar una base de datos local (Docker) y falla.
4. Configura la autenticación subiendo `supabase/config.toml` (muestra los cambios y pide confirmación):
   ```bash
   npx supabase config push
   ```
   Lo que aplica (también se puede hacer a mano en **Authentication**):
   - Confirmación por email activada
   - Contraseña: mínimo 10 caracteres, mayúsculas + minúsculas + dígitos
   - Site URL y Redirect URLs (`<dominio>/auth/confirm`). En `config.toml` están las de desarrollo
     (`http://localhost:3000`); cámbialas por tu dominio al publicar la web.
   - Correos: de momento se usan las plantillas por defecto de Supabase (en el plan gratuito no se
     pueden personalizar sin SMTP propio). `/auth/confirm` acepta sus enlaces (`?code=`, flujo PKCE:
     hay que abrir el enlace en el mismo navegador donde se hizo el registro).
   - Antes de abrir al público, configura un SMTP propio (el de Supabase solo sirve para pruebas y
     envía pocos correos por hora). Después, descomenta las plantillas en `config.toml`
     (`supabase/templates/*.html`: multidioma y válidas en cualquier dispositivo) y vuelve a hacer
     `npx supabase config push`.
5. Variables de entorno: copia el ejemplo y rellena la URL del proyecto y la *publishable key*
   (panel de Supabase → Project Settings → API Keys):
   ```bash
   cp .env.example .env.local
   ```
6. Arranca y abre http://localhost:3000:
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

## Fase 1: perfiles

- **Editar perfil** (`/{idioma}/dashboard/profile`): datos básicos y foto; jugador/a (año de nacimiento,
  altura, peso, mano, disponibilidad, club y posiciones de ataque/defensa sobre la pista); profesional
  (especialidad, experiencia, formación, logros); club (datos, palmarés y plantilla); trayectoria y
  highlights (enlaces de YouTube/Vimeo: se guarda solo el ID; no se carga nada de terceros hasta pulsar ▶).
- **Perfil público** (`/{idioma}/p/{id}`), **Mi panel** con "Completa tu perfil" real,
  **Ajustes de cuenta** (idioma, visibilidad, novedades, email, contraseña, **eliminar cuenta**).
- **Páginas de cada perfil** (`/{idioma}/roles/{fan|player|professional|club}`) y **Planes** (`/{idioma}/plans`).
- BD (`supabase/migrations/20261126000000_phase1_profiles.sql`): consentimientos en tabla privada
  `account_private`; visibilidad del perfil (público / solo verificados) aplicada con RLS
  (`can_view_profile`); fotos en el bucket `avatars` (cada usuario solo escribe en su carpeta);
  límites de 10 vídeos, 30 etapas y 60 jugadores; `delete_my_account()` borra todo en cascada.
  Para aplicarla: `npx supabase db push --remote`.

## Fase 2: Move y Favoritos

- **Move** (`/{idioma}/move`, requiere sesión): buscador de jugadores, profesionales y clubes con
  filtros por nombre/club, país, tipo de perfil, posiciones de ataque y defensa, especialidad y liga.
  Los filtros van en la URL (se pueden compartir y funcionan sin JavaScript). Orden: recientes,
  más seguidos o nombre.
- **Filtros de ojeo** (edad, altura mínima, mano, disponibilidad): solo para quien tiene el permiso
  `talent.search` (clubes y profesionales verificados). La BD los ignora para el resto.
- **Favoritos** (`/{idioma}/favorites`): la estrella ☆ en Move y el botón «Seguir» del perfil público.
  Cada usuario solo ve los suyos; los perfiles muestran el número de seguidores, nunca quiénes son.
- BD (`supabase/migrations/20261127000000_phase2_move_favorites.sql`): tabla `favorites` con RLS,
  `follower_count()` y `search_move()` (se ejecuta con los permisos de quien busca, así que respeta
  la visibilidad de cada perfil). Para aplicarla: `npx supabase db push --remote`.

## Fase 3: Anuncios

- **Tablón** (`/{idioma}/listings`, requiere sesión): filtros por texto, país (o internacional),
  tipo de anuncio y posición; orden por recientes o por interesados.
- **Quién publica qué** (lo decide `can_publish_listing` en la BD):
  «Club busca» → clubes verificados · «Jugador/a se ofrece» → jugadores ·
  «Profesional se ofrece» → profesionales · «Agente representa» → agentes verificados.
- **Publicar/editar** con vista previa en vivo (`/listings/new`, `/listings/{id}/edit`). Los anuncios
  caducan a los 90 días; se pueden cerrar, reabrir, renovar o eliminar.
- **Postularme**: jugadores y profesionales, solo a «Club busca», con mensaje opcional. El club ve sus
  candidaturas (y el perfil de cada candidato) y puede preseleccionar o descartar; el candidato ve su
  estado y puede retirarse. **Guardar** anuncios; «interesados» = personas que guardaron o se postularon.
- **Mis anuncios** (`/listings/mine`): publicados, mis candidaturas y guardados.
- BD (`supabase/migrations/20261128000000_phase3_listings.sql`): `listings`, `listing_applications`,
  `listing_saves` con RLS; permisos nuevos `availability.publish` y `offers.publish` para agentes.
  Para aplicarla: `npx supabase db push --remote`.
- El cliente de Supabase en servidor llama a `connection()`: Supabase lee el reloj y, con Cache
  Components, eso solo puede ocurrir en una petición real.

## Fase 4: Mensajes

- **Bandeja** (`/{idioma}/messages`) con buscador y conversación (`/messages/{id}`) en tiempo real
  (Supabase Realtime; si se corta, la página se refresca cada 30 s). En el móvil se ve una cosa cada vez.
- **Quién escribe**: jugadores, profesionales y clubes (permiso `messages.send`), solo a perfiles que
  pueden ver y que aceptan mensajes. Los aficionados ven el aviso correspondiente.
- **Por dónde se empieza**: «Enviar mensaje» en un perfil, «Escribir» a un candidato o al club desde
  una candidatura, y «Contactar» en anuncios de jugadores, profesionales y agentes. Si ya existe la
  conversación, se reutiliza.
- **Adjuntos**: PDF o imagen (JPG, PNG, WebP) de hasta 5 MB, en el bucket privado
  `message-attachments`; solo los participantes pueden abrirlos (enlace temporal de 1 h).
- **Bloquear** (con confirmación) y **dejar de aceptar mensajes nuevos** en Ajustes de cuenta, donde
  también está la lista de bloqueados.
- **Antispam** en la BD: máximo 20 conversaciones nuevas al día y 60 mensajes por hora.
- Aviso de mensajes sin leer en la cabecera (✉️).
- BD (`supabase/migrations/20261129000000_phase4_messages.sql`). Para aplicarla:
  `npx supabase db push --remote`.
- Pendiente: avisos por email de mensajes nuevos (cuando haya SMTP propio).

## Fase 5: Comunidad (foro)

- **Foro anónimo** (`/{idioma}/community`, requiere sesión): en Comunidad nunca se muestra el nombre
  real ni la foto. Cada usuario elige un **alias** y un **avatar neutro** en «Perfil del foro»
  (`/dashboard/forum`). La BD no deja leer quién hay detrás de un alias: las tablas del foro no se leen
  directamente, todo pasa por funciones que devuelven solo alias y avatar.
- **6 categorías** (Fichajes y mercado, Táctica y entrenamiento, Reglas y arbitraje, Balonmano
  internacional, Off-topic, Presentaciones) con contadores, temas recientes, página de cada categoría,
  **crear tema** con vista previa en vivo, **hilo** con respuestas, editar y borrar lo propio (un tema
  solo se puede borrar mientras nadie más haya respondido), y **perfil público del foro** por alias.
- **Denuncias**: cualquier miembro puede denunciar un tema o respuesta (anónimo). Con **3 denuncias** de
  personas distintas el contenido se oculta hasta que la moderación lo revise.
- **Moderación**: los moderadores pueden ocultar, restaurar, cerrar y reabrir temas. Para nombrar a
  alguien moderador (hasta que exista el panel de administración), en Supabase → SQL Editor:
  `insert into public.forum_moderators (profile_id) values ('<id del usuario>');`
  Las denuncias pendientes están en la tabla `forum_reports` (columna `resolved_at` vacía).
- No ves lo que escriben los usuarios que has bloqueado. Antispam: 10 temas al día, 30 respuestas a la hora.
- BD (`supabase/migrations/20261130000000_phase5_community.sql`). Para aplicarla:
  `npx supabase db push --remote`.

## Fase 6: Noticias

- **Noticias públicas** (`/{idioma}/news`, sin necesidad de sesión, también visibles para Google):
  portada con noticia principal, secundarias y lista, «Última hora», secciones (Fichajes, Resultados,
  Selecciones, Opinión, Actualidad), filtro por país y página de cada noticia con compartir.
  En la portada de la web aparece el bloque «Últimas noticias».
- **Dos tipos de noticia**: *propia* (escrita por la redacción, con texto completo) y *enlazada*
  (titular + resumen propio + botón «Leer la noticia completa» que lleva a la fuente original).
  Nunca se copia el artículo ni las fotos de la fuente.
- **Redacción** (`/{idioma}/news/editor`, solo para quien esté en la tabla `news_editors`):
  - «Importar ahora» trae los titulares nuevos de las **fuentes RSS activas** como **borradores**
    (sin duplicados; como máximo 25 por fuente y de los últimos 14 días).
  - Cada borrador se revisa: se reescribe el resumen con palabras propias, se elige sección, país y
    competición, y se publica o se descarta. Nada se publica sin revisión humana.
  - «Fuentes»: añadir, probar («Probar» muestra los primeros titulares o el error), activar y editar.
    Vienen 5 fuentes sugeridas **desactivadas** (no se pudieron comprobar desde aquí): pruébalas antes.
- Para dar acceso a la redacción, en Supabase → SQL Editor:
  `insert into public.news_editors (profile_id) values ('<id del usuario>');`
- Las noticias se guardan en caché un minuto como mucho; al publicar o editar se actualizan al momento.
- Pendiente: importación automática programada (cuando la web esté publicada) y ligas/clasificaciones
  (requieren un proveedor de datos deportivos).
- BD (`supabase/migrations/20261201000000_phase6_news.sql`). Para aplicarla:
  `npx supabase db push --remote`.

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
