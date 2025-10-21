# Script para sincronizar cambios de main a develop
# Uso: .\sync-main-to-develop.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sync Main → Develop → AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si hay cambios sin commitear
function Check-WorkingDirectory {
    $status = git status --porcelain
    if ($status) {
        Write-Host "❌ Error: Tienes cambios sin commitear" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, haz commit o stash de tus cambios primero:" -ForegroundColor Yellow
        Write-Host "  git add ." -ForegroundColor Yellow
        Write-Host "  git commit -m 'tu mensaje'" -ForegroundColor Yellow
        Write-Host "o" -ForegroundColor Yellow
        Write-Host "  git stash" -ForegroundColor Yellow
        exit 1
    }
}

# Paso 1: Verificar estado del working directory
Write-Host "📋 Paso 1: Verificando estado del repositorio..." -ForegroundColor Green
Check-WorkingDirectory
Write-Host "✅ Working directory limpio" -ForegroundColor Green
Write-Host ""

# Paso 2: Cambiar a develop
Write-Host "📋 Paso 2: Cambiando a rama develop..." -ForegroundColor Green
git checkout develop
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al cambiar a develop" -ForegroundColor Red
    exit 1
}
Write-Host "✅ En rama develop" -ForegroundColor Green
Write-Host ""

# Paso 3: Actualizar develop desde remoto
Write-Host "📋 Paso 3: Actualizando develop desde origin..." -ForegroundColor Green
git pull origin develop
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al actualizar develop" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Develop actualizado" -ForegroundColor Green
Write-Host ""

# Paso 4: Traer cambios de main
Write-Host "📋 Paso 4: Trayendo cambios de main..." -ForegroundColor Green
Write-Host "Ejecutando: git pull origin main" -ForegroundColor Yellow
git pull origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Hubo conflictos durante el merge" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Sigue estos pasos:" -ForegroundColor Cyan
    Write-Host "1. Resuelve los conflictos en los archivos marcados" -ForegroundColor White
    Write-Host "2. git add <archivos-resueltos>" -ForegroundColor White
    Write-Host "3. git commit -m 'Merge main into develop'" -ForegroundColor White
    Write-Host "4. Ejecuta este script nuevamente o continúa con:" -ForegroundColor White
    Write-Host "   git push origin develop" -ForegroundColor White
    Write-Host ""
    Write-Host "Archivos en conflicto:" -ForegroundColor Yellow
    git status --short
    exit 1
}
Write-Host "✅ Cambios de main integrados exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 5: Mostrar resumen de cambios
Write-Host "📋 Paso 5: Resumen de cambios recientes..." -ForegroundColor Green
Write-Host ""
Write-Host "Últimos commits:" -ForegroundColor Cyan
git log --oneline -5
Write-Host ""

# Paso 6: Confirmación antes de push
Write-Host "📋 Paso 6: ¿Deseas subir los cambios a AWS (develop)?" -ForegroundColor Green
Write-Host "Esta acción hará push a origin/develop" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Escribe 'SI' para continuar, cualquier otra cosa para cancelar"

if ($confirmation -ne "SI") {
    Write-Host ""
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    Write-Host "Los cambios están en tu develop local pero NO se han subido" -ForegroundColor Yellow
    Write-Host "Para subir manualmente: git push origin develop" -ForegroundColor Yellow
    exit 0
}

# Paso 7: Push a develop
Write-Host ""
Write-Host "📋 Paso 7: Subiendo cambios a origin/develop..." -ForegroundColor Green
git push origin develop

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al hacer push" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ ¡Sincronización completada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Los cambios de main ahora están en develop y en AWS" -ForegroundColor Green
Write-Host "Verifica el despliegue en tu pipeline de CI/CD" -ForegroundColor Yellow
Write-Host ""
