-- Tabla de Administradores
CREATE TABLE IF NOT EXISTS Administrador (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hash_pwd VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- Rol del administrador
    is_active BOOLEAN DEFAULT TRUE, -- Estado del administrador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS Cliente (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hash_pwd VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    social_login_id VARCHAR(255), -- ID para logins sociales (si aplica)
    verification_status VARCHAR(50) DEFAULT 'pendiente', -- Estado de verificación del correo
    password_reset_token VARCHAR(255), -- Token para restablecimiento de contraseña
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Direcciones de Clientes
CREATE TABLE IF NOT EXISTS Direccion (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    comuna VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    calle VARCHAR(255) NOT NULL,
    nro VARCHAR(10) NOT NULL,
    lat DOUBLE PRECISION NULL, -- Latitud opcional
    lon DOUBLE PRECISION NULL, -- Longitud opcional
    is_default BOOLEAN DEFAULT FALSE, -- Dirección principal
    FOREIGN KEY (cliente_id) REFERENCES Cliente (id) ON DELETE CASCADE
);

-- Tabla de Categorías de Productos
CREATE TABLE IF NOT EXISTS Categoria (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS Producto (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL,
    category_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'activo', -- Estado del producto (activo, inactivo)
    created_by INT NOT NULL, -- Administrador que creó el producto
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categoria (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Administrador (id) ON DELETE SET NULL
);

-- Tabla de Imágenes de Producto
CREATE TABLE IF NOT EXISTS ProductoImagen (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL,
    url_imagen VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Imagen principal
    orden INT DEFAULT 0, -- Orden de visualización
    FOREIGN KEY (producto_id) REFERENCES Producto (id) ON DELETE CASCADE
);

-- Tabla de Carrito de Compras (para clientes registrados y anónimos)
CREATE TABLE IF NOT EXISTS Carrito (
    id SERIAL PRIMARY KEY,
    cliente_id INT NULL, -- Cliente, NULL si es un carrito anónimo
    session_id VARCHAR(255) NULL, -- Session ID para carritos anónimos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES Cliente (id) ON DELETE CASCADE
);

-- Tabla de Artículos en el Carrito
CREATE TABLE IF NOT EXISTS ArticuloCarrito (
    carrito_id INT NOT NULL,
    producto_id INT NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (carrito_id, producto_id),
    FOREIGN KEY (carrito_id) REFERENCES Carrito (id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES Producto (id) ON DELETE CASCADE
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS Pedido (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    order_status VARCHAR(50) DEFAULT 'creado', -- Estado del pedido (creado, pagado, enviado, etc.)
    shipping_address TEXT NOT NULL, -- Dirección de envío
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES Cliente (id) ON DELETE CASCADE
);

-- Tabla de Detalles de Pedido (Productos dentro del pedido)
CREATE TABLE IF NOT EXISTS DetallePedido (
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (pedido_id, producto_id),
    FOREIGN KEY (pedido_id) REFERENCES Pedido (id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES Producto (id) ON DELETE CASCADE
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS Pago (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method VARCHAR(100) NOT NULL, -- Método de pago (Webpay, Mercado Pago, etc.)
    payment_status VARCHAR(50) NOT NULL, -- Estado del pago (aprobado, rechazado, pendiente)
    transaction_id VARCHAR(100) NOT NULL, -- ID de transacción
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Pedido (id) ON DELETE CASCADE
);

-- Tabla de Interacciones con el Chatbot
CREATE TABLE IF NOT EXISTS InteraccionChatbot (
    interaction_id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES Cliente (id) ON DELETE CASCADE
);

-- Tabla de Documentos de Respuestas del Chatbot
CREATE TABLE IF NOT EXISTS DocumentoChatbot (
    document_id SERIAL PRIMARY KEY,
    file VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Métricas (Panel Administrativo)
CREATE TABLE IF NOT EXISTS Metricas (
    metric_id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_administrador_email ON Administrador (email);
CREATE INDEX IF NOT EXISTS idx_cliente_email ON Cliente (email);
CREATE INDEX IF NOT EXISTS idx_direccion_cliente ON Direccion (cliente_id);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON Producto (category_id);
CREATE INDEX IF NOT EXISTS idx_producto_administrador ON Producto (created_by);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON Pedido (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pago_pedido ON Pago (order_id);
CREATE INDEX IF NOT EXISTS idx_interaccion_cliente ON InteraccionChatbot (cliente_id);

-- Función para actualizar el estado del producto basado en el stock
CREATE OR REPLACE FUNCTION actualizar_estado_producto()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el stock es 0 o menos y actualizar el estado
    IF NEW.stock_quantity <= 0 THEN
        NEW.status = 'No disponible';
    ELSIF NEW.stock_quantity > 0 AND OLD.status = 'No disponible' THEN
        -- Si el stock vuelve a ser positivo y estaba como "No disponible", reactivarlo
        NEW.status = 'activo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta antes de actualizar o insertar un producto
CREATE OR REPLACE TRIGGER trigger_actualizar_estado_producto
    BEFORE INSERT OR UPDATE OF stock_quantity ON Producto
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estado_producto();