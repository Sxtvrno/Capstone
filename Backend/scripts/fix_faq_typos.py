"""Fix specific typos and encoding issues in FAQs"""
import asyncio
import asyncpg
from dotenv import load_dotenv
import os
import argparse
import re

# Pattern-based corrections (regex, replacement)
PATTERN_CORRECTIONS = [
    (r'\benvos\b', 'envíos'),
    (r'\b(\d+)\s+das\b', r'\1 días'),  # "30 das" -> "30 días"
    (r'\b(\d+)\s+aos\b', r'\1 años'),  # "2 aos" -> "2 años"
    (r'\bgaranta\b', 'garantía'),
    (r'\bpolítica\b', 'política'),
    (r'^S,', 'Sí,'),  # At start of sentence
]

# Direct string replacements (for soft hyphens in specific words)
DIRECT_REPLACEMENTS = {
    'enví\u00ado': 'envío',
    'devolució\u00adn': 'devolución',
}

async def fix_typos(apply=False):
    load_dotenv()
    conn = await asyncpg.connect(
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT'))
    )
    
    try:
        rows = await conn.fetch('SELECT id, pregunta, respuesta, palabras_clave FROM preguntas_frecuentes')
        print(f"Encontradas {len(rows)} FAQs. Buscando errores...")
        
        updates = []
        for row in rows:
            faq_id = row['id']
            pregunta = row['pregunta']
            respuesta = row['respuesta']
            palabras = row['palabras_clave']
            
            # Clean soft hyphens
            pregunta_fixed = pregunta.replace('\u00AD', '')
            respuesta_fixed = respuesta.replace('\u00AD', '')
            palabras_fixed = palabras.replace('\u00AD', '') if palabras else None
            
            # Apply direct replacements
            for wrong, correct in DIRECT_REPLACEMENTS.items():
                pregunta_fixed = pregunta_fixed.replace(wrong, correct)
                respuesta_fixed = respuesta_fixed.replace(wrong, correct)
                if palabras_fixed:
                    palabras_fixed = palabras_fixed.replace(wrong, correct)
            
            # Apply pattern corrections
            for pattern, replacement in PATTERN_CORRECTIONS:
                pregunta_fixed = re.sub(pattern, replacement, pregunta_fixed)
                respuesta_fixed = re.sub(pattern, replacement, respuesta_fixed)
                if palabras_fixed:
                    palabras_fixed = re.sub(pattern, replacement, palabras_fixed)
            
            if (pregunta_fixed != pregunta or 
                respuesta_fixed != respuesta or 
                palabras_fixed != palabras):
                
                updates.append({
                    'id': faq_id,
                    'pregunta': pregunta_fixed,
                    'respuesta': respuesta_fixed,
                    'palabras_clave': palabras_fixed,
                    'old_pregunta': pregunta,
                    'old_respuesta': respuesta[:80],
                    'new_respuesta': respuesta_fixed[:80]
                })
                
                print(f"\n=== FAQ #{faq_id} ===")
                if pregunta != pregunta_fixed:
                    print(f"  Pregunta:")
                    print(f"    ANTES: {pregunta}")
                    print(f"    DESPUÉS: {pregunta_fixed}")
                if respuesta != respuesta_fixed:
                    print(f"  Respuesta:")
                    print(f"    ANTES: {respuesta[:100]}...")
                    print(f"    DESPUÉS: {respuesta_fixed[:100]}...")
        
        if not updates:
            print("\n✅ No se encontraron errores.")
            return
        
        print(f"\n\nSe encontraron {len(updates)} FAQs con errores.")
        
        if apply:
            print("\n🔄 Aplicando correcciones...")
            for upd in updates:
                await conn.execute(
                    '''
                    UPDATE preguntas_frecuentes
                    SET pregunta = $1, respuesta = $2, palabras_clave = $3
                    WHERE id = $4
                    ''',
                    upd['pregunta'], upd['respuesta'], upd['palabras_clave'], upd['id']
                )
            print(f"✅ {len(updates)} FAQs actualizadas correctamente.")
        else:
            print("\n⚠️  MODO SIMULACIÓN - No se aplicaron cambios.")
            print("Ejecuta con --apply para aplicar las correcciones.")
    
    finally:
        await conn.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fix typos and encoding issues in FAQs')
    parser.add_argument('--apply', action='store_true', help='Actually update the database (default is simulation)')
    args = parser.parse_args()
    
    asyncio.run(fix_typos(apply=args.apply))
