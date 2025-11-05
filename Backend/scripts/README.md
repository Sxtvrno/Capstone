# Scripts de Utilidad

Este directorio contiene scripts auxiliares para mantenimiento del proyecto.

## fix_faq_typos.py

Script para corregir errores de codificación y typos comunes en las FAQs del chatbot.

### Uso:

```bash
# Ver cambios propuestos (dry-run)
python fix_faq_typos.py

# Aplicar cambios
python fix_faq_typos.py --apply
```

### Funciones:

- Elimina soft hyphens (­) invisibles
- Corrige acentos mal codificados
- Normaliza espacios y puntuación
- Respeta el formato JSON de las FAQs
