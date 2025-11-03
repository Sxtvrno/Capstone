# Guía de Sincronización y Despliegue: Main → Develop → AWS

Esta guía describe el proceso completo para traer cambios de la rama `main` (trabajo local de los compañeros) a la rama `develop` y desplegar tanto el **Backend** como el **Frontend** en AWS.

## 📋 Prerequisitos

- Tener Git instalado
- AWS CLI configurado con las credenciales correctas
- EB CLI instalado (para backend)
- Node.js y npm instalados (para frontend)
- Acceso al repositorio
- Permisos para hacer push a `develop`

## 🔄 Proceso Paso a Paso

### 1. Asegurar que estés en la rama develop

```bash
git checkout develop
```

### 2. Actualizar tu rama develop local con los cambios remotos

```bash
git pull origin develop
```

### 3. Traer los cambios de main

```bash
git pull origin main
```

**Importante:** Si hay conflictos, Git te lo indicará. Ver la sección "Resolución de Conflictos" más abajo.

### 4. Revisar los cambios

```bash
# Ver el log de los commits nuevos
git log --oneline -10

# Ver qué archivos cambiaron
git status
```

### 5. Probar localmente (OPCIONAL pero RECOMENDADO)

Antes de subir a AWS, es buena práctica probar:

#### Backend:

```bash
cd Back
python manage.py runserver
```

#### Frontend:

```bash
cd Front
npm install  # Solo si hay nuevas dependencias
npm run dev
```

### 6. Subir los cambios a develop

```bash
git push origin develop
```

---

## 🚀 PARTE 2: Desplegar Backend (Elastic Beanstalk)

### 1. Navegar a la carpeta del backend

```bash
cd Backend
```

### 2. Verificar el estado actual de EB

```bash
eb status
```

### 3. Desplegar a AWS

```bash
eb deploy
```

### 4. Verificar el estado después del deploy

```bash
eb health
```

**Esperado:** Status "Ok" con instancias en estado "ok" (verde)

### 5. Si hay errores, revisar los logs

```bash
eb logs
```

---

## 🎨 PARTE 3: Desplegar Frontend (S3 + CloudFront)

### 1. Navegar a la carpeta del frontend

```bash
cd ../Frontend
```

### 2. Instalar dependencias (si hay nuevas)

```bash
npm install
```

### 3. Generar el build de producción

```bash
npm run build
```

### 4. Subir archivos a S3

```bash
aws s3 sync dist/ s3://capstone-front-tahir-20251007211205/ --delete
```

**Nota:** El flag `--delete` elimina archivos antiguos que ya no existen en el build

### 5. Invalidar cache de CloudFront

```bash
aws cloudfront create-invalidation --distribution-id E1LYZEVTVJUV64 --paths "/*"
```

### 6. Verificar que la aplicación esté funcionando

Abre en el navegador:

- Frontend: https://d10nrn1yj450xr.cloudfront.net
- Backend: http://capstone-api-env.eba-u93fpfjr.us-east-1.elasticbeanstalk.com

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Backend - Error de psycopg2

**Error:** `Error loading psycopg2 or psycopg module`

**Solución:** Usar `psycopg2-binary` en lugar de `psycopg2`

```bash
# En requirements.txt, eliminar:
# psycopg2==2.9.10

# Dejar solo:
psycopg2-binary==2.9.10
```

### Backend - Falta gunicorn

**Error:** `ModuleNotFoundError: No module named 'gunicorn'`

**Solución:** Agregar gunicorn a requirements.txt

```bash
gunicorn==21.2.0
```

### Backend - No encuentra la aplicación

**Error:** `ModuleNotFoundError: No module named 'application'`

**Solución:** Crear archivo `Back/Procfile` con:

```
web: gunicorn fastapi_app:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend - Cache de CloudFront

**Problema:** Los cambios no se ven después de subir a S3

**Solución:** Siempre invalidar el cache después de subir archivos

```bash
aws cloudfront create-invalidation --distribution-id E1LYZEVTVJUV64 --paths "/*"
```

---

## 🚨 Resolución de Conflictos en Git

Si al hacer `git pull origin main` aparecen conflictos:

### 1. Identificar archivos en conflicto

```bash
git status
```

Busca archivos marcados como "both modified" o con conflictos.

### 2. Abrir cada archivo y resolver

Los conflictos se verán así:

```
<<<<<<< HEAD
código de develop
=======
código de main
>>>>>>> branch-name
```

- La sección de arriba (`HEAD`) es tu código actual en develop
- La sección de abajo es el código de main
- Decide qué mantener, edita el archivo y elimina las marcas `<<<<<<<`, `=======`, `>>>>>>>`

### 3. Marcar como resueltos

```bash
git add archivo-resuelto.py
git add otro-archivo.tsx
```

### 4. Completar el merge

```bash
git commit -m "Merge main into develop - resolved conflicts"
```

### 5. Continuar con el paso 6 de la guía principal

## 📝 Scripts Automatizados

### Script para sincronizar Git (Parte 1)

```powershell
.\sync-main-to-develop.ps1
```

**Nota:** Este script solo sincroniza Git. Después debes desplegar manualmente backend y frontend.

## ⚠️ Notas Importantes

1. **Siempre** haz `git pull origin develop` antes de traer cambios de main
2. **Nunca** hagas force push a develop si es posible
3. Si hay conflictos complejos, **comunícate con el equipo**
4. Considera hacer un backup de develop antes de merges grandes:
   ```bash
   git branch develop-backup
   ```
5. **Backend y Frontend son independientes:** Puedes desplegar uno sin el otro
6. **CloudFront puede tardar 1-2 minutos** en actualizar después de invalidar cache
7. **EB deploy toma 2-3 minutos** en completarse

## 🔙 Rollback (En caso de emergencia)

Si algo sale mal después de hacer push:

```bash
# Ver el historial
git log --oneline

# Volver a un commit anterior (reemplaza COMMIT_HASH)
git reset --hard COMMIT_HASH

# Forzar el push (¡CUIDADO!)
git push origin develop --force
```

**⚠️ ADVERTENCIA:** El force push es peligroso. Úsalo solo si sabes lo que haces y has coordinado con el equipo.

## � Verificación de Servicios AWS

### Verificar Backend (Elastic Beanstalk)

```bash
cd Back
eb status
eb health
```

### Verificar Frontend (CloudFront)

```bash
# Ver estado de la distribución
aws cloudfront get-distribution --id E1LYZEVTVJUV64 --query "Distribution.Status"

# Ver invalidaciones en progreso
aws cloudfront list-invalidations --distribution-id E1LYZEVTVJUV64
```

### Conectar a Base de Datos RDS

```powershell
$env:PGPASSWORD="CapsFBT2025$"
psql -U postgres -h capstone-database.cm9q20moyrf7.us-east-1.rds.amazonaws.com -p 5432 -d capstone_prod
```

**Nota:** Si no puedes conectar desde tu máquina local, verifica que tu IP esté en el Security Group de RDS.

---

## 🌐 URLs de Producción

- **Frontend:** https://d10nrn1yj450xr.cloudfront.net
- **Backend API:** http://capstone-api-env.eba-u93fpfjr.us-east-1.elasticbeanstalk.com
- **Bucket S3:** s3://capstone-front-tahir-20251007211205/
- **CloudFront ID:** E1LYZEVTVJUV64
- **RDS Endpoint:** capstone-database.cm9q20moyrf7.us-east-1.rds.amazonaws.com

---

## �📞 Contacto

Si tienes problemas, contacta al equipo antes de forzar cambios.

---

**Última actualización:** Octubre 20, 2025
