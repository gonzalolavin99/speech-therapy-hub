# Plan: Recordatorios WhatsApp Automáticos (Auto-crear + envío masivo)

## Contexto
Ya existe un sistema manual de recordatorios (tabla `reminders`, hook `useReminders`, `ReminderPanel`). El profesional crea cada recordatorio uno a uno y envía manualmente vía wa.me. Esto es tedioso con muchas citas.

**Objetivo:** Auto-generar recordatorios para las citas del día siguiente con un clic, y permitir envío masivo secuencial vía WhatsApp Web (wa.me links). Sin APIs externas ni costos.

---

## Archivos a crear/modificar

### 1. Crear `src/pages/Recordatorios.tsx` — Página dedicada de recordatorios
- **Auto-generación**: Botón "Generar recordatorios de mañana" que cruza sessions de mañana con datos de pacientes (phone) y crea reminders automáticamente
- **Lista de recordatorios pendientes**: Agrupados por fecha, con checkboxes para seleccionar
- **Envío masivo**: Botón "Enviar seleccionados por WhatsApp" que abre wa.me links secuencialmente (con delay de ~1.5s entre cada uno)
- **Resumen visual**: Contadores de enviados/pendientes/sin teléfono
- **Edición de mensaje**: Poder editar el mensaje antes de enviar
- **Advertencias**: Indicar pacientes sin teléfono registrado

### 2. Modificar `src/hooks/useReminders.ts` — Agregar generación en lote
- Agregar mutation `generateReminders` que recibe una fecha y:
  1. Consulta sessions para esa fecha (status = scheduled | confirmed) con join a patients
  2. Filtra pacientes con teléfono
  3. Verifica que no exista ya un reminder para esa session_id
  4. Inserta reminders en batch con mensaje template
  5. Retorna: cantidad creados, omitidos (sin teléfono), ya existentes

### 3. Modificar `src/App.tsx` — Agregar ruta `/recordatorios`
- Lazy import de Recordatorios page
- Ruta protegida dentro de `<ProtectedRoute>`
- Antes del catch-all `*`

### 4. Modificar `src/components/layout/AppSidebar.tsx` — Agregar link "Recordatorios" con icono Bell

### 5. Modificar `src/components/layout/BottomNav.tsx` — Agregar link en nav móvil (si aplica)

---

## Lógica de auto-generación
```
1. Click "Generar recordatorios de mañana"
2. Query: sessions WHERE start_time BETWEEN mañana 00:00 AND 23:59 AND status IN (scheduled, confirmed)
3. Para cada session:
   a. Si ya existe reminder con ese session_id → skip
   b. Si paciente no tiene phone → skip (mostrar advertencia)
   c. Crear reminder: patient_id, session_id, method=whatsapp, contact=phone,
      session_date, session_time, message=template, status=pending
4. Toast: "X recordatorios creados, Y sin teléfono, Z ya existían"
```

## Lógica de envío masivo
```
1. Seleccionar recordatorios con checkboxes (o "Seleccionar todos")
2. Click "Enviar seleccionados"
3. Por cada uno: abrir wa.me/{phone}?text={message} en nueva pestaña
4. Marcar como "sent" tras abrir
5. Delay 1.5s entre aperturas
```

## Verificación
- `bun run build` sin errores
- Sidebar muestra "Recordatorios", ruta `/recordatorios` carga correctamente
- Generar recordatorios crea registros sin duplicados
- Envío masivo abre wa.me links y marca como enviados
- Pacientes sin teléfono muestran advertencia visual
