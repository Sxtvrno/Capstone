from django.conf import settings
from fastapi import FastAPI, HTTPException, Depends, status, Security, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from fastapi import Body
from fastapi.exceptions import RequestValidationError
from typing import List, Optional
import os
import django
import asyncpg
from asyncpg.pool import Pool
import logging
from jose import JWTError, jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from transbank.common.options import Options
from transbank.webpay.webpay_plus.transaction import Transaction
from transbank.common.integration_type import IntegrationType
from transbank.common.integration_commerce_codes import IntegrationCommerceCodes
from transbank.common.integration_api_keys import IntegrationApiKeys
import transbank.webpay.webpay_plus.transaction as tr
from fastapi.responses import HTMLResponse, RedirectResponse
import secrets

try:
    from transbank.common.options import WebpayOptions
except Exception:
    WebpayOptions = None

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Back.settings")
django.setup()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROLE_ADMIN = "admin"
ROLE_CLIENTE = "cliente"
FRONTEND_URL = getattr(
    settings, "FRONTEND_URL", os.getenv("FRONTEND_URL", "http://localhost:5173")
)


# Servicio Email
class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")

    async def send_email(
        self, to_email: str, subject: str, body: str, is_html: bool = True
    ):
        try:
            msg = MIMEMultipart()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html" if is_html else "plain"))

            import asyncio
            from concurrent.futures import ThreadPoolExecutor

            def sync_send():
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
                server.quit()

            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as pool:
                await loop.run_in_executor(pool, sync_send)

            logger.info(f"Correo enviado a {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error enviando correo a {to_email}: {e}")
            return False

    async def send_verification_email(self, email: str, token: str):
        # Usar FRONTEND_URL para que el link apunte al frontend
        frontend_url = os.getenv("FRONTEND_URL") or "http://localhost:5173"
        verification_url = f"{frontend_url}/verify-email?token={token}"

        subject = "Verifica tu correo electrónico"
        html_body = f"""
        <html><body>
        <h2>Verifica tu dirección de correo</h2>
        <p>Haz clic en el siguiente enlace para verificar tu correo:</p>
        <p><a href="{verification_url}">{verification_url}</a></p>
        <p>El enlace expira en 24 horas.</p>
        </body></html>
        """
        return await self.send_email(email, subject, html_body)

    async def send_welcome_email(self, email: str, first_name: str):
        subject = "¡Bienvenido!"
        html_body = f"<html><body><h2>Hola {first_name}, tu cuenta fue verificada.</h2></body></html>"
        return await self.send_email(email, subject, html_body)

    async def send_password_reset_email(self, email: str, token: str):
        frontend_url = os.getenv("FRONTEND_URL") or "http://localhost:5173"
        reset_url = f"{frontend_url}/reset-password?token={token}"
        subject = "Restablecer contraseña"
        html_body = f"""
        <html><body>
        <p>Para restablecer tu contraseña usa el siguiente enlace:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p>El enlace expira en 1 hora.</p>
        </body></html>
        """
        return await self.send_email(email, subject, html_body)


email_service = EmailService()


class SendReceiptRequest(BaseModel):
    to_email: Optional[str] = None
    include_items: Optional[bool] = True


# Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str
    role: str
    verification_status: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    address: Optional[str] = None  # Ignorado (se maneja en Direccion)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class DetallePedidoItem(BaseModel):
    producto_id: int
    quantity: int = 1
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


# Producto
class ProductoCreate(BaseModel):
    sku: str
    title: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    category_id: int


class ProductoImagenCreate(BaseModel):
    url_imagen: str


class ProductoImagenResponse(BaseModel):
    id: int
    producto_id: int
    url_imagen: str


class ProductoUpdate(BaseModel):
    sku: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None


class ProductoResponse(BaseModel):
    id: int
    sku: str
    title: str
    description: Optional[str]
    price: float
    stock_quantity: int
    category_id: int
    status: str

    class Config:
        from_attributes = True


class MensajeResponse(BaseModel):
    mensaje: str
    exito: bool


# Schemas adicionales para CRUD Cliente y Administrador
class ClienteCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str


class ClienteUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    verification_status: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str
    social_login_id: Optional[str]
    verification_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdministradorCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    role: Optional[str] = "admin"


class AdministradorUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdministradorResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class DireccionCreate(BaseModel):
    comuna: str
    region: str
    calle: str
    nro: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_default: Optional[bool] = False


class DireccionUpdate(BaseModel):
    comuna: Optional[str] = None
    region: Optional[str] = None
    calle: Optional[str] = None
    nro: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_default: Optional[bool] = None


class DireccionResponse(BaseModel):
    id: int
    cliente_id: int
    comuna: str
    region: str
    calle: str
    nro: str
    lat: Optional[float]
    lon: Optional[float]
    is_default: bool

    class Config:
        from_attributes = True


# ==================== TRANSBANK SCHEMAS Y ESTADO EN MEMORIA ====================
# Añadir estos modelos ANTES de definir los endpoints de Transbank


class TransbankCreateRequest(BaseModel):
    pedido_id: int
    session_id: Optional[str] = None


class TransbankCreateResponse(BaseModel):
    token: str
    url: str
    pedido_id: int


class TransbankConfirmResponse(BaseModel):
    status: str
    message: str
    pedido_id: Optional[int] = None
    amount: Optional[float] = None
    authorization_code: Optional[str] = None
    transaction_date: Optional[str] = None
    payment_type_code: Optional[str] = None
    card_number: Optional[str] = None
    payment_id: Optional[int] = None


class TransbankStatusResponse(BaseModel):
    status: str
    amount: Optional[float] = None
    buy_order: Optional[str] = None
    authorization_code: Optional[str] = None


class TransbankRefundRequest(BaseModel):
    amount: float


class TransbankRefundResponse(BaseModel):
    type: str
    authorization_code: Optional[str] = None
    authorization_date: Optional[str] = None
    nullified_amount: Optional[float] = None
    balance: Optional[float] = None


class PagoResponse(BaseModel):
    payment_id: int
    order_id: int
    payment_method: str
    payment_status: str
    transaction_id: str
    amount: float
    payment_date: datetime

    class Config:
        from_attributes = True


# Almacenamiento temporal de transacciones (token_ws -> metadata)
pending_transactions: dict = {}


# ==================== MODELOS DE PAGO ====================
class CheckoutRequest(BaseModel):
    direccion_envio: str
    ciudad: str
    region: str
    codigo_postal: str
    telefono: str
    notas: Optional[str] = None


class PaymentInitResponse(BaseModel):
    token: str
    url: str


class PaymentStatus(BaseModel):
    order_id: int
    status: str
    amount: float
    payment_date: Optional[datetime] = None


# ===== Modelos Transbank: aceptar snake_case y camelCase =====
class TBKCreateRequest(BaseModel):
    amount: int = Field(..., alias="amount")
    session_id: Optional[str] = Field(None, alias="sessionId")
    return_url: Optional[str] = Field(None, alias="returnUrl")
    pedido_id: Optional[int] = Field(None, alias="pedidoId")
    items: Optional[List[DetallePedidoItem]] = Field(None, alias="items")

    class Config:
        allow_population_by_field_name = True
        extra = "ignore"


class TBKCreateResponse(BaseModel):
    token: str
    url: str
    pedido_id: Optional[int] = None


class TBKConfirmRequest(BaseModel):
    token_ws: str


# Password utils
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# DB pool
class Database:
    def __init__(self):
        self.pool: Optional[Pool] = None

    async def connect(self):
        try:
            db_config = settings.DATABASES["default"]
            self.pool = await asyncpg.create_pool(
                user=db_config["USER"],
                password=db_config["PASSWORD"],
                database=db_config["NAME"],
                host=db_config["HOST"],
                port=db_config["PORT"],
            )
            logger.info("Conectado a PostgreSQL")
        except Exception as e:
            logger.error(f"Error conectando a PostgreSQL: {e}")
            raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info("Desconectado de PostgreSQL")


database = Database()


async def get_db():
    async with database.pool.acquire() as connection:
        yield connection


app = FastAPI(
    title="API CRUD con PostgreSQL y JWT",
    description="FastAPI con CRUD para productos y auth con roles (Administrador/Cliente).",
    version="2.0.0",
)

# CORS
origins = [
    "http://during-consultant.gl.at.ply.gg:47021",
    "http://147.185.221.18:47021",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8001",
    # Producción (CloudFront)
    "https://d10nrn1yj450xr.cloudfront.net",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()


# JWT helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# User helpers using nueva BD (Administrador / Cliente)
async def get_user_by_email(email: str, conn) -> Optional[dict]:
    try:
        # Administrador
        admin_q = """
            SELECT id, email, first_name, last_name, phone, role, is_active
            FROM Administrador
            WHERE email = $1
        """
        admin = await conn.fetchrow(admin_q, email)
        if admin:
            data = dict(admin)
            data["role"] = data.get("role") or ROLE_ADMIN
            data["verification_status"] = "verificado"
            return data

        # Cliente
        cliente_q = """
            SELECT id, email, first_name, last_name, phone, verification_status
            FROM Cliente
            WHERE email = $1
        """
        cliente = await conn.fetchrow(cliente_q, email)
        if cliente:
            data = dict(cliente)
            data["role"] = ROLE_CLIENTE
            return data

        return None
    except Exception as e:
        logger.error(f"Error obteniendo usuario por email: {e}")
        return None


async def authenticate_user(username: str, password: str, conn) -> Optional[dict]:
    try:
        # Intentar Administrador
        q_admin = """
            SELECT id, email, hash_pwd, first_name, last_name, phone, role, is_active
            FROM Administrador
            WHERE email = $1
        """
        admin = await conn.fetchrow(q_admin, username)
        if admin:
            if not verify_password(password, admin["hash_pwd"]):
                return None
            if not admin["is_active"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Administrador inactivo",
                )
            data = dict(admin)
            data["role"] = data.get("role") or ROLE_ADMIN
            data["verification_status"] = "verificado"
            return data

        # Intentar Cliente
        q_cli = """
            SELECT id, email, hash_pwd, first_name, last_name, phone, verification_status
            FROM Cliente
            WHERE email = $1
        """
        cli = await conn.fetchrow(q_cli, username)
        if cli:
            if not verify_password(password, cli["hash_pwd"]):
                return None
            if cli["verification_status"] != "verificado":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Cliente no verificado",
                )
            data = dict(cli)
            data["role"] = ROLE_CLIENTE
            return data

        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error autenticando usuario: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security), conn=Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido"
            )

        user = await get_user_by_email(email, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
            )

        # Si el token declara role, debe coincidir
        if role and user.get("role") != role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido (rol)"
            )

        # Clientes deben estar verificados
        if (
            user.get("role") == ROLE_CLIENTE
            and user.get("verification_status") != "verificado"
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no verificado"
            )

        # Admin debe estar activo si el campo existe
        if user.get("role") == ROLE_ADMIN and user.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrador inactivo",
            )

        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al decodificar token",
        )


async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol administrador"
        )
    return user


# ==================== MODELOS DEL CARRITO ====================


class CartAddItemRequest(BaseModel):
    producto_id: int
    quantity: int = 1
    session_id: Optional[str] = None


class CartUpdateItemRequest(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    producto_id: int
    title: str
    unit_price: float
    quantity: int
    total_price: float
    stock_quantity: int


class CartResponse(BaseModel):
    cart_id: int
    items: List[CartItemResponse]
    total_items: int
    subtotal: float


class CartMergeRequest(BaseModel):
    session_id: str


# ==================== DEPENDENCIAS DE AUTENTICACIÓN OPCIONAL ====================

optional_security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
    conn=Depends(get_db),
) -> Optional[dict]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if not email:
            return None
        user = await get_user_by_email(email, conn)
        if not user:
            return None
        if role and user.get("role") != role:
            return None
        if (
            user.get("role") == ROLE_CLIENTE
            and user.get("verification_status") != "verificado"
        ):
            return None
        if user.get("role") == ROLE_ADMIN and user.get("is_active") is False:
            return None
        return user
    except Exception:
        return None


# ==================== HELPERS DE CARRITO ====================
async def get_or_create_cart(
    conn, *, cliente_id: Optional[int] = None, session_id: Optional[str] = None
):
    if cliente_id:
        # Si hay cliente_id, solo usar cliente_id (usuario autenticado)
        cart = await conn.fetchrow(
            "SELECT id FROM Carrito WHERE cliente_id = $1", cliente_id
        )
        if not cart:
            cart = await conn.fetchrow(
                "INSERT INTO Carrito (cliente_id) VALUES ($1) RETURNING id", cliente_id
            )
        return cart["id"]
    elif session_id:
        # Si no hay cliente_id, usar session_id (usuario anónimo)
        cart = await conn.fetchrow(
            "SELECT id FROM Carrito WHERE session_id = $1", session_id
        )
        if not cart:
            cart = await conn.fetchrow(
                "INSERT INTO Carrito (session_id) VALUES ($1) RETURNING id", session_id
            )
        return cart["id"]
    else:
        # Si no hay ninguno, error
        raise HTTPException(
            status_code=400,
            detail="Se requiere session_id para carritos anónimos o cliente_id para autenticados",
        )


async def get_cart_summary(conn, cart_id: int) -> CartResponse:
    rows = await conn.fetch(
        """
        SELECT ac.producto_id,
               ac.quantity,
               ac.total_price,
               p.title,
               p.price AS unit_price,
               p.stock_quantity,
               img.url_imagen
        FROM ArticuloCarrito ac
        JOIN Producto p ON p.id = ac.producto_id
        LEFT JOIN LATERAL (
            SELECT url_imagen
            FROM productoimagen
            WHERE producto_id = p.id
            ORDER BY id ASC
            LIMIT 1
        ) img ON TRUE
        WHERE ac.carrito_id = $1
        ORDER BY ac.producto_id
        """,
        cart_id,
    )
    items = [
        {
            "producto_id": r["producto_id"],
            "title": r["title"],
            "unit_price": float(r["unit_price"]),
            "quantity": r["quantity"],
            "total_price": float(r["total_price"]),
            "stock_quantity": r["stock_quantity"],
            "url_imagen": r["url_imagen"],
        }
        for r in rows
    ]
    subtotal = float(sum(r["total_price"] for r in rows)) if rows else 0.0
    total_items = int(sum(r["quantity"] for r in rows)) if rows else 0
    return {
        "cart_id": cart_id,
        "items": items,
        "total_items": total_items,
        "subtotal": subtotal,
    }


async def ensure_product_and_price(conn, producto_id: int):
    prod = await conn.fetchrow(
        "SELECT id, price, stock_quantity, status FROM Producto WHERE id = $1",
        producto_id,
    )
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if prod["status"] != "activo":
        raise HTTPException(status_code=400, detail="Producto no disponible")
    return prod


# ==================== ENDPOINTS DEL CARRITO ====================
@app.get("/api/cart", response_model=CartResponse)
async def get_cart(
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    """
    Obtener el carrito.
    - Cliente autenticado: ignorará session_id y usará su carrito.
    - Anónimo: requiere session_id.
    """
    if not user and not session_id:
        raise HTTPException(
            status_code=400, detail="session_id requerido para carritos anónimos"
        )
    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )
    await conn.execute(
        "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
    )
    return await get_cart_summary(conn, cart_id)


@app.get("/api/cart/items", response_model=CartResponse)
async def get_cart_items(
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    """
    Obtener los items del carrito.
    - Cliente autenticado: ignora session_id y usa su carrito.
    - Anónimo: requiere session_id.
    """
    if not user and not session_id:
        raise HTTPException(
            status_code=400, detail="session_id requerido para carritos anónimos"
        )
    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )
    await conn.execute(
        "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
    )
    return await get_cart_summary(conn, cart_id)


@app.post("/api/cart/items", response_model=CartResponse)
async def add_item_cart(
    payload: CartAddItemRequest,
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    """
    Agregar un producto al carrito (o incrementar su cantidad).
    """
    # Si no hay usuario, tomar session_id del payload si no viene por query
    if not user:
        if not session_id:
            session_id = getattr(payload, "session_id", None)
        if not session_id:
            raise HTTPException(
                status_code=400, detail="session_id requerido para carritos anónimos"
            )
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )
    prod = await ensure_product_and_price(conn, payload.producto_id)

    # Verificar existencia de item
    existing = await conn.fetchrow(
        "SELECT quantity FROM ArticuloCarrito WHERE carrito_id = $1 AND producto_id = $2",
        cart_id,
        payload.producto_id,
    )
    new_qty = payload.quantity + (existing["quantity"] if existing else 0)

    # Opcional: validar stock disponible
    if new_qty > prod["stock_quantity"]:
        new_qty = prod["stock_quantity"]

    total_price = float(prod["price"]) * new_qty

    async with conn.transaction():
        if existing:
            await conn.execute(
                """
                UPDATE ArticuloCarrito
                SET quantity = $1, total_price = $2
                WHERE carrito_id = $3 AND producto_id = $4
                """,
                new_qty,
                total_price,
                cart_id,
                payload.producto_id,
            )
        else:
            await conn.execute(
                """
                INSERT INTO ArticuloCarrito (carrito_id, producto_id, quantity, total_price)
                VALUES ($1, $2, $3, $4)
                """,
                cart_id,
                payload.producto_id,
                new_qty,
                total_price,
            )
        await conn.execute(
            "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
        )

    return await get_cart_summary(conn, cart_id)


@app.put("/api/cart/items/{producto_id}", response_model=CartResponse)
async def update_item_cart(
    producto_id: int,
    payload: CartUpdateItemRequest,
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    """
    Actualizar cantidad de un item del carrito. Si quantity = 0, elimina el item.
    """
    if not user and not session_id:
        raise HTTPException(
            status_code=400, detail="session_id requerido para carritos anónimos"
        )
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Cantidad inválida")

    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )

    existing = await conn.fetchrow(
        "SELECT quantity FROM ArticuloCarrito WHERE carrito_id = $1 AND producto_id = $2",
        cart_id,
        producto_id,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="El producto no está en el carrito")

    if payload.quantity == 0:
        async with conn.transaction():
            await conn.execute(
                "DELETE FROM ArticuloCarrito WHERE carrito_id = $1 AND producto_id = $2",
                cart_id,
                producto_id,
            )
            await conn.execute(
                "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                cart_id,
            )
        return await get_cart_summary(conn, cart_id)

    prod = await ensure_product_and_price(conn, producto_id)
    new_qty = min(payload.quantity, prod["stock_quantity"])
    total_price = float(prod["price"]) * new_qty

    async with conn.transaction():
        await conn.execute(
            """
            UPDATE ArticuloCarrito
            SET quantity = $1, total_price = $2
            WHERE carrito_id = $3 AND producto_id = $4
            """,
            new_qty,
            total_price,
            cart_id,
            producto_id,
        )
        await conn.execute(
            "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
        )

    return await get_cart_summary(conn, cart_id)


@app.delete("/api/cart/items/{producto_id}", response_model=CartResponse)
async def remove_item_cart(
    producto_id: int,
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
):
    """
    Eliminar un producto del carrito.
    """
    if not user and not session_id:
        raise HTTPException(
            status_code=400, detail="session_id requerido para carritos anónimos"
        )

    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )

    async with conn.transaction():
        await conn.execute(
            "DELETE FROM ArticuloCarrito WHERE carrito_id = $1 AND producto_id = $2",
            cart_id,
            producto_id,
        )
        await conn.execute(
            "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
        )

    return await get_cart_summary(conn, cart_id)


from fastapi import Request


@app.post("/api/cart/clear", response_model=CartResponse)
async def clear_cart(
    session_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
    conn=Depends(get_db),
    request: Request = None,
):
    """
    Vaciar el carrito.
    """
    # Si no hay usuario, tomar session_id del body si no viene por query
    if not user:
        if not session_id and request is not None:
            try:
                data = await request.json()
                session_id = data.get("session_id")
            except Exception:
                pass
        if not session_id:
            raise HTTPException(
                status_code=400, detail="session_id requerido para carritos anónimos"
            )

    cart_id = await get_or_create_cart(
        conn,
        cliente_id=user["id"] if user and user.get("role") == ROLE_CLIENTE else None,
        session_id=session_id,
    )

    async with conn.transaction():
        await conn.execute("DELETE FROM ArticuloCarrito WHERE carrito_id = $1", cart_id)
        await conn.execute(
            "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", cart_id
        )

    return await get_cart_summary(conn, cart_id)


@app.post("/api/cart/merge", response_model=CartResponse)
async def merge_cart(
    payload: CartMergeRequest,
    user: dict = Depends(get_current_user),  # requiere login
    conn=Depends(get_db),
):
    """
    Fusionar carrito anónimo (session_id) con el carrito del usuario autenticado.
    - Suma cantidades por producto.
    - Recalcula total_price según precio actual.
    - Borra el carrito anónimo.
    """
    if user.get("role") != ROLE_CLIENTE:
        raise HTTPException(
            status_code=403, detail="Solo clientes pueden fusionar carritos"
        )

    if not payload.session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")

    user_cart_id = await get_or_create_cart(conn, cliente_id=user["id"])
    anon_cart = await conn.fetchrow(
        "SELECT id FROM Carrito WHERE session_id = $1", payload.session_id
    )
    if not anon_cart:
        return await get_cart_summary(conn, user_cart_id)

    anon_cart_id = anon_cart["id"]
    anon_items = await conn.fetch(
        "SELECT producto_id, quantity FROM ArticuloCarrito WHERE carrito_id = $1",
        anon_cart_id,
    )

    async with conn.transaction():
        for it in anon_items:
            producto_id = it["producto_id"]
            qty_to_add = it["quantity"]

            prod = await ensure_product_and_price(conn, producto_id)

            # Ver si existe en el carrito del usuario
            existing = await conn.fetchrow(
                "SELECT quantity FROM ArticuloCarrito WHERE carrito_id = $1 AND producto_id = $2",
                user_cart_id,
                producto_id,
            )
            new_qty = qty_to_add + (existing["quantity"] if existing else 0)
            new_qty = min(new_qty, prod["stock_quantity"])
            total_price = float(prod["price"]) * new_qty

            if existing:
                await conn.execute(
                    """
                    UPDATE ArticuloCarrito
                    SET quantity = $1, total_price = $2
                    WHERE carrito_id = $3 AND producto_id = $4
                    """,
                    new_qty,
                    total_price,
                    user_cart_id,
                    producto_id,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO ArticuloCarrito (carrito_id, producto_id, quantity, total_price)
                    VALUES ($1, $2, $3, $4)
                    """,
                    user_cart_id,
                    producto_id,
                    new_qty,
                    total_price,
                )

        # Borrar carrito anónimo
        await conn.execute(
            "DELETE FROM ArticuloCarrito WHERE carrito_id = $1", anon_cart_id
        )
        await conn.execute("DELETE FROM Carrito WHERE id = $1", anon_cart_id)
        await conn.execute(
            "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            user_cart_id,
        )

    return await get_cart_summary(conn, user_cart_id)


# ENDPOINTS AUTH
@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, conn=Depends(get_db)):
    try:
        user = await authenticate_user(login_data.username, login_data.password, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"], "role": user["role"]},
            expires_delta=access_token_expires,
        )
        refresh_token = create_refresh_token(
            data={"sub": user["email"], "role": user["role"]}
        )

        user_payload = {
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "phone": user["phone"],
            "role": user["role"],
            "verification_status": user.get("verification_status"),
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_payload,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register_user(register_data: RegisterRequest, conn=Depends(get_db)):
    try:
        existing_user = await get_user_by_email(register_data.email, conn)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado",
            )

        hashed_password = get_password_hash(register_data.password)
        verification_token = create_access_token(
            data={
                "sub": register_data.email,
                "purpose": "email_verification",
                "role": ROLE_CLIENTE,
            },
            expires_delta=timedelta(hours=24),
        )

        query = """
            INSERT INTO Cliente (email, hash_pwd, first_name, last_name, phone, social_login_id,
                                 verification_status, password_reset_token)
            VALUES ($1, $2, $3, $4, $5, NULL, 'pendiente', $6)
            RETURNING id, email, first_name, last_name, phone, verification_status
        """
        result = await conn.fetchrow(
            query,
            register_data.email,
            hashed_password,
            register_data.first_name,
            register_data.last_name,
            register_data.phone,
            verification_token,
        )

        email_sent = await email_service.send_verification_email(
            register_data.email, verification_token
        )
        msg = (
            "Usuario registrado. Email de verificación enviado."
            if email_sent
            else "Usuario registrado. Error enviando email, contacta soporte."
        )

        return {
            "message": msg,
            "user": {**dict(result), "role": ROLE_CLIENTE},
            "verification_token": None if email_sent else verification_token,
        }
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )
    except Exception as e:
        logger.error(f"Error registrando usuario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar usuario",
        )


@app.get("/api/auth/verify-email")
async def verify_email(token: str, conn=Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")
        if not email or purpose != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido"
            )

        user_q = """
            SELECT id, verification_status, password_reset_token, first_name
            FROM Cliente
            WHERE email = $1
        """
        user = await conn.fetchrow(user_q, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario no encontrado"
            )

        if user["verification_status"] == "verificado":
            return {"message": "El email ya está verificado"}

        if user["password_reset_token"] != token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificación inválido",
            )

        update_q = """
            UPDATE Cliente
            SET verification_status = 'verificado', password_reset_token = NULL
            WHERE email = $1
            RETURNING id, email, first_name, last_name, phone, verification_status
        """
        result = await conn.fetchrow(update_q, email)
        await email_service.send_welcome_email(email, user["first_name"])

        return {
            "message": "Email verificado exitosamente",
            "user": {**dict(result), "role": ROLE_CLIENTE},
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación expirado",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación inválido",
        )
    except Exception as e:
        logger.error(f"Error verificando email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al verificar email",
        )


@app.post("/api/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        user = await authenticate_user(
            current_user["email"], password_data.current_password, conn
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual incorrecta",
            )

        new_hash = get_password_hash(password_data.new_password)
        if current_user["role"] == ROLE_ADMIN:
            q = "UPDATE Administrador SET hash_pwd = $1 WHERE id = $2"
        else:
            q = "UPDATE Cliente SET hash_pwd = $1 WHERE id = $2"

        await conn.execute(q, new_hash, current_user["id"])
        return {"message": "Contraseña cambiada exitosamente"}
    except Exception as e:
        logger.error(f"Error cambiando contraseña: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar contraseña",
        )


@app.get("/api/auth/profile", response_model=UserInfo)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "first_name": current_user["first_name"],
        "last_name": current_user["last_name"],
        "phone": current_user["phone"],
        "role": current_user["role"],
        "verification_status": current_user.get("verification_status"),
    }


@app.post("/api/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str, conn=Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role")  # noqa: F841
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de refresh inválido",
            )

        user = await get_user_by_email(email, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
            )

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"], "role": user["role"]},
            expires_delta=access_token_expires,
        )
        new_refresh_token = create_refresh_token(
            data={"sub": user["email"], "role": user["role"]}
        )

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "phone": user["phone"],
                "role": user["role"],
                "verification_status": user.get("verification_status"),
            },
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresh expirado"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresh inválido"
        )
    except Exception as e:
        logger.error(f"Error refrescando token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al refrescar token",
        )


@app.post("/api/auth/resend-verification")
async def resend_verification_email(email: str, conn=Depends(get_db)):
    try:
        # Solo clientes requieren/verifican email
        q = "SELECT id, verification_status FROM Cliente WHERE email = $1"
        user = await conn.fetchrow(q, email)
        if not user:
            # No revelar existencia
            return {
                "message": "Si el email existe, se ha reenviado el correo de verificación"
            }

        if user["verification_status"] == "verificado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está verificado",
            )

        new_token = create_access_token(
            data={"sub": email, "purpose": "email_verification", "role": ROLE_CLIENTE},
            expires_delta=timedelta(hours=24),
        )
        await conn.execute(
            "UPDATE Cliente SET password_reset_token = $1 WHERE email = $2",
            new_token,
            email,
        )

        email_sent = await email_service.send_verification_email(email, new_token)
        resp = {
            "message": "Email de verificación reenviado"
            if email_sent
            else "Error al enviar email"
        }
        if not email_sent:
            resp["verification_token"] = new_token
        return resp
    except Exception as e:
        logger.error(f"Error reenviando email de verificación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al reenviar email",
        )


@app.post("/api/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest, conn=Depends(get_db)):
    try:
        # Solo clientes en este flujo
        user = await conn.fetchrow(
            "SELECT id FROM Cliente WHERE email = $1", request.email
        )
        if not user:
            return {
                "message": "Si el email existe, se ha enviado un enlace de restablecimiento"
            }

        reset_token = create_access_token(
            data={
                "sub": request.email,
                "purpose": "password_reset",
                "role": ROLE_CLIENTE,
            },
            expires_delta=timedelta(hours=1),
        )
        await conn.execute(
            "UPDATE Cliente SET password_reset_token = $1 WHERE email = $2",
            reset_token,
            request.email,
        )
        await email_service.send_password_reset_email(request.email, reset_token)
        return {"message": "Se ha enviado un enlace de restablecimiento a tu email"}
    except Exception as e:
        logger.error(f"Error solicitando restablecimiento: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la solicitud",
        )


@app.post("/api/auth/reset-password")
async def reset_password(confirm: PasswordResetConfirm, conn=Depends(get_db)):
    try:
        payload = jwt.decode(confirm.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")
        if not email or purpose != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido"
            )

        user = await conn.fetchrow(
            "SELECT id, password_reset_token FROM Cliente WHERE email = $1", email
        )
        if not user or user["password_reset_token"] != confirm.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado",
            )

        new_hash = get_password_hash(confirm.new_password)
        await conn.execute(
            "UPDATE Cliente SET hash_pwd = $1, password_reset_token = NULL WHERE email = $2",
            new_hash,
            email,
        )
        return {"message": "Contraseña restablecida exitosamente"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token expirado"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido"
        )
    except Exception as e:
        logger.error(f"Error restableciendo contraseña: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer contraseña",
        )


# ==================== ENDPOINTS PEDIDOS ====================
@app.get("/api/admin/pedidos")
async def admin_list_pedidos(
    conn=Depends(get_db), current_admin: dict = Depends(get_current_admin)
):
    """Listar todos los pedidos con información del cliente (solo admin)."""
    try:
        rows = await conn.fetch(
            """
            SELECT p.id, p.cliente_id, p.order_status, p.shipping_address, p.total_price,
                   p.created_at, p.updated_at,
                   c.email as cliente_email, c.first_name as cliente_first_name, c.last_name as cliente_last_name
            FROM pedido p
            JOIN Cliente c ON c.id = p.cliente_id
            ORDER BY p.created_at DESC
            """
        )
        results = []
        for r in rows:
            pedido = dict(r)
            # Obtener items del pedido
            items = await conn.fetch(
                """
                SELECT dp.producto_id, dp.cantidad, dp.precio_unitario,
                       p.title as product_name
                FROM detalle_pedido dp
                LEFT JOIN producto p ON p.id = dp.producto_id
                WHERE dp.pedido_id = $1
                ORDER BY dp.producto_id
                """,
                pedido["id"],
            )
            pedido["items"] = [dict(i) for i in items]
            results.append(pedido)
        return results
    except Exception as e:
        logger.error(f"Error listando pedidos (admin): {e}")
        raise HTTPException(status_code=500, detail="Error al obtener pedidos")


@app.get("/api/client/pedidos")
async def client_list_pedidos(
    conn=Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Listar pedidos del cliente autenticado."""
    try:
        if current_user.get("role") != ROLE_CLIENTE:
            raise HTTPException(status_code=403, detail="Requiere rol cliente")

        rows = await conn.fetch(
            """
            SELECT id, cliente_id, order_status, shipping_address, total_price, created_at, updated_at
            FROM pedido
            WHERE cliente_id = $1
            ORDER BY created_at DESC
            """,
            current_user["id"],
        )
        results = []
        for r in rows:
            pedido = dict(r)
            items = await conn.fetch(
                """
                  SELECT dp.producto_id, dp.cantidad, dp.precio_unitario,
                      p.title as product_name
                  FROM detalle_pedido dp
                  LEFT JOIN producto p ON p.id = dp.producto_id
                  WHERE dp.pedido_id = $1
                  ORDER BY dp.producto_id
                """,
                pedido["id"],
            )
            pedido["items"] = [dict(i) for i in items]
            results.append(pedido)
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando pedidos (cliente): {e}")
        raise HTTPException(
            status_code=500, detail="Error al obtener pedidos del cliente"
        )


@app.get("/api/pedidos/{pedido_id}")
async def get_pedido_for_boleta(
    pedido_id: int,
    conn=Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Obtener un pedido con sus detalles (items) para la boleta.
    Accesible por el administrador o por el cliente propietario del pedido.
    """
    try:
        pedido = await conn.fetchrow(
            """
            SELECT p.id, p.cliente_id, p.order_status, p.shipping_address, p.total_price,
                   p.created_at, p.updated_at,
                   c.email as cliente_email, c.first_name as cliente_first_name, c.last_name as cliente_last_name
            FROM pedido p
            JOIN Cliente c ON c.id = p.cliente_id
            WHERE p.id = $1
            """,
            pedido_id,
        )
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")

        pedido = dict(pedido)

        # Verificar permisos: admin o propietario
        if not current_user:
            raise HTTPException(status_code=401, detail="Autenticación requerida")
        if (
            current_user.get("role") != ROLE_ADMIN
            and current_user.get("id") != pedido["cliente_id"]
        ):
            raise HTTPException(
                status_code=403, detail="No tienes permiso para ver este pedido"
            )

        items = await conn.fetch(
            """
                 SELECT dp.producto_id, dp.cantidad, dp.precio_unitario,
                     p.title as product_name, p.sku
                 FROM detalle_pedido dp
                 LEFT JOIN producto p ON p.id = dp.producto_id
                 WHERE dp.pedido_id = $1
                 ORDER BY dp.producto_id
            """,
            pedido_id,
        )
        pedido["items"] = [dict(i) for i in items]
        return pedido
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo pedido {pedido_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener el pedido")


@app.post("/api/pedidos/{pedido_id}/send-receipt")
async def send_boleta_email(
    pedido_id: int,
    payload: SendReceiptRequest = Body(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """
    Enviar boleta del pedido por correo (formato alineado con OrderManager / PaymentReturn).
    """
    try:
        pedido_row = await conn.fetchrow(
            """
            SELECT p.id, p.cliente_id, p.order_status, p.shipping_address, p.total_price,
                   p.created_at, p.updated_at,
                   c.email as cliente_email, c.first_name as cliente_first_name, c.last_name as cliente_last_name
            FROM pedido p
            JOIN Cliente c ON c.id = p.cliente_id
            WHERE p.id = $1
            """,
            pedido_id,
        )
        if not pedido_row:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        pedido = dict(pedido_row)

        # Permisos
        if (
            current_user.get("role") != ROLE_ADMIN
            and current_user.get("id") != pedido["cliente_id"]
        ):
            raise HTTPException(
                status_code=403, detail="No tienes permiso para enviar esta boleta"
            )

        to_email = (
            (payload.to_email or pedido.get("cliente_email"))
            if payload
            else pedido.get("cliente_email")
        )
        if not to_email:
            raise HTTPException(
                status_code=400, detail="No hay email disponible para enviar la boleta"
            )

        # Items (detalles)
        items = []
        if not payload or payload.include_items:
            rows = await conn.fetch(
                """
                SELECT dp.producto_id, dp.cantidad, dp.precio_unitario,
                       p.title as product_name, p.sku
                FROM detalle_pedido dp
                LEFT JOIN producto p ON p.id = dp.producto_id
                WHERE dp.pedido_id = $1
                ORDER BY dp.producto_id
                """,
                pedido_id,
            )
            items = [dict(r) for r in rows]

        # Helpers
        def fmt_dt(d):
            if isinstance(d, datetime):
                return d.strftime("%Y-%m-%d %H:%M:%S")
            return str(d) if d else "—"

        def get_nombre_item(it, idx):
            candidatos = [
                it.get("product_name"),
                it.get("title"),
            ]
            for c in candidatos:
                if isinstance(c, str) and c.strip():
                    return c.strip()
            if it.get("producto_id"):
                return f"Producto #{it['producto_id']}"
            return f"Item {idx + 1}"

        def badge_color(estado):
            if not estado:
                return "#6b7280"
            e = estado.lower()
            if "crea" in e:
                return "#1d4ed8"
            if "pend" in e:
                return "#b45309"
            if "prep" in e:
                return "#4338ca"
            if "env" in e or "ship" in e:
                return "#6d28d9"
            if "entreg" in e or "comp" in e or "pag" in e:
                return "#047857"
            if "canc" in e or "rech" in e:
                return "#b91c1c"
            return "#374151"

        created_str = fmt_dt(pedido.get("created_at"))
        estado = pedido.get("order_status", "—")
        estado_color = badge_color(estado)
        total_pedido = int(pedido.get("total_price") or 0)

        # Calcular total items (desde detalles, más preciso si existen)
        total_items_calc = int(
            sum(
                (
                    float(it.get("precio_unitario") or it.get("unit_price") or 0.0)
                    * int(it.get("cantidad") or it.get("quantity") or 0)
                )
                for it in items
            )
            if items
            else total_pedido
        )

        # HTML
        html_lines = []
        html_lines.append(
            f"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <div style="padding:20px;background:#f9fafb">
                <h2 style="margin:0 0 4px;font-size:20px;color:#111827">Boleta / Pedido #{pedido["id"]}</h2>
                <span style="display:inline-block;padding:4px 10px;font-size:12px;border-radius:16px;background:{estado_color}20;color:{estado_color};font-weight:600;margin-bottom:10px">
                  {estado}
                </span>
                <p style="margin:4px 0;font-size:14px;color:#374151"><strong>Fecha:</strong> {created_str}</p>
                <p style="margin:4px 0;font-size:14px;color:#374151"><strong>Cliente:</strong> {pedido.get("cliente_first_name", "")} {pedido.get("cliente_last_name", "")} ({to_email})</p>
                <p style="margin:4px 0;font-size:14px;color:#374151"><strong>Dirección envío:</strong> {pedido.get("shipping_address", "—")}</p>
                <p style="margin:4px 0;font-size:14px;color:#374151"><strong>Total pedido:</strong> ${total_pedido:,}</p>
                <p style="margin:4px 0;font-size:14px;color:#374151"><strong>Items:</strong> {len(items)}</p>
              </div>
            """
        )

        if items:
            html_lines.append(
                """
                <div style="padding:4px 20px 16px;background:#ffffff">
                  <h3 style="font-size:16px;margin:16px 0 8px;color:#111827">Productos</h3>
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                      <tr style="background:#f3f4f6">
                        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Producto</th>
                        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Cantidad</th>
                        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Unit.</th>
                        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                """
            )
            for idx, it in enumerate(items):
                nombre = get_nombre_item(it, idx)
                qty = int(it.get("cantidad") or it.get("quantity") or 0)
                unit = int(it.get("precio_unitario") or it.get("unit_price") or 0)
                sub = unit * qty
                html_lines.append(
                    f"""
                      <tr>
                        <td style="padding:8px;border:1px solid #e5e7eb">{nombre}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb">{qty}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb">${unit:,}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${sub:,}</td>
                      </tr>
                    """
                )
            html_lines.append(
                f"""
                    </tbody>
                  </table>
                  <p style="margin:12px 0 0;font-size:13px;color:#374151">
                    <strong>Total (items calculado):</strong> ${total_items_calc:,}
                  </p>
                  <p style="margin:4px 0 0;font-size:13px;color:#374151">
                    <strong>Total pedido registrado:</strong> ${total_pedido:,}
                  </p>
                </div>
                """
            )

        html_lines.append(
            """
              <div style="padding:16px 20px;background:#f9fafb">
                <p style="margin:0;font-size:12px;color:#6b7280">Gracias por su compra.</p>
              </div>
            </div>
            """
        )

        html_body = "<html><body>" + "".join(html_lines) + "</body></html>"
        subject = f"Boleta Pedido #{pedido['id']}"

        sent = await email_service.send_email(
            to_email, subject, html_body, is_html=True
        )
        if not sent:
            raise HTTPException(
                status_code=500, detail="Error enviando boleta por correo"
            )

        return {"message": "Boleta enviada", "to": to_email, "pedido_id": pedido_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando boleta pedido {pedido_id}: {e}")
        raise HTTPException(status_code=500, detail="Error enviando boleta por correo")


# ==================== ENDPOINTS DE PRODUCTOS ====================


# CRUD PRODUCTOS (solo admin)
@app.post(
    "/api/productos/",
    response_model=ProductoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_producto(
    producto: ProductoCreate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        query = """
            INSERT INTO producto (sku, title, description, price, stock_quantity, category_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, sku, title, description, price, stock_quantity, category_id, status
        """
        result = await conn.fetchrow(
            query,
            producto.sku,
            producto.title,
            producto.description,
            producto.price,
            producto.stock_quantity,
            producto.category_id,
            current_admin["id"],
        )
        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El SKU ya existe")
    except Exception as e:
        logger.error(f"Error creando producto: {e}")
        raise HTTPException(status_code=500, detail="Error al crear producto")


@app.get("/api/productos/", response_model=List[ProductoResponse])
async def obtener_productos(
    skip: int = 0,
    limit: Optional[int] = None,  # Cambiado: sin límite por defecto
    categoria_id: Optional[int] = None,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        if categoria_id:
            if limit is not None:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE category_id = $3
                    ORDER BY id
                    LIMIT $1 OFFSET $2
                """
                results = await conn.fetch(query, limit, skip, categoria_id)
            else:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE category_id = $1
                    ORDER BY id
                    OFFSET $2
                """
                results = await conn.fetch(query, categoria_id, skip)
        else:
            if limit is not None:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    ORDER BY id
                    LIMIT $1 OFFSET $2
                """
                results = await conn.fetch(query, limit, skip)
            else:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    ORDER BY id
                    OFFSET $1
                """
                results = await conn.fetch(query, skip)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo productos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener productos")


@app.get("/api/productos/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        query = """
            SELECT id, sku, title, description, price, stock_quantity, category_id, status
            FROM producto WHERE id = $1
        """
        result = await conn.fetchrow(query, producto_id)
        if not result:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener producto")


@app.put("/api/productos/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: int,
    producto: ProductoUpdate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        exists = await conn.fetchrow(
            "SELECT id FROM producto WHERE id = $1", producto_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        fields = []
        values = []
        idx = 1
        if producto.sku is not None:
            fields.append(f"sku = ${idx}")
            values.append(producto.sku)
            idx += 1
        if producto.title is not None:
            fields.append(f"title = ${idx}")
            values.append(producto.title)
            idx += 1
        if producto.description is not None:
            fields.append(f"description = ${idx}")
            values.append(producto.description)
            idx += 1
        if producto.price is not None:
            fields.append(f"price = ${idx}")
            values.append(producto.price)
            idx += 1
        if producto.stock_quantity is not None:
            fields.append(f"stock_quantity = ${idx}")
            values.append(producto.stock_quantity)
            idx += 1
        if producto.category_id is not None:
            fields.append(f"category_id = ${idx}")
            values.append(producto.category_id)
            idx += 1

        if not fields:
            raise HTTPException(
                status_code=400, detail="No se proporcionaron campos para actualizar"
            )

        values.append(producto_id)
        update_query = f"""
            UPDATE producto
            SET {", ".join(fields)}
            WHERE id = ${idx}
            RETURNING id, sku, title, description, price, stock_quantity, category_id, status
        """
        result = await conn.fetchrow(update_query, *values)
        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El SKU ya existe")
    except Exception as e:
        logger.error(f"Error actualizando producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar producto")


@app.delete("/api/productos/{producto_id}", response_model=MensajeResponse)
async def eliminar_producto(
    producto_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        exists = await conn.fetchrow(
            "SELECT id FROM producto WHERE id = $1", producto_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        await conn.execute("DELETE FROM producto WHERE id = $1", producto_id)
        return MensajeResponse(
            mensaje=f"Producto {producto_id} eliminado correctamente", exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar producto")


@app.post(
    "/api/productos/{producto_id}/imagenes", response_model=List[ProductoImagenResponse]
)
async def agregar_imagenes_producto(
    producto_id: int,
    imagenes: List[ProductoImagenCreate],
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    exists = await conn.fetchrow("SELECT id FROM producto WHERE id = $1", producto_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    results = []
    for imagen in imagenes:
        insert_query = """
            INSERT INTO ProductoImagen (producto_id, url_imagen)
            VALUES ($1, $2)
            RETURNING id, producto_id, url_imagen
        """
        result = await conn.fetchrow(insert_query, producto_id, imagen.url_imagen)
        results.append(dict(result))
    return results


@app.get(
    "/api/productos/{producto_id}/imagenes", response_model=List[ProductoImagenResponse]
)
async def obtener_imagenes_producto(
    producto_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    exists = await conn.fetchrow("SELECT id FROM producto WHERE id = $1", producto_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    query = """
        SELECT id, producto_id, url_imagen
        FROM ProductoImagen
        WHERE producto_id = $1
        ORDER BY id
    """
    results = await conn.fetch(query, producto_id)
    return [dict(row) for row in results]


@app.delete("/api/productos/imagenes/{imagen_id}", response_model=MensajeResponse)
async def eliminar_imagen_producto(
    imagen_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    try:
        exists = await conn.fetchrow(
            "SELECT id FROM ProductoImagen WHERE id = $1", imagen_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Imagen no encontrada")

        await conn.execute("DELETE FROM ProductoImagen WHERE id = $1", imagen_id)
        return MensajeResponse(
            mensaje=f"Imagen {imagen_id} eliminada correctamente", exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando imagen {imagen_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar imagen")


# Públicos
@app.get("/api/public/productos", response_model=List[ProductoResponse])
async def obtener_productos_publicos(
    skip: int = 0,
    limit: Optional[int] = None,  # Cambiado: sin límite por defecto
    categoria_id: Optional[int] = None,
    conn=Depends(get_db),
):
    try:
        if categoria_id:
            if limit is not None:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE status = 'activo' AND category_id = $3
                    ORDER BY id
                    LIMIT $1 OFFSET $2
                """
                results = await conn.fetch(query, limit, skip, categoria_id)
            else:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE status = 'activo' AND category_id = $1
                    ORDER BY id
                    OFFSET $2
                """
                results = await conn.fetch(query, categoria_id, skip)
        else:
            if limit is not None:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE status = 'activo'
                    ORDER BY id
                    LIMIT $1 OFFSET $2
                """
                results = await conn.fetch(query, limit, skip)
            else:
                query = """
                    SELECT id, sku, title, description, price, stock_quantity, category_id, status
                    FROM producto
                    WHERE status = 'activo'
                    ORDER BY id
                    OFFSET $1
                """
                results = await conn.fetch(query, skip)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo productos públicos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener productos")


@app.get(
    "/api/public/productos/{producto_id}/imagenes",
    response_model=List[ProductoImagenResponse],
)
async def obtener_imagenes_producto_publicas(
    producto_id: int,
    conn=Depends(get_db),
):
    """Obtener imágenes de un producto (público - sin autenticación)."""
    try:
        # Verificar que el producto existe y está activo
        producto = await conn.fetchrow(
            "SELECT id FROM producto WHERE id = $1 AND status = 'activo'", producto_id
        )
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        query = """
            SELECT id, producto_id, url_imagen
            FROM ProductoImagen
            WHERE producto_id = $1
            ORDER BY is_primary DESC, orden ASC, id ASC
        """
        results = await conn.fetch(query, producto_id)
        return [dict(row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error obteniendo imágenes públicas del producto {producto_id}: {e}"
        )
        raise HTTPException(
            status_code=500, detail="Error al obtener imágenes del producto"
        )


@app.get("/api/categorias/", response_model=List[str])
async def obtener_categorias(conn=Depends(get_db)):
    try:
        results = await conn.fetch("SELECT name FROM categoria ORDER BY id")
        return [row["name"] for row in results if row["name"]]
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener categorías")


@app.get("/api/categorias-con-id/", response_model=List[dict])
async def obtener_categorias_con_id(conn=Depends(get_db)):
    try:
        results = await conn.fetch("SELECT id, name FROM categoria ORDER BY id")
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener categorías")


@app.post("/api/test-email")
async def test_email(email: str):
    success = await email_service.send_email(
        email,
        "Prueba de correo desde FastAPI",
        "<h1>OK</h1><p>Sistema de correos operativo.</p>",
    )
    return {
        "success": success,
        "message": "Correo de prueba enviado" if success else "Error al enviar correo",
    }


# Health
@app.get("/health")
async def health_check(conn=Depends(get_db)):
    try:
        await conn.fetchval("SELECT 1")
        count = await conn.fetchval("SELECT COUNT(*) FROM producto")
        return {"status": "healthy", "database": "connected", "total_productos": count}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")


# ==================== CRUD CLIENTES ====================


@app.post(
    "/api/clientes/",
    response_model=ClienteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_cliente_admin(
    cliente: ClienteCreate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Crear cliente (solo admin). El cliente se crea verificado automáticamente."""
    try:
        existing = await conn.fetchrow(
            "SELECT id FROM Cliente WHERE email = $1", cliente.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        hashed_password = get_password_hash(cliente.password)
        query = """
            INSERT INTO Cliente (email, hash_pwd, first_name, last_name, phone, verification_status)
            VALUES ($1, $2, $3, $4, $5, 'verificado')
            RETURNING id, email, first_name, last_name, phone, social_login_id, 
                      verification_status, created_at, updated_at
        """
        result = await conn.fetchrow(
            query,
            cliente.email,
            hashed_password,
            cliente.first_name,
            cliente.last_name,
            cliente.phone,
        )

        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    except Exception as e:
        logger.error(f"Error creando cliente: {e}")
        raise HTTPException(status_code=500, detail="Error al crear cliente")


@app.get("/api/clientes/", response_model=List[ClienteResponse])
async def obtener_clientes(
    skip: int = 0,
    limit: Optional[int] = None,  # Cambiado: sin límite por defecto
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Listar todos los clientes (solo admin)."""
    try:
        if limit is not None:
            query = """
                SELECT id, email, first_name, last_name, phone, social_login_id, 
                       verification_status, created_at, updated_at
                FROM Cliente
                ORDER BY id
                LIMIT $1 OFFSET $2
            """
            results = await conn.fetch(query, limit, skip)
        else:
            query = """
                SELECT id, email, first_name, last_name, phone, social_login_id, 
                       verification_status, created_at, updated_at
                FROM Cliente
                ORDER BY id
                OFFSET $1
            """
            results = await conn.fetch(query, skip)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo clientes: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener clientes")


@app.get("/api/clientes/{cliente_id}", response_model=ClienteResponse)
async def obtener_cliente(
    cliente_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Obtener un cliente por ID (solo admin)."""
    try:
        query = """
            SELECT id, email, first_name, last_name, phone, social_login_id, 
                   verification_status, created_at, updated_at
            FROM Cliente
            WHERE id = $1
        """
        result = await conn.fetchrow(query, cliente_id)
        if not result:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo cliente {cliente_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cliente")


@app.put("/api/clientes/{cliente_id}", response_model=ClienteResponse)
async def actualizar_cliente(
    cliente_id: int,
    cliente: ClienteUpdate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Actualizar datos de un cliente (solo admin)."""
    try:
        exists = await conn.fetchrow("SELECT id FROM Cliente WHERE id = $1", cliente_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        fields = []
        values = []
        idx = 1
        if cliente.email is not None:
            fields.append(f"email = ${idx}")
            values.append(cliente.email)
            idx += 1
        if cliente.first_name is not None:
            fields.append(f"first_name = ${idx}")
            values.append(cliente.first_name)
            idx += 1
        if cliente.last_name is not None:
            fields.append(f"last_name = ${idx}")
            values.append(cliente.last_name)
            idx += 1
        if cliente.phone is not None:
            fields.append(f"phone = ${idx}")
            values.append(cliente.phone)
            idx += 1
        if cliente.verification_status is not None:
            fields.append(f"verification_status = ${idx}")
            values.append(cliente.verification_status)
            idx += 1

        if not fields:
            raise HTTPException(
                status_code=400, detail="No se proporcionaron campos para actualizar"
            )

        fields.append(f"updated_at = ${idx}")
        values.append(datetime.utcnow())
        idx += 1
        values.append(cliente_id)

        update_query = f"""
            UPDATE Cliente
            SET {", ".join(fields)}
            WHERE id = ${idx}
            RETURNING id, email, first_name, last_name, phone, social_login_id, 
                      verification_status, created_at, updated_at
        """
        result = await conn.fetchrow(update_query, *values)
        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    except Exception as e:
        logger.error(f"Error actualizando cliente {cliente_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar cliente")


@app.delete("/api/clientes/{cliente_id}", response_model=MensajeResponse)
async def eliminar_cliente(
    cliente_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Eliminar un cliente (solo admin). CASCADE eliminará direcciones, carritos, etc."""
    try:
        exists = await conn.fetchrow("SELECT id FROM Cliente WHERE id = $1", cliente_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        await conn.execute("DELETE FROM Cliente WHERE id = $1", cliente_id)
        return MensajeResponse(
            mensaje=f"Cliente {cliente_id} eliminado correctamente", exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando cliente {cliente_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar cliente")


# ==================== DIRECCIONES DEL CLIENTE ====================


@app.post(
    "/api/clientes/{cliente_id}/direcciones",
    response_model=DireccionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_direccion(
    cliente_id: int,
    direccion: DireccionCreate,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crear dirección para un cliente. Admin puede crear para cualquiera, cliente solo para sí mismo."""
    try:
        # Verificar que el cliente existe
        cliente = await conn.fetchrow(
            "SELECT id FROM Cliente WHERE id = $1", cliente_id
        )
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        # Control de permisos
        if current_user["role"] != ROLE_ADMIN and current_user["id"] != cliente_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para crear direcciones para este cliente",
            )

        # Si es dirección por defecto, desactivar otras
        if direccion.is_default:
            await conn.execute(
                "UPDATE Direccion SET is_default = FALSE WHERE cliente_id = $1",
                cliente_id,
            )

        query = """
            INSERT INTO Direccion (cliente_id, comuna, region, calle, nro, lat, lon, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, cliente_id, comuna, region, calle, nro, lat, lon, is_default
        """
        result = await conn.fetchrow(
            query,
            cliente_id,
            direccion.comuna,
            direccion.region,
            direccion.calle,
            direccion.nro,
            direccion.lat,
            direccion.lon,
            direccion.is_default,
        )
        return dict(result)
    except Exception as e:
        logger.error(f"Error creando dirección: {e}")
        raise HTTPException(status_code=500, detail="Error al crear dirección")


@app.get(
    "/api/clientes/{cliente_id}/direcciones", response_model=List[DireccionResponse]
)
async def obtener_direcciones_cliente(
    cliente_id: int,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener direcciones de un cliente. Admin puede ver cualquiera, cliente solo las suyas."""
    try:
        # Control de permisos
        if current_user["role"] != ROLE_ADMIN and current_user["id"] != cliente_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para ver direcciones de este cliente",
            )

        query = """
            SELECT id, cliente_id, comuna, region, calle, nro, lat, lon, is_default
            FROM Direccion
            WHERE cliente_id = $1
            ORDER BY is_default DESC, id
        """
        results = await conn.fetch(query, cliente_id)
        return [dict(row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo direcciones del cliente {cliente_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener direcciones")


@app.put("/api/direcciones/{direccion_id}", response_model=DireccionResponse)
async def actualizar_direccion(
    direccion_id: int,
    direccion: DireccionUpdate,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualizar una dirección. Admin puede actualizar cualquiera, cliente solo las suyas."""
    try:
        existing = await conn.fetchrow(
            "SELECT id, cliente_id FROM Direccion WHERE id = $1", direccion_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Dirección no encontrada")

        # Control de permisos
        if (
            current_user["role"] != ROLE_ADMIN
            and current_user["id"] != existing["cliente_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para actualizar esta dirección",
            )

        fields = []
        values = []
        idx = 1
        if direccion.comuna is not None:
            fields.append(f"comuna = ${idx}")
            values.append(direccion.comuna)
            idx += 1
        if direccion.region is not None:
            fields.append(f"region = ${idx}")
            values.append(direccion.region)
            idx += 1
        if direccion.calle is not None:
            fields.append(f"calle = ${idx}")
            values.append(direccion.calle)
            idx += 1
        if direccion.nro is not None:
            fields.append(f"nro = ${idx}")
            values.append(direccion.nro)
            idx += 1
        if direccion.lat is not None:
            fields.append(f"lat = ${idx}")
            values.append(direccion.lat)
            idx += 1
        if direccion.lon is not None:
            fields.append(f"lon = ${idx}")
            values.append(direccion.lon)
            idx += 1
        if direccion.is_default is not None:
            # Si se marca como default, desactivar otras del mismo cliente
            if direccion.is_default:
                await conn.execute(
                    "UPDATE Direccion SET is_default = FALSE WHERE cliente_id = $1",
                    existing["cliente_id"],
                )
            fields.append(f"is_default = ${idx}")
            values.append(direccion.is_default)
            idx += 1

        if not fields:
            raise HTTPException(
                status_code=400, detail="No se proporcionaron campos para actualizar"
            )

        values.append(direccion_id)
        update_query = f"""
            UPDATE Direccion
            SET {", ".join(fields)}
            WHERE id = ${idx}
            RETURNING id, cliente_id, comuna, region, calle, nro, lat, lon, is_default
        """
        result = await conn.fetchrow(update_query, *values)
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando dirección {direccion_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar dirección")


@app.delete("/api/direcciones/{direccion_id}", response_model=MensajeResponse)
async def eliminar_direccion(
    direccion_id: int,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Eliminar una dirección. Admin puede eliminar cualquiera, cliente solo las suyas."""
    try:
        existing = await conn.fetchrow(
            "SELECT id, cliente_id FROM Direccion WHERE id = $1", direccion_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Dirección no encontrada")

        # Control de permisos
        if (
            current_user["role"] != ROLE_ADMIN
            and current_user["id"] != existing["cliente_id"]
        ):
            raise HTTPException(
                status_code=403, detail="No tienes permiso para eliminar esta dirección"
            )

        await conn.execute("DELETE FROM Direccion WHERE id = $1", direccion_id)
        return MensajeResponse(
            mensaje=f"Dirección {direccion_id} eliminada correctamente", exito=True
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando dirección {direccion_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar dirección")


# ==================== CRUD ADMINISTRADORES ====================


@app.post(
    "/api/administradores/",
    response_model=AdministradorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_administrador(
    admin: AdministradorCreate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Crear un nuevo administrador (solo admin)."""
    try:
        existing = await conn.fetchrow(
            "SELECT id FROM Administrador WHERE email = $1", admin.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        hashed_password = get_password_hash(admin.password)
        query = """
            INSERT INTO Administrador (email, hash_pwd, first_name, last_name, phone, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            RETURNING id, email, first_name, last_name, phone, role, is_active, created_at, last_login
        """
        result = await conn.fetchrow(
            query,
            admin.email,
            hashed_password,
            admin.first_name,
            admin.last_name,
            admin.phone,
            admin.role or "admin",
        )
        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    except Exception as e:
        logger.error(f"Error creando administrador: {e}")
        raise HTTPException(status_code=500, detail="Error al crear administrador")


@app.get("/api/administradores/", response_model=List[AdministradorResponse])
async def obtener_administradores(
    skip: int = 0,
    limit: Optional[int] = None,  # Cambiado: sin límite por defecto
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Listar todos los administradores (solo admin)."""
    try:
        if limit is not None:
            query = """
                SELECT id, email, first_name, last_name, phone, role, is_active, created_at, last_login
                FROM Administrador
                ORDER BY id
                LIMIT $1 OFFSET $2
            """
            results = await conn.fetch(query, limit, skip)
        else:
            query = """
                SELECT id, email, first_name, last_name, phone, role, is_active, created_at, last_login
                FROM Administrador
                ORDER BY id
                OFFSET $1
            """
            results = await conn.fetch(query, skip)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo administradores: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener administradores")


@app.get("/api/administradores/{admin_id}", response_model=AdministradorResponse)
async def obtener_administrador(
    admin_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Obtener un administrador por ID (solo admin)."""
    try:
        query = """
            SELECT id, email, first_name, last_name, phone, role, is_active, created_at, last_login
            FROM Administrador
            WHERE id = $1
        """
        result = await conn.fetchrow(query, admin_id)
        if not result:
            raise HTTPException(status_code=404, detail="Administrador no encontrado")
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo administrador {admin_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener administrador")


@app.put("/api/administradores/{admin_id}", response_model=AdministradorResponse)
async def actualizar_administrador(
    admin_id: int,
    admin: AdministradorUpdate,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Actualizar datos de un administrador (solo admin)."""
    try:
        exists = await conn.fetchrow(
            "SELECT id FROM Administrador WHERE id = $1", admin_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Administrador no encontrado")

        fields = []
        values = []
        idx = 1
        if admin.email is not None:
            fields.append(f"email = ${idx}")
            values.append(admin.email)
            idx += 1
        if admin.first_name is not None:
            fields.append(f"first_name = ${idx}")
            values.append(admin.first_name)
            idx += 1
        if admin.last_name is not None:
            fields.append(f"last_name = ${idx}")
            values.append(admin.last_name)
            idx += 1
        if admin.phone is not None:
            fields.append(f"phone = ${idx}")
            values.append(admin.phone)
            idx += 1
        if admin.role is not None:
            fields.append(f"role = ${idx}")
            values.append(admin.role)
            idx += 1
        if admin.is_active is not None:
            fields.append(f"is_active = ${idx}")
            values.append(admin.is_active)
            idx += 1

        if not fields:
            raise HTTPException(
                status_code=400, detail="No se proporcionaron campos para actualizar"
            )

        values.append(admin_id)
        update_query = f"""
            UPDATE Administrador
            SET {", ".join(fields)}
            WHERE id = ${idx}
            RETURNING id, email, first_name, last_name, phone, role, is_active, created_at, last_login
        """
        result = await conn.fetchrow(update_query, *values)
        return dict(result)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    except Exception as e:
        logger.error(f"Error actualizando administrador {admin_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar administrador")


@app.delete("/api/administradores/{admin_id}", response_model=MensajeResponse)
async def eliminar_administrador(
    admin_id: int,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    """Eliminar un administrador (solo admin). No puede eliminarse a sí mismo."""
    try:
        if current_admin["id"] == admin_id:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar tu propio usuario administrador",
            )

        exists = await conn.fetchrow(
            "SELECT id FROM Administrador WHERE id = $1", admin_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Administrador no encontrado")

        await conn.execute("DELETE FROM Administrador WHERE id = $1", admin_id)
        return MensajeResponse(
            mensaje=f"Administrador {admin_id} eliminado correctamente", exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando administrador {admin_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar administrador")


# ==================== TRANSBANK ====================


@app.post("/api/transbank/create", response_model=TBKCreateResponse)
async def tbk_create(
    payload: TBKCreateRequest = Body(...),
    request: Request = None,
    conn=Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    try:
        if not payload.amount or int(payload.amount) <= 0:
            raise HTTPException(status_code=400, detail="Monto inválido")

        if not current_user or current_user.get("role") != ROLE_CLIENTE:
            raise HTTPException(
                status_code=400,
                detail="Cliente autenticado requerido para crear pedido",
            )

        cliente_id = current_user["id"]

        # Buscar si ya existe un pedido pendiente para este cliente
        pedido_row = await conn.fetchrow(
            "SELECT id FROM pedido WHERE cliente_id = $1 AND order_status = 'Pendiente' ORDER BY created_at DESC LIMIT 1",
            cliente_id,
        )
        if pedido_row:
            pedido_id = pedido_row["id"]
        else:
            # Crear nuevo pedido
            insert_q = """
                INSERT INTO pedido (cliente_id, order_status, shipping_address, total_price, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                RETURNING id
            """
            shipping_address = "No especificado"
            row = await conn.fetchrow(
                insert_q,
                cliente_id,
                "Pendiente",
                shipping_address,
                float(payload.amount),
            )
            pedido_id = row["id"] if row else None

        def make_buy_order(pedido_id: Optional[int]) -> str:
            base = (
                f"O{pedido_id}" if pedido_id else f"O{int(datetime.now().timestamp())}"
            )
            rnd = secrets.token_hex(2).upper()
            return f"{base}{rnd}"[:26]

        buy_order = make_buy_order(pedido_id)
        session_id_tbk = (payload.session_id or "anon")[:61]
        return_url = (payload.return_url or f"{FRONTEND_URL}/payment/return").strip()

        # Guardar en memoria temporal para la confirmación
        pending_transactions[buy_order] = {
            "pedido_id": pedido_id,
            "amount": int(payload.amount),
            "cliente_id": cliente_id,
            "session_id": payload.session_id,
        }

        # Insertar detalle_pedido si no existe
        detalles = await conn.fetch(
            "SELECT 1 FROM detalle_pedido WHERE pedido_id = $1 LIMIT 1",
            pedido_id,
        )
        if not detalles:
            # Obtener items del carrito
            cart = await conn.fetchrow(
                "SELECT id FROM Carrito WHERE cliente_id = $1", cliente_id
            )
            cart_items = []
            if cart:
                cart_id = cart["id"]
                cart_items = await conn.fetch(
                    """
                    SELECT producto_id, quantity, total_price
                    FROM ArticuloCarrito
                    WHERE carrito_id = $1
                    """,
                    cart_id,
                )
            total_calc = 0.0
            for it in cart_items:
                pid = it["producto_id"]
                qty = max(int(it["quantity"] or 1), 1)
                total_price_item = (
                    float(it["total_price"]) if it["total_price"] is not None else 0.0
                )
                unit_price = (
                    total_price_item / qty if qty > 0 and total_price_item > 0 else None
                )
                if unit_price is None:
                    prod = await ensure_product_and_price(conn, pid)
                    unit_price = float(prod["price"])
                await conn.execute(
                    """
                    INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (pedido_id, producto_id) DO UPDATE
                    SET cantidad = EXCLUDED.cantidad, precio_unitario = EXCLUDED.precio_unitario
                    """,
                    pedido_id,
                    pid,
                    qty,
                    unit_price,
                )
                total_calc += unit_price * qty
            # Actualizar total_price del pedido
            if total_calc > 0:
                await conn.execute(
                    "UPDATE pedido SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    total_calc,
                    pedido_id,
                )
            # Limpiar carrito
            if cart and cart_items:
                await conn.execute(
                    "DELETE FROM ArticuloCarrito WHERE carrito_id = $1", cart_id
                )
                await conn.execute(
                    "UPDATE Carrito SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    cart_id,
                )

        tx = Transaction(TBK_OPTIONS) if TBK_OPTIONS else Transaction()
        resp = tx.create(buy_order, session_id_tbk, int(payload.amount), return_url)

        logger.info(f"TBK create resp: {resp}")

        token = resp.get("token") or resp.get("token_ws")
        url = (
            resp.get("url")
            or "https://webpay3g.transbank.cl/webpayserver/initTransaction"
        )
        if not token or not url:
            raise HTTPException(
                status_code=500, detail="Transbank no devolvió token o URL"
            )

        # Relacionar el token con el pedido
        pending_transactions[token] = {
            "pedido_id": pedido_id,
            "amount": float(payload.amount),
            "buy_order": buy_order,
        }

        return {"token": token, "url": url, "pedido_id": pedido_id}
    except HTTPException:
        raise
    except RequestValidationError as e:
        logger.error(f"Validación request /api/transbank/create: {e.errors()}")
        raise
    except Exception as e:
        logger.error(f"Error creando transacción: {e}")
        raise HTTPException(status_code=500, detail="Error al crear la transacción")


@app.post("/api/transbank/confirm")
async def tbk_confirm(payload: TBKConfirmRequest = Body(...), conn=Depends(get_db)):
    try:
        if not payload.token_ws:
            raise HTTPException(status_code=400, detail="token_ws requerido")

        tx = Transaction(TBK_OPTIONS) if TBK_OPTIONS else Transaction()
        resp = tx.commit(payload.token_ws)
        status = resp.get("status")
        buy_order = resp.get("buy_order")

        # Buscar metadata temporal por token_ws o buy_order
        meta = pending_transactions.get(payload.token_ws) or pending_transactions.get(
            buy_order
        )
        pedido_id = None
        if meta and meta.get("pedido_id"):
            pedido_id = meta["pedido_id"]
        else:
            # Si no encontramos por meta, intentar extraer id desde buy_order (formato O{pedidoId}...)
            if buy_order and buy_order.startswith("O"):
                try:
                    pedido_id = int("".join(filter(str.isdigit, buy_order[1:])))
                except Exception:
                    pedido_id = None

        if status == "AUTHORIZED":
            # Intentar actualizar Pedido a "Pagado" (si se encontró)
            try:
                if pedido_id:
                    await conn.execute(
                        """
                        UPDATE pedido 
                        SET order_status = 'Pagado',
                            notas = 'Pago autorizado por Transbank',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        pedido_id,
                    )
                    logger.info(
                        f"Pedido {pedido_id} marcado como pagado por pago autorizado"
                    )
            except Exception as e:
                logger.error(f"Error actualizando pedido pagado: {e}")

            # eliminar meta temporal si existe
            pending_transactions.pop(payload.token_ws, None)

            # Descontar stock de producto para todos los productos del pedido
            detalles_pedido = await conn.fetch(
                "SELECT producto_id, cantidad FROM detalle_pedido WHERE pedido_id = $1",
                pedido_id,
            )
            for det in detalles_pedido:
                await conn.execute(
                    """
                    UPDATE producto
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2
                    """,
                    det["cantidad"],
                    det["producto_id"],
                )
            logger.info(
                f"Stock descontado para pedido {pedido_id} tras confirmación de pago."
            )

            return {
                "status": "success",
                "pedido_id": pedido_id,
                "buy_order": buy_order,
                "amount": resp.get("amount"),
                "authorization_code": resp.get("authorization_code"),
                "payment_type_code": resp.get("payment_type_code"),
                "response_code": resp.get("response_code"),
                "installments_number": resp.get("installments_number"),
            }
        else:
            # Si el pago fue rechazado, actualizar pedido a cancelado (si existe)
            if buy_order and buy_order in pending_transactions:
                transaction_data = pending_transactions[buy_order]
                pedido_id = transaction_data.get("pedido_id")
                if pedido_id:
                    await conn.execute(
                        """
                        UPDATE pedido 
                        SET order_status = 'cancelado',
                            notas = 'Pago rechazado por Transbank',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        pedido_id,
                    )
                    logger.info(
                        f"Pedido {pedido_id} marcado como cancelado por pago rechazado"
                    )
                del pending_transactions[buy_order]
            return {"status": "rejected", "detail": resp}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirmando transacción: {e}")
        raise HTTPException(status_code=500, detail="Error al confirmar la transacción")


# Configuración Transbank (FORZAR TEST)
TBK_ENV = (os.getenv("TBK_ENV") or "TEST").upper()
TBK_INTEGRATION_TYPE = IntegrationType.TEST  # forzar test

# Usa constantes oficiales de integración para evitar 401
TBK_COMMERCE_CODE = (
    os.getenv("TBK_COMMERCE_CODE") or IntegrationCommerceCodes.WEBPAY_PLUS
)
TBK_API_KEY = os.getenv("TBK_API_KEY") or IntegrationApiKeys.WEBPAY

if WebpayOptions:
    TBK_OPTIONS = WebpayOptions(
        commerce_code=TBK_COMMERCE_CODE,
        api_key=TBK_API_KEY,
        integration_type=TBK_INTEGRATION_TYPE,
    )
else:
    TBK_OPTIONS = None
    Transaction.commerce_code = TBK_COMMERCE_CODE
    Transaction.api_key = TBK_API_KEY
    Transaction.integration_type = TBK_INTEGRATION_TYPE

logger.info(
    f"Transbank TEST configured. code={TBK_COMMERCE_CODE} type={TBK_INTEGRATION_TYPE}"
)


# Almacenamiento temporal de transacciones
@app.post("/api/transbank/confirm")
async def tbk_confirm(payload: TBKConfirmRequest = Body(...), conn=Depends(get_db)):
    try:
        if not payload.token_ws:
            raise HTTPException(status_code=400, detail="token_ws requerido")

        tx = Transaction(TBK_OPTIONS) if TBK_OPTIONS else Transaction()
        resp = tx.commit(payload.token_ws)
        status = resp.get("status")
        buy_order = resp.get("buy_order")

        # Buscar metadata temporal por token_ws
        meta = pending_transactions.get(payload.token_ws)
        pedido_id = None
        if meta and meta.get("pedido_id"):
            pedido_id = meta["pedido_id"]
        else:
            # Si no encontramos por meta, intentar extraer id desde buy_order (formato O{pedidoId}...)
            if buy_order and buy_order.startswith("O"):
                try:
                    pedido_id = int("".join(filter(str.isdigit, buy_order[1:])))
                except Exception:
                    pedido_id = None

        if status == "AUTHORIZED":
            try:
                if pedido_id:
                    logger.info(
                        f"[TBK_CONFIRM] Actualizando pedido {pedido_id} a pagado..."
                    )
                    # 1. Actualizar pedido a pagado
                    await conn.execute(
                        """
                        UPDATE pedido 
                        SET order_status = 'pagado',
                            notas = 'Pago autorizado por Transbank',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        pedido_id,
                    )
                    logger.info(
                        f"[TBK_CONFIRM] Pedido {pedido_id} actualizado a pagado."
                    )

                    # 2. Insertar en pago
                    logger.info(
                        f"[TBK_CONFIRM] Insertando registro en pago para pedido {pedido_id}..."
                    )
                    logger.info(
                        f"[TBK_CONFIRM] Datos pago: order_id={pedido_id}, payment_method={resp.get('payment_type_code') or 'webpay'}, status={status}, transaction_id={resp.get('buy_order')}, amount={resp.get('amount')}, auth_code={resp.get('authorization_code')}, payment_type_code={resp.get('payment_type_code')}"
                    )
                    await conn.execute(
                        """
                        INSERT INTO pago (order_id, payment_method, payment_status, transaction_id, amount, payment_date, authorization_code, payment_type_code)
                        VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
                        """,
                        pedido_id,
                        resp.get("payment_type_code") or "webpay",
                        status,
                        resp.get("buy_order"),
                        float(resp.get("amount", 0)),
                        resp.get("authorization_code"),
                        resp.get("payment_type_code"),
                    )
                    logger.info(
                        f"[TBK_CONFIRM] Registro en pago insertado para pedido {pedido_id}."
                    )

                    # 3. Asegurar que detalle_pedido esté poblado
                    detalles = await conn.fetch(
                        "SELECT 1 FROM detalle_pedido WHERE pedido_id = $1 LIMIT 1",
                        pedido_id,
                    )
                    logger.info(
                        f"[TBK_CONFIRM] detalle_pedido existe para pedido {pedido_id}? {'SI' if detalles else 'NO'}"
                    )
                    if not detalles:
                        # Si no hay detalles, intentar poblar desde carrito del cliente
                        pedido = await conn.fetchrow(
                            "SELECT cliente_id FROM pedido WHERE id = $1", pedido_id
                        )
                        if pedido:
                            cliente_id = pedido["cliente_id"]
                            cart = await conn.fetchrow(
                                "SELECT id FROM Carrito WHERE cliente_id = $1",
                                cliente_id,
                            )
                            if cart:
                                cart_id = cart["id"]
                                cart_items = await conn.fetch(
                                    """
                                    SELECT producto_id, quantity, total_price FROM ArticuloCarrito WHERE carrito_id = $1
                                    """,
                                    cart_id,
                                )
                                logger.info(
                                    f"[TBK_CONFIRM] Insertando detalle_pedido para pedido {pedido_id} desde carrito {cart_id}, items: {len(cart_items)}"
                                )
                                for it in cart_items:
                                    pid = it["producto_id"]
                                    qty = max(int(it["quantity"] or 1), 1)
                                    total_price_item = float(it["total_price"] or 0)
                                    unit_price = (
                                        total_price_item / qty
                                        if qty > 0 and total_price_item > 0
                                        else 0
                                    )
                                    logger.info(
                                        f"[TBK_CONFIRM] Insertando detalle_pedido: pedido_id={pedido_id}, producto_id={pid}, cantidad={qty}, precio_unitario={unit_price}"
                                    )
                                    await conn.execute(
                                        """
                                        INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
                                        VALUES ($1, $2, $3, $4)
                                        ON CONFLICT (pedido_id, producto_id) DO UPDATE
                                        SET cantidad = EXCLUDED.cantidad, precio_unitario = EXCLUDED.precio_unitario
                                        """,
                                        pedido_id,
                                        pid,
                                        qty,
                                        unit_price,
                                    )
                                    # Descontar stock SOLO aquí, para no afectar otros flujos
                                    await conn.execute(
                                        """
                                        UPDATE producto
                                        SET stock_quantity = stock_quantity - $1
                                        WHERE id = $2
                                        """,
                                        qty,
                                        pid,
                                    )
                                logger.info(
                                    f"[TBK_CONFIRM] detalle_pedido insertado y stock actualizado para pedido {pedido_id}."
                                )

            except Exception as e:
                logger.error(f"Error en confirmación de pago: {e}")

            # eliminar meta temporal si existe
            pending_transactions.pop(payload.token_ws, None)

            return {
                "status": "success",
                "pedido_id": pedido_id,
                "buy_order": buy_order,
                "amount": resp.get("amount"),
                "authorization_code": resp.get("authorization_code"),
                "payment_type_code": resp.get("payment_type_code"),
                "response_code": resp.get("response_code"),
                "installments_number": resp.get("installments_number"),
            }
        else:
            # Si el pago fue rechazado, actualizar pedido a cancelado (si existe)
            if buy_order and buy_order in pending_transactions:
                transaction_data = pending_transactions[buy_order]
                pedido_id = transaction_data.get("pedido_id")
                if pedido_id:
                    await conn.execute(
                        """
                        UPDATE pedido 
                        SET order_status = 'cancelado',
                            notas = 'Pago rechazado por Transbank',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        pedido_id,
                    )
                    logger.info(
                        f"Pedido {pedido_id} marcado como cancelado por pago rechazado"
                    )
                del pending_transactions[buy_order]
            return {"status": "rejected", "detail": resp}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirmando transacción: {e}")
        raise HTTPException(status_code=500, detail="Error al confirmar la transacción")


# ==================== ENDPOINTS CHATBOT ====================


# Schemas para Chatbot
class ChatbotMessageRequest(BaseModel):
    message: str
    sender_id: Optional[str] = None
    metadata: Optional[dict] = None


class ChatbotMessageResponse(BaseModel):
    response: str
    confidence: Optional[float] = None
    intent: Optional[str] = None


class FAQCreate(BaseModel):
    categoria: str
    pregunta: str
    respuesta: str
    keywords: Optional[List[str]] = None
    is_active: Optional[bool] = True


class FAQUpdate(BaseModel):
    categoria: Optional[str] = None
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    keywords: Optional[List[str]] = None
    is_active: Optional[bool] = None


class FAQResponse(BaseModel):
    id: int
    categoria: str
    pregunta: str
    respuesta: str
    keywords: Optional[List[str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TicketResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    conversacion: Optional[str]
    estado: str
    fecha_creacion: datetime
    fecha_resolucion: Optional[datetime]
    notas: Optional[str]

    # Campo opcional para el email del usuario (join con Cliente)
    usuario_email: Optional[str] = None

    class Config:
        from_attributes = True


class TicketUpdateEstadoRequest(BaseModel):
    estado: str


class TicketUpdateNotasRequest(BaseModel):
    notas: str


# Endpoint: Enviar mensaje al chatbot (proxy a Rasa)
@app.post("/api/chatbot/message", response_model=List[ChatbotMessageResponse])
async def chatbot_message(
    request: ChatbotMessageRequest,
    db=Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Envía un mensaje al chatbot Rasa y devuelve la respuesta.
    """
    import httpx

    sender_id = request.sender_id or str(datetime.now().timestamp())
    import socket

    def is_localhost_available():
        try:
            sock = socket.create_connection(("localhost", 5005), timeout=1)
            sock.close()
            return True
        except Exception:
            return False

    default_local = "http://localhost:5005/webhooks/rest/webhook"
    fallback = "http://physical-via.gl.at.ply.gg:18057/webhooks/rest/webhook"
    rasa_url = os.getenv("RASA_URL", default_local)
    if rasa_url == default_local and not is_localhost_available():
        rasa_url = fallback

    # Construir metadata incluyendo cliente_id si el usuario está autenticado
    metadata = request.metadata.copy() if request.metadata else {}
    if current_user and current_user.get("role") == ROLE_CLIENTE:
        metadata["cliente_id"] = current_user.get("id") or current_user.get("user_id")

    payload = {
        "sender": sender_id,
        "message": request.message,
        "metadata": metadata,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(rasa_url, json=payload, timeout=10.0)

            if response.status_code == 200:
                rasa_responses = response.json()

                # Formatear respuestas
                chatbot_responses = []
                for resp in rasa_responses:
                    chatbot_responses.append(
                        ChatbotMessageResponse(
                            response=resp.get("text", ""),
                            confidence=resp.get("confidence"),
                            intent=resp.get("intent"),
                        )
                    )

                return chatbot_responses
            else:
                raise HTTPException(
                    status_code=500, detail="Error comunicándose con Rasa"
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout al conectar con el chatbot. Verifica que Rasa esté corriendo.",
        )
    except Exception as e:
        logger.error(f"Error en chatbot_message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Endpoint: Listar FAQs (Admin)
@app.get("/api/admin/faqs", response_model=List[FAQResponse])
async def list_faqs(
    categoria: Optional[str] = None,
    is_active: Optional[bool] = None,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Lista todas las FAQs. Solo para administradores.
    """
    # Verificar rol de administrador
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder",
        )

    try:
        query = "SELECT * FROM FAQ WHERE 1=1"
        params = []
        param_count = 1

        if categoria:
            query += f" AND categoria = ${param_count}"
            params.append(categoria)
            param_count += 1

        if is_active is not None:
            query += f" AND is_active = ${param_count}"
            params.append(is_active)
            param_count += 1

        query += " ORDER BY categoria, id"

        faqs = await db.fetch(query, *params)
        return [dict(faq) for faq in faqs]

    except Exception as e:
        logger.error(f"Error listando FAQs: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo FAQs")


# Endpoint: Crear FAQ (Admin)
@app.post("/api/admin/faqs", response_model=FAQResponse)
async def create_faq(
    faq: FAQCreate,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Crea una nueva FAQ. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden crear FAQs",
        )

    admin_id = token_data["user_id"]

    try:
        query = """
            INSERT INTO FAQ (categoria, pregunta, respuesta, keywords, is_active, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """
        new_faq = await db.fetchrow(
            query,
            faq.categoria,
            faq.pregunta,
            faq.respuesta,
            faq.keywords or [],
            faq.is_active,
            admin_id,
        )

        return dict(new_faq)

    except Exception as e:
        logger.error(f"Error creando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error creando FAQ")


# Endpoint: Actualizar FAQ (Admin)
@app.put("/api/admin/faqs/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: int,
    faq: FAQUpdate,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Actualiza una FAQ existente. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden editar FAQs",
        )

    try:
        # Construir query dinámica
        updates = []
        params = []
        param_count = 1

        if faq.categoria is not None:
            updates.append(f"categoria = ${param_count}")
            params.append(faq.categoria)
            param_count += 1

        if faq.pregunta is not None:
            updates.append(f"pregunta = ${param_count}")
            params.append(faq.pregunta)
            param_count += 1

        if faq.respuesta is not None:
            updates.append(f"respuesta = ${param_count}")
            params.append(faq.respuesta)
            param_count += 1

        if faq.keywords is not None:
            updates.append(f"keywords = ${param_count}")
            params.append(faq.keywords)
            param_count += 1

        if faq.is_active is not None:
            updates.append(f"is_active = ${param_count}")
            params.append(faq.is_active)
            param_count += 1

        if not updates:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        updates.append(f"updated_at = CURRENT_TIMESTAMP")
        params.append(faq_id)

        query = f"""
            UPDATE FAQ
            SET {", ".join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """

        updated_faq = await db.fetchrow(query, *params)

        if not updated_faq:
            raise HTTPException(status_code=404, detail="FAQ no encontrada")

        return dict(updated_faq)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando FAQ")


# Endpoint: Eliminar FAQ (Admin)
@app.delete("/api/admin/faqs/{faq_id}")
async def delete_faq(
    faq_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Elimina una FAQ. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar FAQs",
        )

    try:
        query = "DELETE FROM FAQ WHERE id = $1 RETURNING id"
        deleted = await db.fetchval(query, faq_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="FAQ no encontrada")

        return {"mensaje": f"FAQ {faq_id} eliminada exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando FAQ")


# Endpoint: Listar tickets (Admin)
@app.get("/api/admin/tickets", response_model=List[TicketResponse])
async def list_tickets(
    estado: Optional[str] = None,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Lista todos los tickets de soporte. Solo para administradores.
    Opcionalmente filtra por estado (pendiente, en_proceso, resuelto, cerrado).
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver tickets",
        )

    try:
        # Query con LEFT JOIN para obtener email del usuario
        query = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE 1=1
        """
        params = []

        if estado:
            query += " AND t.estado = $1"
            params.append(estado)

        query += " ORDER BY t.fecha_creacion DESC"

        tickets = await db.fetch(query, *params)
        return [dict(ticket) for ticket in tickets]

    except Exception as e:
        logger.error(f"Error listando tickets: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo tickets")


# Endpoint: Obtener un ticket por ID (Admin)
@app.get("/api/admin/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Obtiene los detalles de un ticket específico. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver tickets",
        )

    try:
        query = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """

        ticket = await db.fetchrow(query, ticket_id)

        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        return dict(ticket)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo ticket: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo ticket")


# Endpoint: Actualizar estado de ticket (Admin)
@app.patch("/api/admin/tickets/{ticket_id}/estado", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    request: TicketUpdateEstadoRequest,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Actualiza el estado de un ticket. Solo para administradores.
    Estados válidos: pendiente, en_proceso, resuelto, cerrado
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar tickets",
        )

    valid_estados = ["pendiente", "en_proceso", "resuelto", "cerrado"]
    if request.estado not in valid_estados:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_estados)}",
        )

    try:
        # Si el estado es 'resuelto' o 'cerrado', actualizar fecha_resolucion
        if request.estado in ["resuelto", "cerrado"]:
            query = """
                UPDATE tickets_soporte
                SET estado = $1, fecha_resolucion = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            """
        else:
            query = """
                UPDATE tickets_soporte
                SET estado = $1, fecha_resolucion = NULL
                WHERE id = $2
                RETURNING *
            """

        updated_ticket = await db.fetchrow(query, request.estado, ticket_id)

        if not updated_ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        # Obtener email del usuario
        query_with_email = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """
        ticket_with_email = await db.fetchrow(query_with_email, ticket_id)

        return dict(ticket_with_email)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando ticket: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando ticket")


# Endpoint: Agregar/actualizar notas internas de un ticket (Admin)
@app.patch("/api/admin/tickets/{ticket_id}/notas", response_model=TicketResponse)
async def update_ticket_notes(
    ticket_id: int,
    request: TicketUpdateNotasRequest,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Agrega o actualiza las notas internas de un ticket. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar notas",
        )

    try:
        query = """
            UPDATE tickets_soporte
            SET notas = $1
            WHERE id = $2
            RETURNING *
        """

        updated_ticket = await db.fetchrow(query, request.notas, ticket_id)

        if not updated_ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        # Obtener email del usuario
        query_with_email = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """
        ticket_with_email = await db.fetchrow(query_with_email, ticket_id)

        return dict(ticket_with_email)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando notas")


# Endpoint: Eliminar un ticket (Admin) - opcional
@app.delete("/api/admin/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Elimina un ticket. Solo para administradores. Usar con precaución.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar tickets",
        )

    try:
        query = "DELETE FROM tickets_soporte WHERE id = $1 RETURNING id"
        deleted = await db.fetchrow(query, ticket_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        return {"message": "Ticket eliminado correctamente", "id": deleted["id"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando ticket: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando ticket")


# ==================== FIN ENDPOINTS TICKETS ====================


@app.get("/")
async def root():
    return {
        "message": "API CRUD con PostgreSQL y JWT (Administrador/Cliente)",
        "endpoints": {
            "auth_login": "POST /api/auth/login",
            "auth_register": "POST /api/auth/register (Cliente)",
            "auth_refresh": "POST /api/auth/refresh",
            "auth_profile": "GET /api/auth/profile",
            "auth_change_password": "POST /api/auth/change-password",
            "auth_verify_email": "GET /api/auth/verify-email",
            "auth_resend_verification": "POST /api/auth/resend-verification",
            "auth_request_password_reset": "POST /api/auth/request-password-reset",
            "auth_reset_password": "POST /api/auth/reset-password",
            "crear_producto": "POST /api/productos/ (admin)",
            "obtener_productos": "GET /api/productos/ (admin)",
            "obtener_producto": "GET /api/productos/{id} (admin)",
            "actualizar_producto": "PUT /api/productos/{id} (admin)",
            "eliminar_producto": "DELETE /api/productos/{id} (admin)",
            "agregar_imagenes_producto": "POST /api/productos/{id}/imagenes (admin)",
            "obtener_imagenes_producto": "GET /api/productos/{id}/imagenes (admin)",
            "eliminar_imagen_producto": "DELETE /api/productos/imagenes/{id} (admin)",
            "productos_publicos": "GET /api/public/productos",
            "imagenes_producto_publicas": "GET /api/public/productos/{id}/imagenes",  # NUEVO
            "crear_cliente": "POST /api/clientes/ (admin)",
            "obtener_clientes": "GET /api/clientes/ (admin)",
            "obtener_cliente": "GET /api/clientes/{id} (admin)",
            "actualizar_cliente": "PUT /api/clientes/{id} (admin)",
            "eliminar_cliente": "DELETE /api/clientes/{id} (admin)",
            "crear_direccion": "POST /api/clientes/{id}/direcciones (admin o propio cliente)",
            "obtener_direcciones": "GET /api/clientes/{id}/direcciones (admin o propio cliente)",
            "actualizar_direccion": "PUT /api/direcciones/{id} (admin o propio cliente)",
            "eliminar_direccion": "DELETE /api/direcciones/{id} (admin o propio cliente)",
            "crear_administrador": "POST /api/administradores/ (admin)",
            "obtener_administradores": "GET /api/administradores/ (admin)",
            "obtener_administrador": "GET /api/administradores/{id} (admin)",
            "actualizar_administrador": "PUT /api/administradores/{id} (admin)",
            "eliminar_administrador": "DELETE /api/administradores/{id} (admin)",
            "transbank_create": "POST /api/transbank/create (cliente - requiere pedido_id)",
            "transbank_confirm": "GET/POST /api/transbank/confirm (callback de Transbank)",
            "transbank_status": "GET /api/transbank/status/{token} (cliente o admin)",
            "transbank_refund": "POST /api/transbank/refund/{payment_id} (admin)",
            "transbank_payments": "GET /api/transbank/payments (lista de pagos)",
            "transbank_payment_detail": "GET /api/transbank/payments/{payment_id} (detalle de pago)",
            "health": "GET /health",
            "documentacion": "/docs",
        },
    }


# Configuración Transbank (FORZAR TEST)
TBK_ENV = (os.getenv("TBK_ENV") or "TEST").upper()
TBK_INTEGRATION_TYPE = IntegrationType.TEST  # forzar test

# Usa constantes oficiales de integración para evitar 401
TBK_COMMERCE_CODE = (
    os.getenv("TBK_COMMERCE_CODE") or IntegrationCommerceCodes.WEBPAY_PLUS
)
TBK_API_KEY = os.getenv("TBK_API_KEY") or IntegrationApiKeys.WEBPAY

if WebpayOptions:
    TBK_OPTIONS = WebpayOptions(
        commerce_code=TBK_COMMERCE_CODE,
        api_key=TBK_API_KEY,
        integration_type=TBK_INTEGRATION_TYPE,
    )
else:
    TBK_OPTIONS = None
    Transaction.commerce_code = TBK_COMMERCE_CODE
    Transaction.api_key = TBK_API_KEY
    Transaction.integration_type = TBK_INTEGRATION_TYPE

logger.info(
    f"Transbank TEST configured. code={TBK_COMMERCE_CODE} type={TBK_INTEGRATION_TYPE}"
)


# Almacenamiento temporal de transacciones
pending_transactions = {}


# ==================== ENDPOINTS CHATBOT ====================


# Schemas para Chatbot
class ChatbotMessageRequest(BaseModel):
    message: str
    sender_id: Optional[str] = None
    metadata: Optional[dict] = None


class ChatbotMessageResponse(BaseModel):
    response: str
    confidence: Optional[float] = None
    intent: Optional[str] = None


class FAQCreate(BaseModel):
    categoria: str
    pregunta: str
    respuesta: str
    keywords: Optional[List[str]] = None
    is_active: Optional[bool] = True


class FAQUpdate(BaseModel):
    categoria: Optional[str] = None
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    keywords: Optional[List[str]] = None
    is_active: Optional[bool] = None


class FAQResponse(BaseModel):
    id: int
    categoria: str
    pregunta: str
    respuesta: str
    keywords: Optional[List[str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TicketResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    conversacion: Optional[str]
    estado: str
    fecha_creacion: datetime
    fecha_resolucion: Optional[datetime]
    notas: Optional[str]

    # Campo opcional para el email del usuario (join con Cliente)
    usuario_email: Optional[str] = None

    class Config:
        from_attributes = True


class TicketUpdateEstadoRequest(BaseModel):
    estado: str


class TicketUpdateNotasRequest(BaseModel):
    notas: str


# ==================== MODELOS DE PEDIDOS ====================


class OrderProductDetail(BaseModel):
    producto_id: int
    title: str
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    cliente_id: int
    order_status: str
    shipping_address: str
    total_price: float
    created_at: datetime
    updated_at: datetime

    # Datos del cliente (opcional, para admin)
    cliente_email: Optional[str] = None
    cliente_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class OrderDetailResponse(BaseModel):
    id: int
    cliente_id: int
    order_status: str
    shipping_address: str
    total_price: float
    created_at: datetime
    updated_at: datetime

    # Datos del cliente
    cliente_email: Optional[str] = None
    cliente_nombre: Optional[str] = None

    # Productos del pedido
    productos: List[OrderProductDetail] = []

    # Información de pago (si existe)
    pago_estado: Optional[str] = None
    pago_metodo: Optional[str] = None
    pago_fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderUpdateStatusRequest(BaseModel):
    order_status: str


class OrderNotasRequest(BaseModel):
    notas: str


# Endpoint: Listar FAQs (Admin)
@app.get("/api/admin/faqs", response_model=List[FAQResponse])
async def list_faqs(
    categoria: Optional[str] = None,
    is_active: Optional[bool] = None,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Lista todas las FAQs. Solo para administradores.
    """
    # Verificar rol de administrador
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder",
        )

    try:
        query = "SELECT * FROM FAQ WHERE 1=1"
        params = []
        param_count = 1

        if categoria:
            query += f" AND categoria = ${param_count}"
            params.append(categoria)
            param_count += 1

        if is_active is not None:
            query += f" AND is_active = ${param_count}"
            params.append(is_active)
            param_count += 1

        query += " ORDER BY categoria, id"

        faqs = await db.fetch(query, *params)
        return [dict(faq) for faq in faqs]

    except Exception as e:
        logger.error(f"Error listando FAQs: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo FAQs")


# Endpoint: Crear FAQ (Admin)
@app.post("/api/admin/faqs", response_model=FAQResponse)
async def create_faq(
    faq: FAQCreate,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Crea una nueva FAQ. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden crear FAQs",
        )

    admin_id = token_data["user_id"]

    try:
        query = """
            INSERT INTO FAQ (categoria, pregunta, respuesta, keywords, is_active, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """
        new_faq = await db.fetchrow(
            query,
            faq.categoria,
            faq.pregunta,
            faq.respuesta,
            faq.keywords or [],
            faq.is_active,
            admin_id,
        )

        return dict(new_faq)

    except Exception as e:
        logger.error(f"Error creando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error creando FAQ")


# Endpoint: Actualizar FAQ (Admin)
@app.put("/api/admin/faqs/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: int,
    faq: FAQUpdate,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Actualiza una FAQ existente. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden editar FAQs",
        )

    try:
        # Construir query dinámica
        updates = []
        params = []
        param_count = 1

        if faq.categoria is not None:
            updates.append(f"categoria = ${param_count}")
            params.append(faq.categoria)
            param_count += 1

        if faq.pregunta is not None:
            updates.append(f"pregunta = ${param_count}")
            params.append(faq.pregunta)
            param_count += 1

        if faq.respuesta is not None:
            updates.append(f"respuesta = ${param_count}")
            params.append(faq.respuesta)
            param_count += 1

        if faq.keywords is not None:
            updates.append(f"keywords = ${param_count}")
            params.append(faq.keywords)
            param_count += 1

        if faq.is_active is not None:
            updates.append(f"is_active = ${param_count}")
            params.append(faq.is_active)
            param_count += 1

        if not updates:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        updates.append(f"updated_at = CURRENT_TIMESTAMP")
        params.append(faq_id)

        query = f"""
            UPDATE FAQ
            SET {", ".join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """

        updated_faq = await db.fetchrow(query, *params)

        if not updated_faq:
            raise HTTPException(status_code=404, detail="FAQ no encontrada")

        return dict(updated_faq)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando FAQ")


# Endpoint: Eliminar FAQ (Admin)
@app.delete("/api/admin/faqs/{faq_id}")
async def delete_faq(
    faq_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Elimina una FAQ. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar FAQs",
        )

    try:
        query = "DELETE FROM FAQ WHERE id = $1 RETURNING id"
        deleted = await db.fetchval(query, faq_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="FAQ no encontrada")

        return {"mensaje": f"FAQ {faq_id} eliminada exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando FAQ: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando FAQ")


# Endpoint: Listar tickets (Admin)
@app.get("/api/admin/tickets", response_model=List[TicketResponse])
async def list_tickets(
    estado: Optional[str] = None,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Lista todos los tickets de soporte. Solo para administradores.
    Opcionalmente filtra por estado (pendiente, en_proceso, resuelto, cerrado).
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver tickets",
        )

    try:
        # Query con LEFT JOIN para obtener email del usuario
        query = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE 1=1
        """
        params = []

        if estado:
            query += " AND t.estado = $1"
            params.append(estado)

        query += " ORDER BY t.fecha_creacion DESC"

        tickets = await db.fetch(query, *params)
        return [dict(ticket) for ticket in tickets]

    except Exception as e:
        logger.error(f"Error listando tickets: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo tickets")


# Endpoint: Obtener un ticket por ID (Admin)
@app.get("/api/admin/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Obtiene los detalles de un ticket específico. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver tickets",
        )

    try:
        query = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """

        ticket = await db.fetchrow(query, ticket_id)

        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        return dict(ticket)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo ticket: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo ticket")


# Endpoint: Actualizar estado de ticket (Admin)
@app.patch("/api/admin/tickets/{ticket_id}/estado", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    request: TicketUpdateEstadoRequest,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Actualiza el estado de un ticket. Solo para administradores.
    Estados válidos: pendiente, en_proceso, resuelto, cerrado
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar tickets",
        )

    valid_estados = ["pendiente", "en_proceso", "resuelto", "cerrado"]
    if request.estado not in valid_estados:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_estados)}",
        )

    try:
        # Si el estado es 'resuelto' o 'cerrado', actualizar fecha_resolucion
        if request.estado in ["resuelto", "cerrado"]:
            query = """
                UPDATE tickets_soporte
                SET estado = $1, fecha_resolucion = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            """
        else:
            query = """
                UPDATE tickets_soporte
                SET estado = $1, fecha_resolucion = NULL
                WHERE id = $2
                RETURNING *
            """

        updated_ticket = await db.fetchrow(query, request.estado, ticket_id)

        if not updated_ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        # Obtener email del usuario
        query_with_email = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """
        ticket_with_email = await db.fetchrow(query_with_email, ticket_id)

        return dict(ticket_with_email)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando ticket: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando ticket")


# Endpoint: Agregar/actualizar notas internas de un ticket (Admin)
@app.patch("/api/admin/tickets/{ticket_id}/notas", response_model=TicketResponse)
async def update_ticket_notes(
    ticket_id: int,
    request: TicketUpdateNotasRequest,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Agrega o actualiza las notas internas de un ticket. Solo para administradores.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar notas",
        )

    try:
        query = """
            UPDATE tickets_soporte
            SET notas = $1
            WHERE id = $2
            RETURNING *
        """

        updated_ticket = await db.fetchrow(query, request.notas, ticket_id)

        if not updated_ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        # Obtener email del usuario
        query_with_email = """
            SELECT 
                t.*,
                c.email as usuario_email
            FROM tickets_soporte t
            LEFT JOIN Cliente c ON t.usuario_id = c.id
            WHERE t.id = $1
        """
        ticket_with_email = await db.fetchrow(query_with_email, ticket_id)

        return dict(ticket_with_email)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando notas")


# Endpoint: Eliminar un ticket (Admin) - opcional
@app.delete("/api/admin/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Elimina un ticket. Solo para administradores. Usar con precaución.
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar tickets",
        )

    try:
        query = "DELETE FROM tickets_soporte WHERE id = $1 RETURNING id"
        deleted = await db.fetchrow(query, ticket_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        return {"message": "Ticket eliminado correctamente", "id": deleted["id"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando ticket: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando ticket")


# ==================== FIN ENDPOINTS TICKETS ====================


# ==================== ENDPOINTS PEDIDOS (ORDERS) ====================


# Endpoint: Crear pedido desde el carrito
@app.post("/api/pedidos", response_model=OrderDetailResponse)
async def create_order_from_cart(
    direccion_id: Optional[int] = None,
    session_id: Optional[str] = None,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Crea un pedido desde el carrito actual del cliente.
    Requiere autenticación. SOLO RETIRO EN TIENDA.
    """
    token_data = await get_current_user(credentials, db)

    if token_data["role"] != ROLE_CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes pueden crear pedidos",
        )

    cliente_id = token_data.get("user_id")

    try:
        # Obtener carrito
        cart_id = await get_or_create_cart(
            db, cliente_id=cliente_id, session_id=session_id
        )

        # Obtener items del carrito
        cart_items = await db.fetch(
            """
            SELECT ac.producto_id, ac.quantity, p.price, p.title, p.stock_quantity
            FROM articulocarrito ac
            JOIN producto p ON ac.producto_id = p.id
            WHERE ac.carrito_id = $1 AND p.status = 'activo'
        """,
            cart_id,
        )

        if not cart_items:
            raise HTTPException(status_code=400, detail="El carrito está vacío")

        # Validar stock
        for item in cart_items:
            if item["quantity"] > item["stock_quantity"]:
                raise HTTPException(
                    status_code=400, detail=f"Stock insuficiente para {item['title']}"
                )

        # Calcular total
        total_price = sum(
            float(item["price"]) * item["quantity"] for item in cart_items
        )

        # Obtener dirección (por ahora: RETIRO EN TIENDA)
        shipping_address = "RETIRO EN TIENDA"
        if direccion_id:
            direccion = await db.fetchrow(
                "SELECT calle, nro, comuna, region FROM direccion WHERE id = $1 AND cliente_id = $2",
                direccion_id,
                cliente_id,
            )
            if direccion:
                shipping_address = f"{direccion['calle']} {direccion['nro']}, {direccion['comuna']}, {direccion['region']}"

        async with db.transaction():
            # Crear pedido
            pedido_id = await db.fetchval(
                """
                INSERT INTO pedido (cliente_id, order_status, shipping_address, total_price)
                VALUES ($1, 'creado', $2, $3)
                RETURNING id
            """,
                cliente_id,
                shipping_address,
                total_price,
            )

            # Insertar detalles del pedido
            for item in cart_items:
                await db.execute(
                    """
                    INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
                    VALUES ($1, $2, $3, $4)
                """,
                    pedido_id,
                    item["producto_id"],
                    item["quantity"],
                    float(item["price"]),
                )

                # Reducir stock
                await db.execute(
                    """
                    UPDATE producto 
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2
                """,
                    item["quantity"],
                    item["producto_id"],
                )

            # Limpiar carrito
            await db.execute(
                "DELETE FROM articulocarrito WHERE carrito_id = $1", cart_id
            )

            # Obtener pedido completo para respuesta
            pedido = await db.fetchrow(
                """
                SELECT p.*, c.email as cliente_email, c.first_name || ' ' || c.last_name as cliente_nombre
                FROM pedido p
                JOIN cliente c ON p.cliente_id = c.id
                WHERE p.id = $1
            """,
                pedido_id,
            )

            # Obtener productos
            productos = await db.fetch(
                """
                  SELECT dp.producto_id, pr.title, dp.cantidad, dp.precio_unitario,
                      (dp.cantidad * dp.precio_unitario) as subtotal
                FROM detalle_pedido dp
                JOIN producto pr ON dp.producto_id = pr.id
                WHERE dp.pedido_id = $1
            """,
                pedido_id,
            )

            result = dict(pedido)
            result["productos"] = [dict(p) for p in productos]

            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando pedido: {e}")
        raise HTTPException(status_code=500, detail="Error al crear el pedido")


# Endpoint: Listar todos los pedidos (Admin)
@app.get("/api/admin/orders", response_model=List[OrderResponse])
async def list_orders(
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Lista todos los pedidos. Solo para administradores.
    Opcionalmente filtrar por estado: creado, pagado, preparando, enviado, en_transito, entregado, cancelado
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver pedidos",
        )

    try:
        # Construir query con filtro opcional de estado
        query = """
            SELECT 
                p.*,
                c.email as cliente_email,
                c.first_name || ' ' || c.last_name as cliente_nombre
            FROM pedido p
            JOIN cliente c ON p.cliente_id = c.id
        """
        params = []

        if estado:
            query += " WHERE p.order_status = $1"
            params.append(estado)
            query += " ORDER BY p.created_at DESC LIMIT $2 OFFSET $3"
            params.extend([limit, skip])
        else:
            query += " ORDER BY p.created_at DESC LIMIT $1 OFFSET $2"
            params.extend([limit, skip])

        orders = await db.fetch(query, *params)
        return [dict(order) for order in orders]

    except Exception as e:
        logger.error(f"Error listando pedidos: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo pedidos")


# Endpoint: Obtener detalles de un pedido (Admin o Cliente propietario)
@app.get("/api/admin/orders/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(
    order_id: int,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Obtiene los detalles completos de un pedido incluyendo productos y pago.
    Admin puede ver cualquier pedido, Cliente solo sus propios pedidos.
    """
    token_data = await get_current_user(credentials, db)

    try:
        # Obtener datos básicos del pedido
        query = """
            SELECT 
                p.*,
                c.email as cliente_email,
                c.first_name || ' ' || c.last_name as cliente_nombre
            FROM pedido p
            JOIN cliente c ON p.cliente_id = c.id
            WHERE p.id = $1
        """

        order = await db.fetchrow(query, order_id)

        if not order:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")

        # Verificar permisos: Admin puede ver todo, Cliente solo sus pedidos
        if token_data["role"] != ROLE_ADMIN and order["cliente_id"] != token_data.get(
            "user_id"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver este pedido",
            )

        # Obtener productos del pedido
        productos_query = """
            SELECT 
                dp.producto_id,
                pr.title,
                dp.cantidad,
                dp.precio_unitario,
                (dp.cantidad * dp.precio_unitario) as subtotal
            FROM detalle_pedido dp
            JOIN producto pr ON dp.producto_id = pr.id
            WHERE dp.pedido_id = $1
            ORDER BY dp.producto_id
        """
        productos = await db.fetch(productos_query, order_id)

        # Obtener información de pago (si existe)
        pago_query = """
            SELECT payment_status, payment_method, payment_date
            FROM pago
            WHERE order_id = $1
            ORDER BY payment_date DESC
            LIMIT 1
        """
        pago = await db.fetchrow(pago_query, order_id)

        # Construir respuesta
        order_dict = dict(order)
        order_dict["productos"] = [dict(p) for p in productos]

        if pago:
            order_dict["pago_estado"] = pago["payment_status"]
            order_dict["pago_metodo"] = pago["payment_method"]
            order_dict["pago_fecha"] = pago["payment_date"]

        return order_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo detalle del pedido: {e}")
        raise HTTPException(
            status_code=500, detail="Error obteniendo detalles del pedido"
        )


# Endpoint: Actualizar estado de un pedido (Admin)
@app.patch("/api/admin/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    request: OrderUpdateStatusRequest,
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Actualiza el estado de un pedido. Solo para administradores.
    Estados válidos: creado, en preparación, listo para retiro, entregado, cancelado
    """
    token_data = await get_current_user(credentials, db)
    if token_data["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar estado de pedidos",
        )

    # Validar estado - SOLO RETIRO EN TIENDA
    estados_validos = [
        "pendiente"
        "pagado",
        "en preparación",
        "listo para retiro",
        "entregado",
        "cancelado",
    ]
    if request.order_status not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Estados válidos: {', '.join(estados_validos)}",
        )

    try:
        query = """
            UPDATE pedido
            SET order_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        """

        updated_order = await db.fetchrow(query, request.order_status, order_id)

        if not updated_order:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")

        # Obtener datos completos con información del cliente
        query_with_client = """
            SELECT 
                p.*,
                c.email as cliente_email,
                c.first_name || ' ' || c.last_name as cliente_nombre
            FROM pedido p
            JOIN cliente c ON p.cliente_id = c.id
            WHERE p.id = $1
        """

        order_with_client = await db.fetchrow(query_with_client, order_id)

        return dict(order_with_client)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando estado del pedido: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando estado")


# Endpoint: Obtener pedidos del cliente autenticado
@app.get("/api/cliente/mis-pedidos", response_model=List[OrderDetailResponse])
async def get_my_orders(
    db=Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Obtiene todos los pedidos del cliente autenticado con sus detalles.
    """
    token_data = await get_current_user(credentials, db)

    if token_data["role"] != ROLE_CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para clientes",
        )

    cliente_id = token_data.get("user_id")

    try:
        # Obtener pedidos del cliente
        query = """
            SELECT 
                p.*,
                c.email as cliente_email,
                c.first_name || ' ' || c.last_name as cliente_nombre
            FROM pedido p
            JOIN cliente c ON p.cliente_id = c.id
            WHERE p.cliente_id = $1
            ORDER BY p.created_at DESC
        """

        orders = await db.fetch(query, cliente_id)

        result = []

        for order in orders:
            order_dict = dict(order)

            # Obtener productos de cada pedido
            productos_query = """
                SELECT 
                    dp.producto_id,
                    pr.title,
                    dp.cantidad,
                    dp.precio_unitario,
                    (dp.cantidad * dp.precio_unitario) as subtotal
                FROM detalle_pedido dp
                JOIN producto pr ON dp.producto_id = pr.id
                WHERE dp.pedido_id = $1
                ORDER BY dp.producto_id
            """
            productos = await db.fetch(productos_query, order_dict["id"])
            order_dict["productos"] = [dict(p) for p in productos]

            # Obtener info de pago
            pago_query = """
                SELECT payment_status, payment_method, payment_date
                FROM pago
                WHERE order_id = $1
                ORDER BY payment_date DESC
                LIMIT 1
            """
            pago = await db.fetchrow(pago_query, order_dict["id"])

            if pago:
                order_dict["pago_estado"] = pago["payment_status"]
                order_dict["pago_metodo"] = pago["payment_method"]
                order_dict["pago_fecha"] = pago["payment_date"]

            result.append(order_dict)

        return result

    except Exception as e:
        logger.error(f"Error obteniendo pedidos del cliente: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo tus pedidos")


# ==================== FIN ENDPOINTS PEDIDOS ====================


# ==================== CONFIGURACIÓN DE LA TIENDA ====================
class StoreConfig(BaseModel):
    store_name: str
    logo_url: Optional[str] = None
    header_color: str
    selected_template: str = 'A'  # AGREGADO


@app.get("/api/public/store-config", response_model=StoreConfig)
async def get_store_config(conn=Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT store_name, logo_url, header_color, selected_template FROM store_config ORDER BY id ASC LIMIT 1"
    )
    if not row:
        return {
            "store_name": "Mi Tienda", 
            "logo_url": None, 
            "header_color": "#111827",
            "selected_template": "A"  # AGREGADO
        }
    return dict(row)


@app.put("/api/admin/store-config", response_model=StoreConfig)
async def update_store_config(
    cfg: StoreConfig,
    conn=Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    existing = await conn.fetchrow(
        "SELECT id FROM store_config ORDER BY id ASC LIMIT 1"
    )
    if existing:
        await conn.execute(
            """
            UPDATE store_config
            SET store_name=$1, logo_url=$2, header_color=$3, selected_template=$4, updated_at=NOW()
            WHERE id=$5
            """,
            cfg.store_name,
            cfg.logo_url,
            cfg.header_color,
            cfg.selected_template,  # AGREGADO
            existing["id"],
        )
    else:
        await conn.execute(
            """
            INSERT INTO store_config (store_name, logo_url, header_color, selected_template)
            VALUES ($1, $2, $3, $4)
            """,
            cfg.store_name,
            cfg.logo_url,
            cfg.header_color,
            cfg.selected_template,  # AGREGADO
        )
    row = await conn.fetchrow(
        "SELECT store_name, logo_url, header_color, selected_template FROM store_config ORDER BY id ASC LIMIT 1"
    )
    return dict(row)


# Lifecycle
@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8001)
