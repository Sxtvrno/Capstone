from django.conf import settings
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import django
import asyncpg
from asyncpg.pool import Pool
import logging

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Back.settings')
django.setup()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modelos Pydantic para el CRUD
class ProductoCreate(BaseModel):
    sku: str
    title: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    category_id: int

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

# Pool de conexiones PostgreSQL
class Database:
    def __init__(self):
        self.pool: Optional[Pool] = None

    async def connect(self):
        """Conectar a PostgreSQL"""
        try:
            db_config = settings.DATABASES['default']
            self.pool = await asyncpg.create_pool(
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                database=db_config['NAME'],
                host=db_config['HOST'],
                port=db_config['PORT']
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
    title="API CRUD con PostgreSQL",
    description="API FastAPI con operaciones CRUD completas",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers para la conexión de la base de datos
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Función para obtener conexión de la base de datos
async def get_db():
    async with database.pool.acquire() as connection:
        yield connection

# ENDPOINTS CRUD

@app.post("/api/productos/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(producto: ProductoCreate, conn=Depends(get_db)):
    """Crear un nuevo producto"""
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
            producto.category_id
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
    conn=Depends(get_db)
):
    """Obtener lista de productos con filtros opcionales"""
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
async def obtener_producto(producto_id: int, conn=Depends(get_db)):
    """Obtener un producto por ID"""
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
    conn=Depends(get_db)
):
    """Actualizar un producto existente"""
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
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

        values.append(producto_id)
        
        update_query = f"""
            UPDATE producto 
            SET {', '.join(fields)}
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
async def eliminar_producto(producto_id: int, conn=Depends(get_db)):
    """Eliminar un producto"""
    try:
        check_query = "SELECT id FROM producto WHERE id = $1"
        exists = await conn.fetchrow(check_query, producto_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        delete_query = "DELETE FROM producto WHERE id = $1"
        await conn.execute(delete_query, producto_id)
        
        return MensajeResponse(
            mensaje=f"Producto {producto_id} eliminado correctamente",
            exito=True
        )
    except Exception as e:
        logger.error(f"Error eliminando producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar producto")

# Endpoints adicionales
@app.get("/api/categorias/", response_model=List[str])
async def obtener_categorias(conn=Depends(get_db)):
    """Obtener lista de categorías"""
    try:
        query = "SELECT name FROM categoria ORDER BY id"
        results = await conn.fetch(query)
        return [row['name'] for row in results if row['name']]
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

# Health check
@app.get("/health")
async def health_check(conn=Depends(get_db)):
    """Verificar estado del sistema y conexión a la base de datos"""
    try:
        await conn.execute("SELECT 1")
        count = await conn.fetchval("SELECT COUNT(*) FROM producto")
        return {
            "status": "healthy",
            "database": "connected",
            "total_productos": count
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/")
async def root():
    return {
        "message": "API CRUD con PostgreSQL",
        "endpoints": {
            "crear_producto": "POST /api/productos/",
            "obtener_productos": "GET /api/productos/",
            "obtener_producto": "GET /api/productos/{id}",
            "actualizar_producto": "PUT /api/productos/{id}",
            "eliminar_producto": "DELETE /api/productos/{id}",
            "categorias": "GET /api/categorias/",
            "categorias_con_id": "GET /api/categorias-con-id/",
            "health": "GET /health",
            "documentacion": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8001)