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
from jose import JWTError, jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Back.settings")
django.setup()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración JWT
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Configuración para hashing de passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Clase mejorada para envío de correos
class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")

    async def send_email(
        self, to_email: str, subject: str, body: str, is_html: bool = True
    ):
        """Envía un correo electrónico"""
        try:
            # Crear mensaje
            msg = MIMEMultipart()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject

            # Adjuntar cuerpo del mensaje
            if is_html:
                msg.attach(MIMEText(body, "html"))
            else:
                msg.attach(MIMEText(body, "plain"))

            # Conectar y enviar (usando run_in_threadpool para operaciones bloqueantes)
            import asyncio
            from concurrent.futures import ThreadPoolExecutor

            def sync_send():
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
                server.quit()

            # Ejecutar en thread pool para no bloquear el event loop
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as pool:
                await loop.run_in_executor(pool, sync_send)

            logger.info(f"✅ Correo enviado exitosamente a {to_email}")
            return True

        except Exception as e:
            logger.error(f"❌ Error enviando correo a {to_email}: {e}")
            return False

    async def send_verification_email(self, email: str, token: str):
        """Envía email de verificación con diseño profesional"""
        verification_url = (
            f"https://d10nrn1yj450xr.cloudfront.net/api/auth/verify-email?token={token}"
        )

        subject = "🔐 Verifica tu correo electrónico"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }}
                .content {{ padding: 30px; background: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Bienvenido! 🎉</h1>
                </div>
                <div class="content">
                    <h2>Verifica tu dirección de correo</h2>
                    <p>Hola,</p>
                    <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verificar mi correo</a>
                    </div>
                    
                    <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">{verification_url}</p>
                    
                    <p><strong>Este enlace expirará en 24 horas.</strong></p>
                    
                    <p>Si no te registraste en nuestra plataforma, por favor ignora este mensaje.</p>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
                    <p>&copy; 2024 Tu Empresa. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(email, subject, html_body)

    async def send_welcome_email(self, email: str, first_name: str):
        """Envía email de bienvenida después de la verificación"""
        subject = "¡Bienvenido a nuestra plataforma! 🚀"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; color: white; }}
                .content {{ padding: 30px; background: #f9f9f9; }}
                .feature {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Cuenta verificada exitosamente! ✅</h1>
                </div>
                <div class="content">
                    <h2>Hola {first_name},</h2>
                    <p>¡Felicidades! Tu cuenta ha sido verificada exitosamente y ahora tienes acceso completo a nuestra plataforma.</p>
                    
                    <h3>¿Qué puedes hacer ahora?</h3>
                    
                    <div class="feature">
                        <strong>📦 Gestionar productos</strong>
                        <p>Accede al panel de administración para gestionar tu inventario.</p>
                    </div>
                    
                    <div class="feature">
                        <strong>👥 Perfil personalizado</strong>
                        <p>Completa tu perfil para una mejor experiencia.</p>
                    </div>
                    
                    <div class="feature">
                        <strong>🔔 Notificaciones</strong>
                        <p>Recibe alertas importantes sobre tu cuenta.</p>
                    </div>
                    
                    <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>
                    
                    <p>¡Gracias por unirte a nosotros!</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(email, subject, html_body)

    async def send_password_reset_email(self, email: str, token: str):
        """Envía email para restablecer contraseña"""
        reset_url = os.getenv("URL_BACK") + f"/api/auth/verify-email?token={token}"

        subject = "🔒 Restablecer tu contraseña"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center; color: white; }}
                .content {{ padding: 30px; background: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Restablecer contraseña</h1>
                </div>
                <div class="content">
                    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Restablecer contraseña</a>
                    </div>
                    
                    <p>Si no solicitaste este cambio, por favor ignora este mensaje.</p>
                    <p><strong>Este enlace expirará en 1 hora.</strong></p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(email, subject, html_body)


# Instancia global del servicio de correo
email_service = EmailService()


# Modelos Pydantic para autenticación
class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str
    address: Optional[str] = None
    verification_status: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo


class TokenData(BaseModel):
    username: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    address: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# Modelos Pydantic para el CRUD
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


# Utilities para passwords
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si el password plano coincide con el hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera hash de un password"""
    return pwd_context.hash(password)


# Función para obtener conexión de la base de datos
async def get_db():
    async with database.pool.acquire() as connection:
        yield connection


# Pool de conexiones PostgreSQL
class Database:
    def __init__(self):
        self.pool: Optional[Pool] = None

    async def connect(self):
        """Conectar a PostgreSQL"""
        try:
            db_config = settings.DATABASES["default"]
            self.pool = await asyncpg.create_pool(
                user=db_config["USER"],
                password=db_config["PASSWORD"],
                database=db_config["NAME"],
                host=db_config["HOST"],
                port=db_config["PORT"],
            )
            logger.info("✅ Conectado a PostgreSQL")
        except Exception as e:
            logger.error(f"❌ Error conectando a PostgreSQL: {e}")
            raise

    async def disconnect(self):
        """Desconectar de PostgreSQL"""
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Desconectado de PostgreSQL")


# Instancia global de la base de datos
database = Database()

app = FastAPI(
    title="API CRUD con PostgreSQL y JWT",
    description="FastAPI con operaciones CRUD incompletas y autenticazao JWT (Juice World Terminal).",
    version="1.1.0",
)

# Configurar CORS
origins = [
    "http://during-consultant.gl.at.ply.gg:47021",  ## FRONT VITE/PLAYIT
    "http://147.185.221.18:47021",  ##FRONT VITE/PLAYIT
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8001",
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


# Funciones para tokens JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un token JWT de acceso"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Crea un token JWT de refresh"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Funciones de autenticación
async def send_verification_email(email: str, token: str):
    """Envía un email de verificación con el token"""
    return await email_service.send_verification_email(email, token)


async def authenticate_user(username: str, password: str, conn) -> Optional[dict]:
    """Autentica un usuario contra la base de datos PostgreSQL"""
    try:
        query = """
            SELECT id, email, hash_pwd, first_name, last_name, phone, address, 
                   verification_status, social_login_id
            FROM Usuario 
            WHERE email = $1
        """
        user = await conn.fetchrow(query, username)

        if not user:
            return None

        if not verify_password(password, user["hash_pwd"]):
            return None

        if user["verification_status"] != "verificado":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no verificado. Por favor verifica tu email.",
            )

        return dict(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en autenticación: {e}")
        return None


async def get_user_by_email(email: str, conn) -> Optional[dict]:
    """Obtiene un usuario por email"""
    try:
        query = """
            SELECT id, email, first_name, last_name, phone, address, verification_status, social_login_id
            FROM Usuario 
            WHERE email = $1
        """
        user = await conn.fetchrow(query, email)
        return dict(user) if user else None
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security), conn=Depends(get_db)
):
    """Obtiene el usuario actual basado en el token JWT"""
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await get_user_by_email(email, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.get("verification_status") != "verificado":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no verificado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al decodificar token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ENDPOINTS DE AUTENTICACIÓN
@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, conn=Depends(get_db)):
    """Endpoint para login que usa la base de datos PostgreSQL"""
    try:
        user = await authenticate_user(login_data.username, login_data.password, conn)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=access_token_expires,
        )

        refresh_token = create_refresh_token(data={"sub": user["email"]})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "phone": user["phone"],
                "address": user["address"],
                "verification_status": user["verification_status"],
            },
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
    """Endpoint para registrar nuevo usuario"""
    try:
        existing_user = await get_user_by_email(register_data.email, conn)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado",
            )

        hashed_password = get_password_hash(register_data.password)

        # Generar token de verificación
        verification_token = create_access_token(
            data={"sub": register_data.email, "purpose": "email_verification"},
            expires_delta=timedelta(hours=24),  # Token válido por 24 horas
        )

        query = """
            INSERT INTO Usuario (email, hash_pwd, first_name, last_name, phone, address, 
                                verification_status, password_reset_token)
            VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7)
            RETURNING id, email, first_name, last_name, phone, address, verification_status
        """

        result = await conn.fetchrow(
            query,
            register_data.email,
            hashed_password,
            register_data.first_name,
            register_data.last_name,
            register_data.phone,
            register_data.address,
            verification_token,  # Guardamos el token en la base de datos
        )

        # Enviar correo REAL
        email_sent = await email_service.send_verification_email(
            register_data.email, verification_token
        )

        if email_sent:
            email_message = "Usuario registrado exitosamente. Se ha enviado un email de verificación."
        else:
            email_message = "Usuario registrado, pero hubo un error al enviar el email de verificación. Contacta al soporte."

        return {
            "message": email_message,
            "user": dict(result),
            "verification_token": verification_token
            if not email_sent
            else None,  # Solo mostrar token si falla el email
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
    """Endpoint para verificar email con token"""
    try:
        # Decodificar el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")

        if not email or purpose != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificación inválido",
            )

        # Verificar que el token coincida con el guardado en la base de datos
        query = """
            SELECT id, verification_status, password_reset_token, first_name
            FROM Usuario 
            WHERE email = $1
        """
        user = await conn.fetchrow(query, email)

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

        # Actualizar el estado de verificación
        update_query = """
            UPDATE Usuario 
            SET verification_status = 'verificado', password_reset_token = NULL
            WHERE email = $1
            RETURNING id, email, first_name, last_name, phone, address, verification_status
        """

        result = await conn.fetchrow(update_query, email)
        user_data = dict(result)

        # Enviar correo de bienvenida
        await email_service.send_welcome_email(email, user["first_name"])

        return {
            "message": "✅ Email verificado exitosamente",
            "user": user_data,
            "welcome_email_sent": True,
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación expirado",
        )
    except jwt.JWTError:
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
    """Cambiar contraseña del usuario actual"""
    try:
        user = await authenticate_user(
            current_user["email"], password_data.current_password, conn
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual incorrecta",
            )

        new_hashed_password = get_password_hash(password_data.new_password)

        query = "UPDATE Usuario SET hash_pwd = $1 WHERE id = $2"
        await conn.execute(query, new_hashed_password, current_user["id"])

        return {"message": "Contraseña cambiada exitosamente"}

    except Exception as e:
        logger.error(f"Error cambiando contraseña: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar contraseña",
        )


@app.get("/api/auth/profile", response_model=UserInfo)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Obtener perfil del usuario actual"""
    return current_user


@app.post("/api/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str, conn=Depends(get_db)):
    """Endpoint para refrescar el token"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

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
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=access_token_expires,
        )

        new_refresh_token = create_refresh_token(data={"sub": user["email"]})

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
                "address": user["address"],
                "verification_status": user["verification_status"],
            },
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresh expirado"
        )
    except jwt.JWTError:
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
    """Reenviar email de verificación"""
    try:
        user = await get_user_by_email(email, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
            )

        if user["verification_status"] == "verificado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está verificado",
            )

        # Generar nuevo token
        new_verification_token = create_access_token(
            data={"sub": email, "purpose": "email_verification"},
            expires_delta=timedelta(hours=24),
        )

        # Actualizar el token en la base de datos
        update_query = "UPDATE Usuario SET password_reset_token = $1 WHERE email = $2"
        await conn.execute(update_query, new_verification_token, email)

        # Enviar email REAL
        email_sent = await email_service.send_verification_email(
            email, new_verification_token
        )

        response_data = {
            "message": "Email de verificación reenviado"
            if email_sent
            else "Error al enviar email, contacta al soporte"
        }

        # Solo incluir token en desarrollo si falla el email
        if not email_sent:
            response_data["verification_token"] = new_verification_token

        return response_data

    except Exception as e:
        logger.error(f"Error reenviando email de verificación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al reenviar email de verificación",
        )


@app.post("/api/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest, conn=Depends(get_db)):
    """Solicitar restablecimiento de contraseña"""
    try:
        user = await get_user_by_email(request.email, conn)
        if not user:
            # Por seguridad, no revelar si el email existe o no
            return {
                "message": "Si el email existe, se ha enviado un enlace de restablecimiento"
            }

        # Generar token de restablecimiento
        reset_token = create_access_token(
            data={"sub": request.email, "purpose": "password_reset"},
            expires_delta=timedelta(hours=1),
        )

        # Guardar token en la base de datos
        update_query = "UPDATE Usuario SET password_reset_token = $1 WHERE email = $2"
        await conn.execute(update_query, reset_token, request.email)

        # Enviar email de restablecimiento
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
    """Restablecer contraseña con token"""
    try:
        payload = jwt.decode(confirm.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")

        if not email or purpose != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido",
            )

        # Verificar que el token coincida con la base de datos
        query = "SELECT id, password_reset_token FROM Usuario WHERE email = $1"
        user = await conn.fetchrow(query, email)

        if not user or user["password_reset_token"] != confirm.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado",
            )

        # Actualizar contraseña
        new_hashed_password = get_password_hash(confirm.new_password)
        update_query = """
            UPDATE Usuario 
            SET hash_pwd = $1, password_reset_token = NULL 
            WHERE email = $2
        """
        await conn.execute(update_query, new_hashed_password, email)

        return {"message": "Contraseña restablecida exitosamente"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expirado",
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido",
        )
    except Exception as e:
        logger.error(f"Error restableciendo contraseña: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer contraseña",
        )


# ENDPOINTS CRUD PROTEGIDOS
@app.post(
    "/api/productos/",
    response_model=ProductoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_producto(
    producto: ProductoCreate,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crear un nuevo producto (protegido)"""
    logger.info(f"Usuario {current_user['email']} creando producto")
    try:
        query = """
            INSERT INTO producto (sku, title, description, price, stock_quantity, category_id)
            VALUES ($1, $2, $3, $4, $5, $6)
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
    limit: int = 100,
    categoria_id: Optional[int] = None,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener lista de productos con filtros opcionales (protegido)"""
    logger.info(f"Usuario {current_user['email']} obteniendo productos")
    try:
        if categoria_id:
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
                ORDER BY id 
                LIMIT $1 OFFSET $2
            """
            results = await conn.fetch(query, limit, skip)

        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo productos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener productos")


@app.get("/api/productos/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener un producto por ID (protegido)"""
    logger.info(f"Usuario {current_user['email']} obteniendo producto {producto_id}")
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
    current_user: dict = Depends(get_current_user),
):
    """Actualizar un producto existente (protegido)"""
    logger.info(f"Usuario {current_user['email']} actualizando producto {producto_id}")
    try:
        check_query = "SELECT id FROM producto WHERE id = $1"
        exists = await conn.fetchrow(check_query, producto_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        fields = []
        values = []
        field_count = 1

        if producto.sku is not None:
            fields.append(f"sku = ${field_count}")
            values.append(producto.sku)
            field_count += 1

        if producto.title is not None:
            fields.append(f"title = ${field_count}")
            values.append(producto.title)
            field_count += 1

        if producto.description is not None:
            fields.append(f"description = ${field_count}")
            values.append(producto.description)
            field_count += 1

        if producto.price is not None:
            fields.append(f"price = ${field_count}")
            values.append(producto.price)
            field_count += 1

        if producto.stock_quantity is not None:
            fields.append(f"stock_quantity = ${field_count}")
            values.append(producto.stock_quantity)
            field_count += 1

        if producto.category_id is not None:
            fields.append(f"category_id = ${field_count}")
            values.append(producto.category_id)
            field_count += 1

        if not fields:
            raise HTTPException(
                status_code=400, detail="No se proporcionaron campos para actualizar"
            )

        values.append(producto_id)

        update_query = f"""
            UPDATE producto 
            SET {", ".join(fields)}
            WHERE id = ${field_count}
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
    current_user: dict = Depends(get_current_user),
):
    """Eliminar un producto (protegido)"""
    logger.info(f"Usuario {current_user['email']} eliminando producto {producto_id}")
    try:
        check_query = "SELECT id FROM producto WHERE id = $1"
        exists = await conn.fetchrow(check_query, producto_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        delete_query = "DELETE FROM producto WHERE id = $1"
        await conn.execute(delete_query, producto_id)

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
    current_user: dict = Depends(get_current_user),
):
    """Agregar URLs de imágenes a un producto"""
    logger.info(
        f"Usuario {current_user['email']} agregando imágenes a producto {producto_id}"
    )
    # Verifica que el producto exista
    check_query = "SELECT id FROM producto WHERE id = $1"
    exists = await conn.fetchrow(check_query, producto_id)
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
    current_user: dict = Depends(get_current_user),
):
    """Obtener todas las imágenes asociadas a un producto"""
    logger.info(
        f"Usuario {current_user['email']} consultando imágenes de producto {producto_id}"
    )
    check_query = "SELECT id FROM producto WHERE id = $1"
    exists = await conn.fetchrow(check_query, producto_id)
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
    current_user: dict = Depends(get_current_user),
):
    """Eliminar una imagen de producto por su ID"""
    logger.info(f"Usuario {current_user['email']} eliminando imagen {imagen_id}")
    try:
        check_query = "SELECT id FROM ProductoImagen WHERE id = $1"
        exists = await conn.fetchrow(check_query, imagen_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Imagen no encontrada")

        delete_query = "DELETE FROM ProductoImagen WHERE id = $1"
        await conn.execute(delete_query, imagen_id)

        return MensajeResponse(
            mensaje=f"Imagen {imagen_id} eliminada correctamente", exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando imagen {imagen_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar imagen")


# Endpoints públicos (sin autenticación)
@app.get("/api/public/productos", response_model=List[ProductoResponse])
async def obtener_productos_publicos(
    skip: int = 0,
    limit: int = 100,
    categoria_id: Optional[int] = None,
    conn=Depends(get_db),
):
    """Obtener lista de productos (público)"""
    try:
        query = """
            SELECT id, sku, title, description, price, stock_quantity, category_id, status 
            FROM producto 
            WHERE status = 'active'
            ORDER BY id 
            LIMIT $1 OFFSET $2
        """
        results = await conn.fetch(query, limit, skip)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo productos públicos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener productos")


# Endpoints adicionales
@app.get("/api/categorias/", response_model=List[str])
async def obtener_categorias(conn=Depends(get_db)):
    """Obtener lista de categorías"""
    try:
        query = "SELECT name FROM categoria ORDER BY id"
        results = await conn.fetch(query)
        return [row["name"] for row in results if row["name"]]
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener categorías")


@app.get("/api/categorias-con-id/", response_model=List[dict])
async def obtener_categorias_con_id(conn=Depends(get_db)):
    """Obtener lista de categorías con ID"""
    try:
        query = "SELECT id, name FROM categoria ORDER BY id"
        results = await conn.fetch(query)
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener categorías")


# Endpoint de prueba para correos
@app.post("/api/test-email")
async def test_email(email: str):
    """Endpoint para probar el envío de correos"""
    success = await email_service.send_email(
        email,
        "✅ Prueba de correo desde FastAPI",
        "<h1>¡Funciona!</h1><p>El sistema de correos está funcionando correctamente.</p>",
    )

    return {
        "success": success,
        "message": "Correo de prueba enviado" if success else "Error al enviar correo",
    }


# Health check (público)
@app.get("/health")
async def health_check(conn=Depends(get_db)):
    """Verificar estado del sistema y conexión a la base de datos"""
    try:
        await conn.execute("SELECT 1")
        count = await conn.fetchval("SELECT COUNT(*) FROM producto")
        return {"status": "healthy", "database": "connected", "total_productos": count}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")


@app.get("/")
async def root():
    return {
        "message": "API CRUD con PostgreSQL y JWT Authentication",
        "endpoints": {
            "auth_login": "POST /api/auth/login",
            "auth_register": "POST /api/auth/register",
            "auth_refresh": "POST /api/auth/refresh",
            "auth_profile": "GET /api/auth/profile",
            "auth_change_password": "POST /api/auth/change-password",
            "auth_verify_email": "GET /api/auth/verify-email",
            "auth_resend_verification": "POST /api/auth/resend-verification",
            "auth_request_password_reset": "POST /api/auth/request-password-reset",
            "auth_reset_password": "POST /api/auth/reset-password",
            "test_email": "POST /api/test-email",
            "crear_producto": "POST /api/productos/ (protegido)",
            "obtener_productos": "GET /api/productos/ (protegido)",
            "obtener_producto": "GET /api/productos/{id} (protegido)",
            "actualizar_producto": "PUT /api/productos/{id} (protegido)",
            "eliminar_producto": "DELETE /api/productos/{id} (protegido)",
            "productos_publicos": "GET /api/public/productos",
            "categorias": "GET /api/categorias/",
            "categorias_con_id": "GET /api/categorias-con-id/",
            "health": "GET /health",
            "documentacion": "/docs",
        },
    }


# Event handlers para la conexión de la base de datos
@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8001)
