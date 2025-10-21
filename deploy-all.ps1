# Script completo para sincronizar y desplegar Backend + Frontend a AWS
# Uso: .\deploy-all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Completo: Git → AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# ============================================
# PARTE 1: SINCRONIZAR GIT
# ============================================
Write-Host "📋 PARTE 1: Sincronizando Git (main → develop)" -ForegroundColor Green
Write-Host ""

# Verificar working directory limpio
Write-Host "Verificando estado del repositorio..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "❌ Error: Tienes cambios sin commitear" -ForegroundColor Red
    Write-Host "Haz commit o stash primero:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Yellow
    Write-Host "  git commit -m 'tu mensaje'" -ForegroundColor Yellow
    exit 1
}

# Cambiar a develop
Write-Host "Cambiando a rama develop..." -ForegroundColor Yellow
git checkout develop
if ($LASTEXITCODE -ne 0) { exit 1 }

# Actualizar develop
Write-Host "Actualizando develop desde origin..." -ForegroundColor Yellow
git pull origin develop
if ($LASTEXITCODE -ne 0) { exit 1 }

# Traer cambios de main
Write-Host "Trayendo cambios de main..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Hay conflictos. Resuélvelos y luego ejecuta:" -ForegroundColor Yellow
    Write-Host "   git add <archivos-resueltos>" -ForegroundColor White
    Write-Host "   git commit -m 'Merge main into develop'" -ForegroundColor White
    Write-Host "   git push origin develop" -ForegroundColor White
    Write-Host "   .\deploy-all.ps1 --skip-git" -ForegroundColor White
    exit 1
}

# Push a develop
Write-Host "Subiendo cambios a origin/develop..." -ForegroundColor Yellow
git push origin develop
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "✅ Git sincronizado exitosamente" -ForegroundColor Green
Write-Host ""

# ============================================
# PARTE 2: DESPLEGAR BACKEND
# ============================================
Write-Host "📋 PARTE 2: Desplegando Backend (Elastic Beanstalk)" -ForegroundColor Green
Write-Host ""

$deployBackend = Read-Host "¿Desplegar Backend? (S/N)"
if ($deployBackend -eq "S" -or $deployBackend -eq "s") {
    Write-Host "Navegando a carpeta Back..." -ForegroundColor Yellow
    Push-Location Back
    
    Write-Host "Verificando estado de EB..." -ForegroundColor Yellow
    eb status
    
    Write-Host ""
    Write-Host "Iniciando deploy a AWS Elastic Beanstalk..." -ForegroundColor Yellow
    eb deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Esperando 10 segundos para verificar salud..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        Write-Host "Estado de salud:" -ForegroundColor Yellow
        eb health
        
        Write-Host ""
        Write-Host "✅ Backend desplegado exitosamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error en el deploy del backend" -ForegroundColor Red
        Write-Host "Revisa los logs con: eb logs" -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host ""
} else {
    Write-Host "⏭️  Backend omitido" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# PARTE 3: DESPLEGAR FRONTEND
# ============================================
Write-Host "📋 PARTE 3: Desplegando Frontend (S3 + CloudFront)" -ForegroundColor Green
Write-Host ""

$deployFrontend = Read-Host "¿Desplegar Frontend? (S/N)"
if ($deployFrontend -eq "S" -or $deployFrontend -eq "s") {
    Write-Host "Navegando a carpeta Front..." -ForegroundColor Yellow
    Push-Location Front
    
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "Generando build de producción..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en el build" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "Subiendo archivos a S3..." -ForegroundColor Yellow
    aws s3 sync dist/ s3://capstone-front-tahir-20251007211205/ --delete
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error subiendo a S3" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "Invalidando cache de CloudFront..." -ForegroundColor Yellow
    $invalidation = aws cloudfront create-invalidation --distribution-id E1LYZEVTVJUV64 --paths "/*" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cache invalidado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Advertencia: No se pudo invalidar cache" -ForegroundColor Yellow
        Write-Host "Los cambios pueden tardar en verse" -ForegroundColor Yellow
    }
    
    Pop-Location
    
    Write-Host ""
    Write-Host "✅ Frontend desplegado exitosamente" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Frontend omitido" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ ¡Proceso completado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 URLs de producción:" -ForegroundColor White
Write-Host "  Frontend: https://d10nrn1yj450xr.cloudfront.net" -ForegroundColor Cyan
Write-Host "  Backend:  http://capstone-api-env.eba-u93fpfjr.us-east-1.elasticbeanstalk.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Nota: CloudFront puede tardar 1-2 minutos en actualizar" -ForegroundColor Yellow
Write-Host ""
