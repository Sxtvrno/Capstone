#!/bin/bash
# Script para sincronizar cambios de main a develop
# Uso: ./sync-main-to-develop.sh

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "  Sync Main → Develop → AWS"
echo -e "========================================${NC}"
echo ""

# Función para verificar si hay cambios sin commitear
check_working_directory() {
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}❌ Error: Tienes cambios sin commitear${NC}"
        echo ""
        echo -e "${YELLOW}Por favor, haz commit o stash de tus cambios primero:${NC}"
        echo -e "${YELLOW}  git add .${NC}"
        echo -e "${YELLOW}  git commit -m 'tu mensaje'${NC}"
        echo -e "${YELLOW}o${NC}"
        echo -e "${YELLOW}  git stash${NC}"
        exit 1
    fi
}

# Paso 1: Verificar estado del working directory
echo -e "${GREEN}📋 Paso 1: Verificando estado del repositorio...${NC}"
check_working_directory
echo -e "${GREEN}✅ Working directory limpio${NC}"
echo ""

# Paso 2: Cambiar a develop
echo -e "${GREEN}📋 Paso 2: Cambiando a rama develop...${NC}"
git checkout develop
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al cambiar a develop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ En rama develop${NC}"
echo ""

# Paso 3: Actualizar develop desde remoto
echo -e "${GREEN}📋 Paso 3: Actualizando develop desde origin...${NC}"
git pull origin develop
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al actualizar develop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Develop actualizado${NC}"
echo ""

# Paso 4: Traer cambios de main
echo -e "${GREEN}📋 Paso 4: Trayendo cambios de main...${NC}"
echo -e "${YELLOW}Ejecutando: git pull origin main${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Hubo conflictos durante el merge${NC}"
    echo ""
    echo -e "${CYAN}Sigue estos pasos:${NC}"
    echo -e "1. Resuelve los conflictos en los archivos marcados"
    echo -e "2. git add <archivos-resueltos>"
    echo -e "3. git commit -m 'Merge main into develop'"
    echo -e "4. Ejecuta este script nuevamente o continúa con:"
    echo -e "   git push origin develop"
    echo ""
    echo -e "${YELLOW}Archivos en conflicto:${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✅ Cambios de main integrados exitosamente${NC}"
echo ""

# Paso 5: Mostrar resumen de cambios
echo -e "${GREEN}📋 Paso 5: Resumen de cambios recientes...${NC}"
echo ""
echo -e "${CYAN}Últimos commits:${NC}"
git log --oneline -5
echo ""

# Paso 6: Confirmación antes de push
echo -e "${GREEN}📋 Paso 6: ¿Deseas subir los cambios a AWS (develop)?${NC}"
echo -e "${YELLOW}Esta acción hará push a origin/develop${NC}"
echo ""
read -p "Escribe 'SI' para continuar, cualquier otra cosa para cancelar: " confirmation

if [ "$confirmation" != "SI" ]; then
    echo ""
    echo -e "${RED}❌ Operación cancelada${NC}"
    echo -e "${YELLOW}Los cambios están en tu develop local pero NO se han subido${NC}"
    echo -e "${YELLOW}Para subir manualmente: git push origin develop${NC}"
    exit 0
fi

# Paso 7: Push a develop
echo ""
echo -e "${GREEN}📋 Paso 7: Subiendo cambios a origin/develop...${NC}"
git push origin develop

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al hacer push${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}========================================"
echo -e "${GREEN}✅ ¡Sincronización completada!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${GREEN}Los cambios de main ahora están en develop y en AWS${NC}"
echo -e "${YELLOW}Verifica el despliegue en tu pipeline de CI/CD${NC}"
echo ""
