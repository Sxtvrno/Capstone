"""
Custom Actions para Rasa - Chatbot E-commerce
Conecta con PostgreSQL para consultar FAQs, pedidos y crear tickets.
"""

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import asyncpg
import os
from datetime import datetime
import re
import logging
import unicodedata
from dotenv import load_dotenv

# Carga variables de entorno desde Backend/.env para que las acciones
# tengan acceso a DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT, etc.
try:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DOTENV_PATH = os.path.join(BASE_DIR, ".env")
    if os.path.exists(DOTENV_PATH):
        load_dotenv(dotenv_path=DOTENV_PATH)
except Exception as _e:
    # No bloquear acciones si .env no está disponible; se usarán variables del entorno del proceso
    logging.getLogger(__name__).warning(f"No se pudo cargar .env: {_e}")


def redact_pii(text: str) -> str:
    """Redacta PII básica (emails, teléfonos, RUT/chilenos simples) del texto."""
    if not text:
        return text
    # Emails
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[email_redactado]", text)
    # Teléfonos (series de 8-12 dígitos, con o sin separadores)
    text = re.sub(r"(?:(?:\+?56)?\s?-?)?(?:\(?\d{2,3}\)?[-\s]?)?\d{7,9}", "[fono_redactado]", text)
    # RUT simple (formato 12.345.678-9 o 12345678-9)
    text = re.sub(r"\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b", "[rut_redactado]", text)
    return text

# Utilidades de normalización y tokenización (español sencillo)
STOPWORDS_ES = {
    "de", "la", "los", "las", "el", "un", "una", "que", "con", "y",
    "en", "para", "por", "a", "mi", "tu", "su", "sus", "del", "al",
    "me", "te", "se", "lo", "le", "les", "nos", "vos", "ya", "o",
    "u", "es", "son", "si", "no", "cual", "cuales", "cuál", "cuáles",
    "sobre", "este", "esta", "estos", "estas", "eso", "esa", "esas",
}

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    # Quitar acentos
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    # Reemplazar cualquier cosa que no sea alfanumérico por espacio
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()

def tokenize_es(text: str) -> List[str]:
    tokens = re.findall(r"\w+", text)
    tokens = [t for t in tokens if len(t) >= 3 and t not in STOPWORDS_ES]
    return tokens

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== CONFIGURACIÓN DE BASE DE DATOS ====================

async def get_db_connection():
    """Crea una conexión a PostgreSQL usando variables de entorno."""
    try:
        conn = await asyncpg.connect(
            user=os.getenv("DB_USER", "myprojectuser"),
            password=os.getenv("DB_PASSWORD", "mypassword"),
            database=os.getenv("DB_NAME", "myproject"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
        )
        return conn
    except Exception as e:
        logger.error(f"Error conectando a la base de datos: {e}")
        return None


# ==================== ACCIÓN: BUSCAR FAQ ====================

class ActionBuscarFAQ(Action):
    """Busca respuestas en la tabla FAQ según el mensaje del usuario."""

    def name(self) -> Text:
        return "action_buscar_faq"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        user_message = tracker.latest_message.get("text", "").lower()
        user_message_norm = normalize_text(user_message)
        user_tokens = tokenize_es(user_message_norm)
        logger.info(f"Buscando FAQ para: {user_message}")

        conn = await get_db_connection()
        if not conn:
            dispatcher.utter_message(text="Lo siento, hay un problema técnico. Por favor intenta más tarde.")
            return []

        try:
            # Intento de filtrado preliminar por coincidencia de texto (mejor performance que traer todo)
            # Nota: palabras_clave es TEXT, así que hacemos ILIKE simple
            sql = """
                SELECT id, categoria, pregunta, respuesta, palabras_clave
                FROM preguntas_frecuentes
                WHERE activo = TRUE
                  AND (
                        pregunta ILIKE $1 OR
                        respuesta ILIKE $1 OR
                        palabras_clave ILIKE $1
                  )
                ORDER BY id
                LIMIT 40
            """
            # Usar un token de contenido como patrón si existe (mejor que toda la frase con signos)
            primary_kw = user_tokens[0] if user_tokens else user_message[:100]
            pattern = f"%{primary_kw}%"
            faqs = await conn.fetch(sql, pattern)

            # Si no hay coincidencias por ILIKE, traer algunas activas para scoring por tokens
            if not faqs:
                faqs = await conn.fetch(
                    "SELECT id, categoria, pregunta, respuesta, palabras_clave FROM preguntas_frecuentes WHERE activo = TRUE ORDER BY id LIMIT 40"
                )

            # Buscar la mejor coincidencia
            best_match = None
            max_score = 0

            for faq in faqs:
                pregunta = faq['pregunta'].lower()
                respuesta = faq['respuesta']
                categoria = faq['categoria']

                # Score basado en tokens normalizados (pregunta + palabras_clave)
                faq_text = pregunta
                if faq.get('palabras_clave'):
                    try:
                        faq_text += " " + str(faq['palabras_clave'])
                    except Exception:
                        pass
                faq_tokens = set(tokenize_es(normalize_text(faq_text)))
                words_user = set(user_tokens)
                common_words = words_user & faq_tokens
                score = len(common_words)

                if score > max_score:
                    max_score = score
                    best_match = {
                        'pregunta': pregunta,
                        'respuesta': respuesta,
                        'categoria': categoria
                    }

            # Aceptamos coincidencias más tolerantes (>=1 token en común)
            if best_match and max_score >= 1:
                # Encontró una coincidencia razonable
                dispatcher.utter_message(text=best_match['respuesta'])

                # Guardar interacción
                await self.guardar_conversacion(
                    conn, tracker, user_message, best_match['respuesta']
                )
            elif faqs:
                # Si hubo coincidencia por ILIKE pero el score por tokens fue 0, devolver la primera
                first = faqs[0]
                dispatcher.utter_message(text=first['respuesta'])
                await self.guardar_conversacion(
                    conn, tracker, user_message, first['respuesta']
                )
            else:
                # No encontró respuesta adecuada
                dispatcher.utter_message(
                    text="No encontré información específica sobre eso. ¿Puedes reformular tu pregunta o prefieres hablar con un agente humano?"
                )
                await self.guardar_conversacion(
                    conn, tracker, user_message, "No se encontró FAQ relevante"
                )

        except Exception as e:
            logger.error(f"Error buscando FAQ: {e}")
            dispatcher.utter_message(text="Disculpa, tuve un problema buscando la información.")

        finally:
            await conn.close()

        return []
    
    async def guardar_conversacion(self, conn, tracker, mensaje, respuesta):
        """Guarda conversación solo si conocemos cliente_id (tabla interaccionchatbot requiere NOT NULL)."""
        try:
            metadata = tracker.latest_message.get("metadata") or {}
            cliente_id = metadata.get("cliente_id")
            if not cliente_id:
                return  # No guardamos si no hay cliente asociado

            query = """
                INSERT INTO InteraccionChatbot (cliente_id, message, response, created_at)
                VALUES ($1, $2, $3, $4)
            """
            await conn.execute(
                query,
                int(cliente_id),
                redact_pii(mensaje),
                redact_pii(respuesta),
                datetime.now(),
            )
        except Exception as e:
            logger.error(f"Error guardando conversación en InteraccionChatbot: {e}")


# ==================== ACCIÓN: CONSULTAR PEDIDO ====================

class ActionConsultarPedido(Action):
    """Consulta el estado de un pedido por su ID."""

    def name(self) -> Text:
        return "action_consultar_pedido"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        
        # Extraer pedido_id del mensaje
        user_message = tracker.latest_message.get("text", "")
        pedido_id = self.extraer_pedido_id(user_message)
        
        if not pedido_id:
            dispatcher.utter_message(response="utter_pedir_pedido_id")
            return []
        
        logger.info(f"Consultando pedido ID: {pedido_id}")

        conn = await get_db_connection()
        if not conn:
            dispatcher.utter_message(text="Lo siento, hay un problema técnico.")
            return []
        
        try:
            # Obtener datos del pedido
            query = """
                SELECT 
                    p.id,
                    p.order_status,
                    p.total_price,
                    p.shipping_address,
                    p.created_at,
                    p.updated_at,
                    c.first_name,
                    c.email
                FROM Pedido p
                JOIN Cliente c ON p.cliente_id = c.id
                WHERE p.id = $1
            """
            pedido = await conn.fetchrow(query, int(pedido_id))
            
            if pedido:
                # Obtener productos del pedido
                productos_query = """
                    SELECT 
                        pr.title,
                        dp.quantity,
                        dp.unit_price
                    FROM DetallePedido dp
                    JOIN Producto pr ON dp.producto_id = pr.id
                    WHERE dp.pedido_id = $1
                    ORDER BY pr.title
                    LIMIT 5
                """
                productos = await conn.fetch(productos_query, int(pedido_id))
                
                # Obtener información de pago si existe
                pago_query = """
                    SELECT payment_status, payment_method, payment_date
                    FROM Pago
                    WHERE order_id = $1
                    ORDER BY payment_date DESC
                    LIMIT 1
                """
                pago = await conn.fetchrow(pago_query, int(pedido_id))
                
                # Formatear respuesta
                estado = pedido['order_status']
                total = pedido['total_price']
                fecha = pedido['created_at'].strftime("%d/%m/%Y")
                direccion = pedido['shipping_address']
                
                # Construir lista de productos
                productos_texto = ""
                if productos:
                    productos_texto = "\n\n**Productos:**\n"
                    for i, prod in enumerate(productos, 1):
                        productos_texto += f"{i}. {prod['title']} (x{prod['quantity']}) - ${prod['unit_price']:,.0f}\n"
                    
                    total_productos = len(productos)
                    if total_productos >= 5:
                        productos_texto += "_(y más productos)_\n"
                
                # Información de pago
                pago_texto = ""
                if pago:
                    pago_texto = f"\n**Estado de Pago:** {pago['payment_status']}"
                    if pago['payment_method']:
                        pago_texto += f" ({pago['payment_method']})"
                
                mensaje = f"""
📦 **Estado de tu Pedido #{pedido_id}**

**Estado:** {self.emoji_estado(estado)} {estado.upper().replace('_', ' ')}
**Total:** ${total:,.0f}
**Fecha de Pedido:** {fecha}{pago_texto}{productos_texto}
**Dirección de envío:** {direccion}

{self.mensaje_segun_estado(estado)}

_¿Necesitas más información? Escribe 'ayuda' o habla con un agente._
"""
                dispatcher.utter_message(text=mensaje.strip())
            else:
                dispatcher.utter_message(
                    text=f"❌ No encontré el pedido #{pedido_id}. Por favor verifica el número de pedido o contacta a soporte."
                )
        
        except Exception as e:
            logger.error(f"Error consultando pedido: {e}")
            dispatcher.utter_message(text="Hubo un error al consultar tu pedido. Intenta nuevamente.")
        
        finally:
            await conn.close()
        
        return [SlotSet("pedido_id", pedido_id)]
    
    def extraer_pedido_id(self, text: str) -> str:
        """Extrae el ID del pedido del texto."""
        # Buscar números en el texto
        match = re.search(r'\b\d{1,6}\b', text)
        return match.group(0) if match else None
    
    def emoji_estado(self, estado: str) -> str:
        """Devuelve emoji según el estado del pedido."""
        emojis = {
            'creado': '📝',
            'en preparación': '📦',
            'listo para retiro': '✅',
            'entregado': '🎉',
            'cancelado': '❌'
        }
        return emojis.get(estado.lower(), '📋')
    
    def mensaje_segun_estado(self, estado: str) -> str:
        """Devuelve mensaje adicional según el estado del pedido."""
        mensajes = {
               'creado': '⏳ Tu pedido ha sido creado y está en proceso de validación de pago.',
               'en preparación': '📦 ¡Tu pedido está siendo preparado! Pronto estará listo para que lo retires.',
               'listo para retiro': '✅ ¡Tu pedido está listo! Puedes pasar a retirarlo en nuestra tienda.',
               'entregado': '🎉 ¡Tu pedido ha sido entregado! Esperamos que lo disfrutes.',
               'cancelado': '❌ Este pedido ha sido cancelado. Si tienes dudas, contacta a soporte.'
        }
        return mensajes.get(estado.lower(), '📞 Consulta con nuestro equipo para más detalles.')


# ==================== ACCIÓN: CREAR TICKET ====================

class ActionCrearTicket(Action):
    """Crea un ticket de soporte para escalamiento a humano."""

    def name(self) -> Text:
        return "action_crear_ticket"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        
        session_id = tracker.sender_id
        user_message = tracker.latest_message.get("text", "")
        
        # Extraer contexto de la conversación
        eventos = tracker.events
        historial = []
        for evento in eventos[-10:]:  # Últimos 10 eventos
            if evento.get("event") == "user":
                historial.append(f"Usuario: {evento.get('text', '')}")
            elif evento.get("event") == "bot":
                historial.append(f"Bot: {evento.get('text', '')}")
        
        contexto = "\n".join(historial)
        
        conn = await get_db_connection()
        if not conn:
            dispatcher.utter_message(text="No pude crear el ticket. Intenta más tarde.")
            return []
        
        try:
            # Crear ticket en tickets_soporte
            metadata = tracker.latest_message.get("metadata") or {}
            cliente_id = metadata.get("cliente_id")

            query = """
                INSERT INTO tickets_soporte (
                    usuario_id,
                    conversacion,
                    estado,
                    fecha_creacion,
                    notas
                )
                VALUES ($1, $2, 'pendiente', $3, $4)
                RETURNING id
            """

            asunto = "Solicitud de asistencia desde chatbot"
            mensaje_completo = (
                f"[Chatbot] {asunto}.\n\nÚltimo mensaje: {user_message}\n\nContexto:\n{contexto}"
            )

            ticket_id = await conn.fetchval(
                query,
                int(cliente_id) if cliente_id else None,
                redact_pii(mensaje_completo),
                datetime.now(),
                None,
            )
            
            logger.info(f"Ticket creado con ID: {ticket_id}")
            
            # Si hay cliente autenticado, guardar interacción en InteraccionChatbot
            if cliente_id:
                try:
                    await conn.execute(
                        "INSERT INTO InteraccionChatbot (cliente_id, message, response, created_at) VALUES ($1, $2, $3, $4)",
                        int(cliente_id),
                        redact_pii(user_message),
                        f"Ticket #{ticket_id} creado",
                        datetime.now(),
                    )
                except Exception as e:
                    logger.warning(f"No se pudo registrar interacción post-ticket: {e}")
            
            dispatcher.utter_message(
                text=f"✅ Tu ticket #{ticket_id} ha sido creado. Un agente te contactará pronto."
            )
        
        except Exception as e:
            logger.error(f"Error creando ticket: {e}")
            dispatcher.utter_message(text="Hubo un error al crear tu ticket. Intenta nuevamente.")
        
        finally:
            await conn.close()
        
        return []


# ==================== ACCIÓN: GUARDAR CONVERSACIÓN ====================

class ActionGuardarConversacion(Action):
    """Guarda cada interacción en la base de datos."""

    def name(self) -> Text:
        return "action_guardar_conversacion"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        
        # Guardamos solo si conocemos cliente_id (mismo criterio que arriba)
        metadata = tracker.latest_message.get("metadata") or {}
        cliente_id = metadata.get("cliente_id")
        if not cliente_id:
            return []

        user_message = tracker.latest_message.get("text", "")

        # Obtener última respuesta del bot (si la hay)
        bot_response = ""
        for evento in reversed(tracker.events):
            if evento.get("event") == "bot":
                bot_response = evento.get("text", "")
                break

        conn = await get_db_connection()
        if not conn:
            return []

        try:
            await conn.execute(
                "INSERT INTO InteraccionChatbot (cliente_id, message, response, created_at) VALUES ($1, $2, $3, $4)",
                int(cliente_id),
                redact_pii(user_message),
                redact_pii(bot_response),
                datetime.now(),
            )
        except Exception as e:
            logger.error(f"Error guardando conversación: {e}")
        finally:
            await conn.close()

        return []


# ==================== ACCIÓN: FALLBACK ====================

class ActionDefaultFallback(Action):
    """Acción cuando el bot no entiende."""

    def name(self) -> Text:
        return "action_default_fallback"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        
        dispatcher.utter_message(
            text="Disculpa, no entendí bien. ¿Podrías reformular tu pregunta? También puedes escribir 'ayuda' para ver qué puedo hacer."
        )
        return []
