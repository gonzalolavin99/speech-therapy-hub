# 🎤 TherapyHub

**Plataforma profesional de gestión clínica para fonoaudiólogos**

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://speech-therapy-hub.vercel.app)
[![React](https://img.shields.io/badge/React-18-blue?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat&logo=supabase)](https://supabase.com/)

---

## 📋 Descripción

TherapyHub es una aplicación web moderna diseñada para profesionales de la fonoaudiología. Permite gestionar pacientes, aplicar evaluaciones estandarizadas, crear planificaciones terapéuticas y llevar control de pagos, todo en una plataforma segura y fácil de usar.

## ✨ Características Principales

### 👥 Gestión de Pacientes
- Registro completo de información clínica
- Historial de anamnesis
- Consentimiento informado digital
- Exportación de ficha a PDF

### 📊 Evaluaciones Estandarizadas
- **MBGR** - Protocolo de Evaluación Miofuncional Orofacial
- **TAR** - Test de Articulación a la Repetición
- **TEPROSIF-R** - Test de Procesos de Simplificación Fonológica

### 📅 Calendario y Agenda
- Integración con Google Calendar
- Recordatorios automáticos
- Vista de citas del día/semana/mes

### 💰 Control de Pagos
- Registro de pagos por sesión
- Historial financiero
- Estados de pago (pendiente/pagado)

### 🔒 Seguridad y Cumplimiento Legal
- Autenticación segura con Supabase
- Row Level Security (RLS)
- Cumplimiento Ley 19.628 (Protección de Datos)
- Cumplimiento Ley 20.584 (Derechos del Paciente)
- Logs de auditoría

### 📱 PWA Ready
- Instalable en dispositivos móviles
- Diseño responsive

---

## 🛠️ Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Estilos | TailwindCSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| State Management | TanStack Query |
| Routing | React Router v6 |
| PDF Export | jsPDF, jspdf-autotable |
| Icons | Lucide React |
| Deploy | Vercel |

---

## 🚀 Instalación Local

### Prerrequisitos
- Node.js 18+ o Bun
- Cuenta en Supabase

### Pasos

```bash
# Clonar repositorio
git clone https://github.com/gonzalolavin99/speech-therapy-hub.git
cd speech-therapy-hub

# Instalar dependencias
bun install  # o npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar en desarrollo
bun dev  # o npm run dev
```

### Variables de Entorno

```env
VITE_SUPABASE_URL=tu-url-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_AI_ENABLED=true   # opcional
```

### Secretos de Edge Functions (Supabase)

Nunca van en `.env` ni en Vercel: se guardan en Supabase.

```bash
supabase secrets set OPENAI_API_KEY=sk-...        # IA (función ai-completion)
supabase secrets set OPENAI_MODEL=gpt-4o-mini     # opcional
supabase secrets set RESEND_API_KEY=re_...        # emails
supabase secrets set WEBHOOK_SECRET=...           # header x-webhook-secret del Database Webhook
supabase secrets set MP_WEBHOOK_SECRET=...        # firma de webhooks de MercadoPago (plataforma)
supabase secrets set CRON_SECRET=...              # pg_cron → payments-reconcile
supabase secrets set APP_URL=https://tu-app.vercel.app
supabase functions deploy
```

---

### Migraciones de pagos

Ejecutar en el SQL Editor, en este orden: `supabase/migrations/secure_payment_rpcs.sql` y
`supabase/migrations/payments_lifecycle.sql`. Arquitectura completa en [docs/PAGOS.md](docs/PAGOS.md).

---

## 📁 Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── ui/          # Componentes shadcn/ui
│   ├── layout/      # Layout principal
│   ├── forms/       # Formularios
│   └── tests/       # Componentes de evaluaciones
├── contexts/        # Contextos de React (Auth, Theme, Sidebar)
├── hooks/           # Custom hooks (usePatients, useAuditLog, etc.)
├── pages/           # Páginas de la aplicación
├── lib/             # Utilidades y configuración
└── utils/           # Funciones auxiliares
```

---

## 🔐 Seguridad

- **Autenticación**: Email/Password con verificación
- **Autorización**: Row Level Security en todas las tablas
- **Recuperación de contraseña**: Vía email
- **Auditoría**: Registro de todas las acciones críticas
- **Datos sensibles**: Nunca se exponen en el frontend

---

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para TherapyHub.

---

## 📞 Contacto

- **Email**: soporte@therapyhub.cl
- **Web**: https://speech-therapy-hub.vercel.app

---

Desarrollado con ❤️ para fonoaudiólogos
