# 🤖 Chatbot con Rasa - Guía de Administración

## 📋 Tabla de Contenidos

1. [Arquitectura del Chatbot](#arquitectura)
2. [Instalación y Configuración](#instalación)
3. [Entrenamiento del Modelo](#entrenamiento)
4. [Administración de FAQs](#administración-de-faqs)
5. [Gestión de Tickets](#gestión-de-tickets)
6. [Despliegue en Producción](#despliegue)
7. [Monitoreo y Análisis](#monitoreo)

---

## 🏗️ Arquitectura

El chatbot está compuesto por:

- **Rasa Open Source**: Motor de NLU (Natural Language Understanding) y manejo de diálogos
- **Actions Server**: Servidor personalizado con acciones que consultan PostgreSQL
- **FastAPI Backend**: Endpoints para comunicación frontend ↔ Rasa y administración
- **PostgreSQL**: Almacenamiento de FAQs, tickets, y logs de conversaciones

### Flujo de Comunicación

```
Usuario → Frontend (React) → FastAPI (/api/chatbot/message) → Rasa (puerto 5005) → Actions Server (puerto 5055) → PostgreSQL
```

---

## 🚀 Instalación y Configuración

### 1. Instalar Rasa

```powershell
# En la carpeta Backend/chatbot
cd Backend\chatbot

# Crear entorno virtual separado para Rasa (recomendado)
python -m venv .venv_rasa

# Activar el entorno
.venv_rasa\Scripts\Activate.ps1

# Instalar Rasa
pip install rasa==3.6.0

# Instalar dependencias para actions
pip install -r actions\requirements_actions.txt
```

### 2. Configurar Variables de Entorno

Asegúrate de que tu `Backend/.env` tenga:

```env
# Configuración de base de datos (ya existente)
DB_NAME=myproject
DB_USER=myprojectuser
DB_PASSWORD=mypassword
DB_HOST=localhost
DB_PORT=5432

# URL del servidor Rasa (para FastAPI)
RASA_URL=http://localhost:5005/webhooks/rest/webhook
```

### 3. Ejecutar Migración de Tablas

```powershell
# Desde la raíz del proyecto
psql -U myprojectuser -d myproject -f chatbot_migration.sql
```

Esto creará las tablas:

- `FAQ`: Preguntas frecuentes
- `Ticket`: Tickets de soporte
- `ChatLog`: Registro de conversaciones

---

## 🎓 Entrenamiento del Modelo

### Primera vez - Entrenar modelo inicial

```powershell
cd Backend\chatbot

# Entrenar el modelo (toma 5-10 minutos)
rasa train

# El modelo se guardará en Backend/chatbot/models/
```

### Entrenar después de cambios

Cada vez que modifiques:

- `data/nlu.yml` (ejemplos de intents)
- `data/stories.yml` (flujos de conversación)
- `data/rules.yml` (reglas fijas)
- `domain.yml` (intents, entities, responses)

Debes reentrenar:

```powershell
rasa train
```

**Tip**: Usa `rasa train --force` para forzar un reentrenamiento completo.

---

## 🗨️ Administración de FAQs

### Desde la Base de Datos (PostgreSQL)

#### Ver todas las FAQs

```sql
SELECT * FROM FAQ WHERE is_active = TRUE ORDER BY categoria;
```

#### Agregar una nueva FAQ

```sql
INSERT INTO FAQ (categoria, pregunta, respuesta, keywords, created_by)
VALUES (
    'envios',
    '¿Hacen envíos internacionales?',
    'Por ahora solo realizamos envíos dentro de Chile. Estamos trabajando para ampliar a otros países pronto.',
    ARRAY['internacional', 'extranjero', 'otro', 'pais'],
    1  -- ID del administrador
);
```

#### Actualizar una FAQ

```sql
UPDATE FAQ
SET respuesta = 'Nueva respuesta actualizada',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;
```

#### Desactivar (ocultar) una FAQ

```sql
UPDATE FAQ
SET is_active = FALSE
WHERE id = 3;
```

### Desde la API (FastAPI)

#### Listar FAQs (requiere auth de admin)

```bash
GET /api/admin/faqs
GET /api/admin/faqs?categoria=envios
GET /api/admin/faqs?is_active=true
```

#### Crear FAQ

```bash
POST /api/admin/faqs
Authorization: Bearer <admin_token>

{
  "categoria": "envios",
  "pregunta": "¿Cuál es el costo de envío a regiones?",
  "respuesta": "El envío a regiones tiene un costo de $5.990.",
  "keywords": ["costo", "regiones", "envio"],
  "is_active": true
}
```

#### Actualizar FAQ

```bash
PUT /api/admin/faqs/5
Authorization: Bearer <admin_token>

{
  "respuesta": "Nueva respuesta actualizada"
}
```

#### Eliminar FAQ

```bash
DELETE /api/admin/faqs/5
Authorization: Bearer <admin_token>
```

### Categorías Sugeridas

- `envios`: Todo sobre envíos y entregas
- `pagos`: Medios de pago y seguridad
- `cambios`: Cambios, devoluciones, garantías
- `productos`: Stock, disponibilidad, reservas
- `cuenta`: Registro, contraseñas, perfil

---

## 🎫 Gestión de Tickets

### Ver tickets de soporte

```sql
SELECT
    t.id,
    t.asunto,
    t.estado,
    t.prioridad,
    t.created_at,
    c.email AS cliente_email
FROM Ticket t
LEFT JOIN Cliente c ON t.cliente_id = c.id
WHERE t.estado = 'abierto'
ORDER BY t.created_at DESC;
```

### Asignar ticket a un administrador

```sql
UPDATE Ticket
SET asignado_a = 2,  -- ID del admin
    estado = 'en_proceso'
WHERE id = 10;
```

### Cerrar ticket

```sql
UPDATE Ticket
SET estado = 'cerrado'
WHERE id = 10;
```

### API para administrar tickets

```bash
# Listar tickets
GET /api/admin/tickets
GET /api/admin/tickets?estado=abierto

# Actualizar estado
PUT /api/admin/tickets/10
Authorization: Bearer <admin_token>

{
  "estado": "en_proceso",
  "asignado_a": 2
}
```

---

## 🚀 Despliegue en Producción

### Iniciar los servicios

Necesitas **3 procesos** corriendo simultáneamente:

#### 1. FastAPI Backend

```powershell
cd Backend
python main.py
# O con uvicorn
uvicorn main:app --host 0.0.0.0 --port 8001
```

#### 2. Rasa Server

```powershell
cd Backend\chatbot
rasa run --enable-api --cors "*" --port 5005
```

Opciones útiles:

- `--enable-api`: Habilita API REST
- `--cors "*"`: Permite CORS (solo para desarrollo, en producción especifica dominios)
- `--port 5005`: Puerto del servidor Rasa

#### 3. Rasa Actions Server

```powershell
cd Backend\chatbot
rasa run actions --port 5055
```

Este servidor ejecuta las custom actions (consultas a BD, crear tickets, etc.)

### Script PowerShell para iniciar todo

Crea un archivo `start_chatbot.ps1`:

```powershell
# Start Chatbot Services

Write-Host "Iniciando servicios del chatbot..." -ForegroundColor Green

# Terminal 1: Rasa Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend\chatbot; rasa run --enable-api --cors '*' --port 5005"

# Terminal 2: Rasa Actions
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend\chatbot; rasa run actions --port 5055"

# Terminal 3: FastAPI
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend; python main.py"

Write-Host "Servicios iniciados en ventanas separadas" -ForegroundColor Green
Write-Host "Rasa: http://localhost:5005" -ForegroundColor Cyan
Write-Host "Actions: http://localhost:5055" -ForegroundColor Cyan
Write-Host "FastAPI: http://localhost:8001" -ForegroundColor Cyan
```

Ejecutar:

```powershell
.\start_chatbot.ps1
```

### Verificar que todo funciona

```powershell
# Probar Rasa directamente
curl -X POST http://localhost:5005/webhooks/rest/webhook `
  -H "Content-Type: application/json" `
  -d '{"sender": "test_user", "message": "hola"}'

# Probar a través de FastAPI
curl -X POST http://localhost:8001/api/chatbot/message `
  -H "Content-Type: application/json" `
  -d '{"message": "hola", "sender_id": "test_123"}'
```

---

## 📊 Monitoreo y Análisis

### Ver logs de conversaciones

```sql
-- Conversaciones recientes
SELECT
    session_id,
    intent,
    mensaje,
    respuesta,
    confidence,
    created_at
FROM ChatLog
ORDER BY created_at DESC
LIMIT 50;

-- Intents más usados
SELECT
    intent,
    COUNT(*) as total,
    AVG(confidence) as confianza_promedio
FROM ChatLog
WHERE intent IS NOT NULL
GROUP BY intent
ORDER BY total DESC;

-- Conversaciones que escalaron a humano
SELECT
    cl.*,
    t.id as ticket_id,
    t.estado as ticket_estado
FROM ChatLog cl
JOIN Ticket t ON cl.session_id = t.session_id
WHERE cl.escalado = TRUE
ORDER BY cl.created_at DESC;
```

### Métricas útiles

```sql
-- Total de conversaciones por día
SELECT
    DATE(created_at) as fecha,
    COUNT(*) as total_mensajes,
    COUNT(DISTINCT session_id) as sesiones_unicas
FROM ChatLog
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Tasa de escalamiento
SELECT
    COUNT(*) FILTER (WHERE escalado = TRUE) * 100.0 / COUNT(*) as tasa_escalamiento
FROM ChatLog;

-- Confianza promedio por intent
SELECT
    intent,
    COUNT(*) as veces_usado,
    ROUND(AVG(confidence)::numeric, 3) as confianza_promedio
FROM ChatLog
WHERE intent IS NOT NULL AND confidence > 0
GROUP BY intent
ORDER BY veces_usado DESC;
```

---

## 🔧 Comandos Útiles

### Probar el chatbot en terminal

```powershell
cd Backend\chatbot
rasa shell
```

### Ver configuración actual

```powershell
rasa --version
rasa data validate
```

### Depurar modelo

```powershell
# Ver qué intent detecta para un mensaje
rasa shell nlu

# Ver estructura del modelo
rasa test nlu --nlu data/nlu.yml
```

---

## 📝 Mejores Prácticas

### Al agregar nuevos intents:

1. **Mínimo 10 ejemplos** por intent en `data/nlu.yml`
2. **Varía las frases**: diferentes formas de preguntar lo mismo
3. **Incluye errores comunes**: typos, abreviaciones
4. **Actualiza `domain.yml`**: agrega el intent a la lista
5. **Crea historias/reglas** en `data/stories.yml` o `data/rules.yml`
6. **Reentrena**: `rasa train`

### Al agregar FAQs:

1. **Usa keywords relevantes**: palabras que los usuarios usarían
2. **Respuestas claras y concisas**: máximo 3-4 líneas
3. **Agrupa por categoría**: facilita el mantenimiento
4. **Prueba con usuarios reales**: ajusta según feedback

### Al gestionar tickets:

1. **Responde rápido**: marca como "en_proceso" cuando empieces
2. **Cierra tickets resueltos**: mantén limpia la base
3. **Analiza patrones**: si muchos tickets sobre lo mismo, agrega FAQ

---

## ❓ Solución de Problemas

### Rasa no inicia

```powershell
# Verificar instalación
pip show rasa

# Reinstalar si es necesario
pip uninstall rasa
pip install rasa==3.6.0
```

### Actions no conectan con BD

- Verifica variables de entorno en `.env`
- Comprueba que PostgreSQL esté corriendo
- Revisa logs del actions server

### Baja confianza en intents

- Agrega más ejemplos de entrenamiento
- Revisa que los ejemplos sean diversos
- Considera ajustar umbral en `config.yml`

### Frontend no recibe respuestas

- Verifica que Rasa esté corriendo en puerto 5005
- Comprueba CORS en `rasa run --cors "*"`
- Revisa logs de FastAPI

---

## 📚 Recursos Adicionales

- [Documentación oficial de Rasa](https://rasa.com/docs/)
- [Rasa Community Forum](https://forum.rasa.com/)
- [Rasa Playground](https://rasa.com/docs/rasa/playground)

---

## 🎯 Próximos Pasos / Mejoras Futuras

- [ ] Agregar más intents específicos (consultar stock, buscar producto)
- [ ] Implementar formularios (forms) para recolectar datos estructurados
- [ ] Conectar con sistema de notificaciones (email/SMS cuando se crea ticket)
- [ ] Dashboard de analytics para visualizar métricas
- [ ] Entrenamiento continuo basado en conversaciones reales
- [ ] Integración con canales adicionales (WhatsApp, Telegram)
- [ ] Sentiment analysis para priorizar tickets

---

**Última actualización**: Noviembre 2025
**Versión del chatbot**: 1.0.0
**Rasa version**: 3.6.0
