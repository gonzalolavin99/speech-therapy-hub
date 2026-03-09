# Plan: Pagina Publica del Profesional

## Objetivo
Crear una pagina publica para cada profesional en `/p/:slug` (ej: `/p/francisca-vargas`) donde pacientes potenciales puedan ver info del profesional, servicios, precios y contactar por WhatsApp o formulario.

## Archivos a Crear (5 nuevos)

### 1. `supabase/migrations/add_public_profile.sql`
- ALTER TABLE professional_profiles ADD COLUMN slug TEXT UNIQUE
- ALTER TABLE professional_profiles ADD COLUMN public_profile_enabled BOOLEAN DEFAULT FALSE
- ALTER TABLE professional_profiles ADD COLUMN public_phone TEXT (telefono publico, separado del privado)
- ALTER TABLE professional_profiles ADD COLUMN public_email TEXT
- CREATE TABLE contact_requests (id, professional_id, name, phone, email, message, service_type, status, created_at)
- RLS policy: permitir lectura anonima de perfiles con public_profile_enabled = true (solo campos publicos)
- RLS policy: contact_requests insertable por anonimos, legible solo por el profesional
- INDEX en slug

### 2. `src/pages/PublicProfile.tsx`
- Pagina publica SIN AppLayout (diseño independiente)
- Obtiene slug de useParams()
- Fetch del perfil publico via Supabase RPC o query directo
- Secciones:
  - Hero: foto/avatar + nombre + profesion badge + ciudad
  - Sobre mi: bio + especialidades + registro SIS
  - Servicios: cards con sesion (duracion + precio) y evaluacion (precio)
  - Formulario de contacto: nombre, telefono, email, mensaje, tipo de servicio
  - Boton WhatsApp: abre wa.me con mensaje pre-llenado
  - Footer: "Perfil en TherapyHub" con link al sitio
- Estados: loading skeleton, perfil no encontrado (404), perfil deshabilitado
- SEO: document.title + meta description dinamicos

### 3. `src/hooks/usePublicProfile.ts`
- Hook para fetch de perfil publico por slug (SIN autenticacion)
- useQuery con queryKey ['public-profile', slug]
- Solo retorna campos publicos (NO rut, NO phone privado)
- Mutation para enviar contact_request

### 4. `src/components/profile/PublicProfileSettings.tsx`
- Componente para la seccion de configuracion del perfil publico en Perfil.tsx
- Toggle para activar/desactivar pagina publica
- Input para editar slug (con preview de URL)
- Input para telefono publico y email publico
- Preview link con boton de copiar
- Badge de estado (activo/inactivo)

### 5. `src/utils/slug.ts`
- generateSlug(fullName: string): string - genera slug URL-safe desde nombre
- validateSlug(slug: string): boolean - valida formato (lowercase, a-z, 0-9, hyphens)

## Archivos a Modificar (4)

### 6. `src/App.tsx`
- Agregar lazy import de PublicProfile
- Agregar ruta publica: `<Route path="/p/:slug" element={<PublicProfile />} />`
- ANTES del catch-all "*"

### 7. `src/hooks/useProfile.ts`
- Agregar campos a ProfessionalProfile: slug, public_profile_enabled, public_phone, public_email
- Agregar campos a ProfileFormData: slug?, public_profile_enabled?, public_phone?, public_email?

### 8. `src/types/database.types.ts`
- Agregar campos nuevos al tipo professional_profiles (Row/Insert/Update)
- Agregar tipo contact_requests (Row/Insert)

### 9. `src/pages/Perfil.tsx`
- Importar y agregar PublicProfileSettings como nueva seccion despues de Google Calendar
- Pasar profile y updateProfile como props

## Flujo del Usuario

### Profesional:
1. Va a Perfil > ve seccion "Pagina Publica"
2. Activa el toggle → se genera slug automatico desde su nombre
3. Puede personalizar el slug
4. Agrega telefono publico (WhatsApp) y email publico
5. Copia el link y lo comparte en redes sociales

### Paciente potencial:
1. Abre el link `/p/francisca-vargas`
2. Ve perfil profesional, servicios y precios
3. Opcion A: Hace clic en "Contactar por WhatsApp" → abre WhatsApp
4. Opcion B: Llena formulario de contacto → se guarda en DB, el profesional lo ve en notificaciones

## Diseno Visual
- Sin sidebar, sin header de la app - pagina standalone limpia
- Colores del design system existente
- Hero con gradiente suave primary/5
- Cards de servicios con iconos y precios destacados
- Boton WhatsApp verde prominente
- Mobile-first, responsive
- Dark mode compatible
