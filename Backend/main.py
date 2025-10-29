from django.conf import settings
from fastapi import FastAPI, HTTPException, Depends, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
import django
import asyncpg
from asyncpg.pool import Pool
import logging
from jose import JWTError, jwt  # noqa: F401
from datetime import datetime, timedelta
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Back.settings")
django.setup()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROLE_ADMIN = "admin"
ROLE_CLIENTE = "cliente"


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
        verification_url = (
            os.getenv("URL_BACK") or "http://localhost:8001"
        ) + f"/api/auth/verify-email?token={token}"
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
        reset_url = (
            os.getenv("URL_BACK") or "http://localhost:8001"
        ) + f"/api/auth/reset-password?token={token}"
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


# Producto
class ProductoCreate(BaseModel):
    sku: str
    title: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    category_id: int


class ImagenProductoCreate(BaseModel):
    url_imagen: str


class ImagenProductoResponse(BaseModel):
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
    "/api/productos/{producto_id}/imagenes", response_model=List[ImagenProductoResponse]
)
async def agregar_imagenes_producto(
    producto_id: int,
    imagenes: List[ImagenProductoCreate],
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
    "/api/productos/{producto_id}/imagenes", response_model=List[ImagenProductoResponse]
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
    response_model=List[ImagenProductoResponse],
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
                detail="No puedes eliminar tu propia cuenta de administrador",
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando administrador {admin_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar administrador")


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
            "categorias": "GET /api/categorias/",
            "categorias_con_id": "GET /api/categorias-con-id/",
            "health": "GET /health",
            "documentacion": "/docs",
        },
    }


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
