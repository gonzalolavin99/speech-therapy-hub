# CLAUDE.md — TherapyHub

## Descripción del Proyecto

TherapyHub es una plataforma SaaS de gestión clínica para fonoaudiólogos y profesionales de salud. Permite gestionar pacientes, aplicar evaluaciones estandarizadas (MBGR, TAR, TEPROSIF-R, REEL-3, etc.), crear planificaciones terapéuticas, agendar sesiones y controlar pagos. Cumple con la legislación chilena (Ley 19.628 y Ley 20.584).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 (SWC) |
| Estilos | TailwindCSS 3 + shadcn/ui (Radix UI) |
| Estado del servidor | TanStack Query v5 |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| Validación | Zod + react-hook-form |
| PDF | jsPDF + jspdf-autotable |
| Iconos | Lucide React |
| AI | OpenAI API (gpt-4o-mini) vía Edge Function `ai-completion` |
| Deploy | Vercel |
| Testing | Vitest + Testing Library + jsdom |
| Package Manager | Bun (compatible con npm) |

---

## Comandos Principales

```bash
bun dev            # Servidor de desarrollo en localhost:8080
bun run build      # Build de producción
bun run build:dev  # Build modo desarrollo
bun run lint       # ESLint
bun run test       # Tests con Vitest (single run)
bun run test:watch # Tests en modo watch
bun run test:coverage # Tests con cobertura (v8)
```

---

## Estructura del Proyecto

```
src/
├── components/          # Componentes React organizados por dominio
│   ├── ui/              # Componentes shadcn/ui (NO modificar manualmente)
│   ├── layout/          # AppLayout, AppSidebar, BottomNav
│   ├── forms/           # Formularios reutilizables
│   ├── tests/           # Componentes de evaluaciones clínicas
│   ├── portal/          # Portal del paciente
│   ├── sessions/        # Gestión de citas
│   ├── dashboard/       # Widgets del dashboard
│   ├── consent/         # Consentimiento informado
│   ├── booking/         # Reserva pública de citas
│   ├── boletas/         # Boletas de honorarios
│   ├── subscription/    # Planes de suscripción
│   └── ...              # Otros dominios (admin, profile, clinic, etc.)
├── contexts/            # React Contexts (Auth, Theme, Sidebar, Profession)
├── hooks/               # Custom hooks (uno por entidad/feature)
├── pages/               # Páginas de la aplicación (una por ruta)
├── lib/                 # Clientes y utilidades core (supabase, ai-service, utils)
├── config/              # Configuración estática (regiones, profesiones, suscripciones)
├── data/                # Datos estáticos de evaluaciones (items de tests)
├── types/               # Tipos TypeScript (database.types.ts, google.d.ts)
├── utils/               # Funciones puras (validación, exportación PDF, slugs)
└── test/                # Setup de tests y tests unitarios
supabase/
├── functions/           # Edge Functions (MercadoPago, suscripciones)
├── migrations/          # Migraciones SQL incrementales
├── schema.sql           # Schema completo de referencia
└── schema_v2.sql        # Schema v2
```

---

## Convenciones de Código

### General

- **Idioma del código**: Inglés para variables, funciones, tipos e interfaces. Español para strings de UI, mensajes de usuario y comentarios cuando sea necesario.
- **Formato de archivos**: UTF-8, LF, indentación de 2 espacios.
- **Imports**: Usar siempre el alias `@/` para rutas absolutas desde `src/`. Nunca usar rutas relativas que suban más de un nivel (`../../`).
- **Exports**: Usar named exports por defecto. Default exports solo en páginas (para lazy loading con `React.lazy`).
- **Tipos**: Preferir `interface` sobre `type` para objetos. Usar `type` para uniones y tipos utilitarios.

### Nombrado

- **Archivos de componentes**: `PascalCase.tsx` (ej: `AppSidebar.tsx`)
- **Archivos de hooks**: `camelCase.ts` con prefijo `use` (ej: `usePatients.ts`)
- **Archivos de utilidades**: `camelCase.ts` (ej: `validation.ts`)
- **Archivos de tipos**: `camelCase.ts` (ej: `database.types.ts`)
- **Archivos de config/data**: `kebab-case.ts` o `camelCase.ts` (ej: `chile-regions.ts`)
- **Componentes React**: `PascalCase` (ej: `AppLayout`)
- **Hooks**: `camelCase` con prefijo `use` (ej: `usePatients`)
- **Funciones utilitarias**: `camelCase` (ej: `sanitizeText`)
- **Constantes**: `UPPER_SNAKE_CASE` para valores estáticos globales
- **Tipos/Interfaces**: `PascalCase` (ej: `Patient`, `SessionFormData`)
- **Query keys de TanStack Query**: arrays de strings descriptivos `['patients', user?.id]`

### Componentes React

```tsx
// Patrón estándar para un componente
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // hooks primero
  // lógica derivada
  // handlers
  // return JSX
}
```

- Usar **function declarations** para componentes (no arrow functions como export).
- Props siempre tipadas con una interface `ComponentNameProps`.
- Desestructurar props en el parámetro de la función.
- Los hooks deben ir al inicio del componente, en este orden:
  1. Context hooks (`useAuth`, `useTheme`)
  2. Custom hooks (`usePatients`, `useProfile`)
  3. State hooks (`useState`, `useRef`)
  4. Effect hooks (`useEffect`)
- Separar la UI de la lógica de negocio usando custom hooks.

### Custom Hooks

```tsx
// Patrón estándar para hooks con TanStack Query + Supabase
export function useEntityName() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const entityQuery = useQuery({
    queryKey: ['entity-name', user?.id],
    queryFn: async () => { /* Supabase query */ },
    enabled: !!user,
  });

  const createEntity = useMutation({
    mutationFn: async (data: EntityFormData) => { /* insert */ },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entity-name'] });
      toast.success('Mensaje de éxito');
      log({ action: 'CREATE', entityType: 'entity', entityId: data.id });
    },
    onError: (error: Error) => {
      toast.error('Mensaje de error', { description: error.message });
    },
  });

  return { entities: entityQuery.data ?? [], isLoading: entityQuery.isLoading, createEntity };
}
```

- Un hook por entidad/feature.
- Siempre validar `!!user` antes de queries.
- Usar `toast.success` / `toast.error` (sonner) para feedback.
- Registrar acciones CRUD en audit log.
- Retornar arrays con default `?? []` para evitar undefined.

### Estilos

- Usar **TailwindCSS** exclusivamente. No crear archivos CSS custom (excepto `index.css` para variables).
- Usar la función `cn()` de `@/lib/utils` para clases condicionales.
- Respetar el sistema de colores semánticos via CSS variables: `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`.
- Soporte dark mode obligatorio (clase `dark:` en Tailwind).
- Diseño responsive: mobile-first. Usar `useIsMobile()` hook para lógica condicional.

### Componentes UI (shadcn/ui)

- Los componentes en `src/components/ui/` son generados por shadcn/ui. **No modificarlos directamente**.
- Para agregar nuevos componentes shadcn: `npx shadcn-ui@latest add <component>`.
- Para personalización, crear wrappers en `src/components/`.

---

## Patrones Arquitectónicos

### Autenticación y Autorización

- `AuthContext` maneja sesión con Supabase Auth.
- `ProtectedRoute` protege rutas autenticadas (verifica email confirmado).
- `AdminRoute` protege rutas de administrador.
- **RLS (Row Level Security)** en todas las tablas de Supabase — cada usuario solo ve sus datos.
- El hook `useAdmin` verifica rol de admin.

### Estado del Servidor

- **TanStack Query** es la fuente de verdad para datos del servidor.
- No usar `useState` para datos que vienen de Supabase.
- `QueryClient` configurado con `staleTime: 2min`, `gcTime: 10min`, `retry: 1`.
- Invalidar queries relevantes después de mutaciones.

### Routing

- Lazy loading con `React.lazy()` para todas las páginas.
- Rutas públicas: `/login`, `/reset-password`, `/p/:slug`, `/portal/:token`, `/portal-pago/*`.
- Rutas protegidas: todas las demás, envueltas en `<ProtectedRoute>`.
- Rutas admin: `/auditoria`, `/insights`, `/admin/users`, envueltas en `<AdminRoute>`.
- Catch-all `*` → `NotFound`. Nuevas rutas deben ir ANTES del catch-all.

### Supabase

- Cliente singleton en `@/lib/supabase`.
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Edge Functions en `supabase/functions/` (Deno runtime).
- Migraciones SQL incrementales en `supabase/migrations/`.
- Siempre usar `.select()` después de `.insert()` o `.update()` para obtener el dato creado/actualizado.

### Manejo de Errores

- `ErrorBoundary` global en `App.tsx`.
- Try/catch en operaciones async dentro de hooks.
- `toast.error()` para errores de usuario.
- `console.error()` para errores de desarrollo/debug.
- Validación de inputs con funciones en `@/utils/validation.ts`.

### Performance

- Code splitting con `React.lazy()` por página.
- Manual chunks en Vite: `vendor`, `supabase`, `ui`, `query`.
- TanStack Query cache para evitar refetches innecesarios.

---

## Seguridad

- **Nunca** poner API keys en variables `VITE_*`: la key de OpenAI vive como secreto `OPENAI_API_KEY` de Supabase y se usa solo desde la Edge Function `ai-completion`.
- Las RPCs `SECURITY DEFINER` que solo usan las Edge Functions deben revocar `EXECUTE` a `PUBLIC, anon, authenticated` (ver `migrations/secure_payment_rpcs.sql`).
- Las variables `VITE_*` se exponen al cliente — solo poner claves públicas (anon key de Supabase).
- Sanitizar inputs con `sanitizeText()`, `sanitizeName()` antes de enviar a la BD.
- Validar RUT chileno con `validateRUT()`.
- Content Security Policy y security headers configurados en `vercel.json`.
- Session timeout por inactividad implementado en `useSessionTimeout`.

---

## Pagos

Ver `docs/PAGOS.md`. Reglas:
- El frontend nunca confirma pagos; solo webhooks/reconciliación con datos de la API de MercadoPago.
- Montos siempre desde la BD. Toda operación de pago lleva `Idempotency-Key`.
- La lógica de Edge Functions va en `supabase/functions/_shared/*.ts` sin imports de Deno/esm.sh
  para testearla con Vitest (`src/test/payments/`). Las migraciones de pagos se prueban en PGlite.
- `payment_transition_allowed` (SQL) e `isTransitionAllowed` (TS) deben mantenerse iguales.

---

## Evaluaciones Clínicas (Tests)

Los tests estandarizados están en `src/data/tests/` (datos) y `src/components/tests/` (UI):

| Test | Descripción |
|------|------------|
| MBGR | Protocolo Miofuncional Orofacial |
| M-MBGR Lactantes | Versión para lactantes |
| TAR | Test de Articulación a la Repetición |
| TEPROSIF-R | Procesos de Simplificación Fonológica |
| REEL-3 | Receptive-Expressive Emergent Language |
| PHQ-9 | Depresión (screening) |
| GAD-7 | Ansiedad (screening) |
| PSC-17 | Screening pediátrico |
| ASRS | ADHD Self-Report Scale |
| SNAP-IV | Escala de evaluación TDAH |

Para agregar un nuevo test:
1. Crear los datos en `src/data/tests/nuevo-test.ts`
2. Exportar desde `src/data/tests/index.ts`
3. Crear el componente en `src/components/tests/NuevoTest.tsx`
4. Exportar desde `src/components/tests/index.ts`
5. Integrar en la página `src/pages/Tests.tsx`

---

## Variables de Entorno

```env
# Requeridas
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Opcional: false oculta las funciones de IA
VITE_AI_ENABLED=true
```

Secretos de Edge Functions (`supabase secrets set ...`): `OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `WEBHOOK_SECRET`.

---

## Reglas para Commits

- Mensajes descriptivos que expliquen el cambio.
- No incluir atribuciones a herramientas de AI.
- Formato: verbo en infinitivo + descripción concisa.
- Ejemplos: `Agregar filtro de pacientes por estado`, `Corregir cálculo de edad en ficha`.

---

## Qué NO Hacer

- **No** modificar archivos en `src/components/ui/` directamente.
- **No** usar `any` sin justificación. Tipar correctamente.
- **No** usar `useState` para datos del servidor — usar TanStack Query.
- **No** crear archivos CSS. Usar Tailwind.
- **No** hacer queries a Supabase directamente en componentes — usar hooks.
- **No** hardcodear textos en inglés para la UI — la app es en español.
- **No** subir archivos `.env` al repositorio.
- **No** ignorar el audit log — toda acción CRUD sobre datos sensibles debe registrarse.
- **No** crear rutas después del catch-all `*` en `App.tsx`.
- **No** instalar dependencias sin verificar compatibilidad con el stack existente.

---

## Multi-Profesión

El sistema soporta múltiples profesiones (fonoaudiólogo, psicólogo, etc.) mediante:
- `ProfessionContext` en `src/contexts/ProfessionContext.tsx`
- Configuraciones por profesión en `src/config/professions/`
- Cada profesión define sus propios tests, labels y terminología.
