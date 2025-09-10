-- Insertar categorías de productos
INSERT INTO
    Categoria (name)
VALUES ('Electrónicos'),
    ('Ropa'),
    ('Hogar'),
    ('Deportes'),
    ('Libros'),
    ('Juguetes'),
    ('Belleza'),
    ('Alimentos');

-- Insertar usuarios
INSERT INTO
    Usuario (
        email,
        hash_pwd,
        first_name,
        last_name,
        phone,
        address,
        verification_status
    )
VALUES (
        'juan.perez@email.com',
        '$2b$10$examplehash1234567890abcd',
        'Juan',
        'Pérez',
        '+56912345678',
        'Av. Principal 123, Santiago',
        'verificado'
    ),
    (
        'maria.gonzalez@email.com',
        '$2b$10$examplehash1234567890efgh',
        'María',
        'González',
        '+56987654321',
        'Calle Secundaria 456, Valparaíso',
        'verificado'
    ),
    (
        'carlos.lopez@email.com',
        '$2b$10$examplehash1234567890ijkl',
        'Carlos',
        'López',
        '+56955556666',
        'Pasaje 789, Concepción',
        'pendiente'
    ),
    (
        'ana.rodriguez@email.com',
        '$2b$10$examplehash1234567890mnop',
        'Ana',
        'Rodríguez',
        '+56944443333',
        'Plaza Central 321, Viña del Mar',
        'verificado'
    );

-- Insertar direcciones
INSERT INTO
    Direccion (
        usuario_id,
        comuna,
        region,
        calle,
        nro,
        lat,
        lon
    )
VALUES (
        1,
        'Santiago',
        'Región Metropolitana',
        'Av. Principal',
        '123',
        -33.4489,
        -70.6693
    ),
    (
        1,
        'Providencia',
        'Región Metropolitana',
        'Av. Nueva Providencia',
        '456',
        -33.4314,
        -70.6100
    ),
    (
        2,
        'Valparaíso',
        'Región de Valparaíso',
        'Calle Secundaria',
        '456',
        -33.0458,
        -71.6197
    ),
    (
        3,
        'Concepción',
        'Región del Biobío',
        'Pasaje',
        '789',
        -36.8269,
        -73.0498
    );

-- Insertar productos
INSERT INTO
    Producto (
        sku,
        title,
        description,
        price,
        stock_quantity,
        category_id,
        status
    )
VALUES (
        'SKU001',
        'Smartphone XYZ',
        'Teléfono inteligente de última generación con 128GB de almacenamiento',
        299990,
        50,
        1,
        'activo'
    ),
    (
        'SKU002',
        'Laptop ABC',
        'Laptop ultradelgada con procesador i7 y 16GB RAM',
        799990,
        25,
        1,
        'activo'
    ),
    (
        'SKU003',
        'Camiseta Algodón',
        'Camiseta 100% algodón de alta calidad',
        14990,
        100,
        2,
        'activo'
    ),
    (
        'SKU004',
        'Zapatillas Deportivas',
        'Zapatillas para running con amortiguación',
        89990,
        75,
        4,
        'activo'
    ),
    (
        'SKU005',
        'Set de Cocina',
        'Juego de ollas y sartenes antiadherentes',
        129990,
        30,
        3,
        'activo'
    ),
    (
        'SKU006',
        'Novela Best Seller',
        'La novela más vendida del año',
        19990,
        200,
        5,
        'activo'
    ),
    (
        'SKU007',
        'Juego de Mesa Familiar',
        'Juego de mesa para toda la familia',
        39990,
        40,
        6,
        'activo'
    ),
    (
        'SKU008',
        'Crema Hidratante',
        'Crema facial hidratante con protección UV',
        24990,
        60,
        7,
        'activo'
    );

-- Insertar imágenes de productos
INSERT INTO
    ProductoImagen (producto_id, url_imagen)
VALUES (
        1,
        'https://example.com/images/smartphone-xyz-1.jpg'
    ),
    (
        1,
        'https://example.com/images/smartphone-xyz-2.jpg'
    ),
    (
        2,
        'https://example.com/images/laptop-abc-1.jpg'
    ),
    (
        3,
        'https://example.com/images/camiseta-algodon-1.jpg'
    ),
    (
        4,
        'https://example.com/images/zapatillas-deportivas-1.jpg'
    ),
    (
        5,
        'https://example.com/images/set-cocina-1.jpg'
    ),
    (
        6,
        'https://example.com/images/novela-bestseller-1.jpg'
    ),
    (
        7,
        'https://example.com/images/juego-mesa-1.jpg'
    ),
    (
        8,
        'https://example.com/images/crema-hidratante-1.jpg'
    );

-- Insertar carritos
INSERT INTO
    Carrito (usuario_id, session_id)
VALUES (1, NULL),
    (2, NULL),
    (NULL, 'session_anon_123456'),
    (NULL, 'session_anon_789012');

-- Insertar artículos en carritos
INSERT INTO
    ArticuloCarrito (
        carrito_id,
        producto_id,
        quantity,
        total_price
    )
VALUES (1, 1, 1, 299990),
    (1, 3, 2, 29980),
    (2, 2, 1, 799990),
    (2, 4, 1, 89990),
    (3, 5, 1, 129990),
    (3, 6, 3, 59970),
    (4, 7, 2, 79980);

-- Insertar pedidos
INSERT INTO
    Pedido (
        usuario_id,
        order_status,
        shipping_address,
        total_price
    )
VALUES (
        1,
        'pagado',
        'Av. Principal 123, Santiago, Región Metropolitana',
        329970
    ),
    (
        2,
        'enviado',
        'Calle Secundaria 456, Valparaíso, Región de Valparaíso',
        889980
    ),
    (
        1,
        'entregado',
        'Av. Nueva Providencia 456, Providencia, Región Metropolitana',
        19990
    );

-- Insertar detalles de pedido
INSERT INTO
    DetallePedido (
        pedido_id,
        producto_id,
        quantity,
        unit_price
    )
VALUES (1, 1, 1, 299990),
    (1, 3, 2, 14990),
    (2, 2, 1, 799990),
    (2, 4, 1, 89990),
    (3, 6, 1, 19990);

-- Insertar pagos
INSERT INTO
    Pago (
        order_id,
        payment_method,
        payment_status,
        transaction_id,
        amount
    )
VALUES (
        1,
        'Webpay',
        'aprobado',
        'TRX00123456',
        329970
    ),
    (
        2,
        'Webpay',
        'aprobado',
        'TRX00789101',
        889980
    ),
    (
        3,
        'Webpay',
        'aprobado',
        'TRX00234567',
        19990
    );

-- Insertar interacciones con chatbot
INSERT INTO
    InteraccionChatbot (user_id, message, response)
VALUES (
        1,
        'Hola, necesito ayuda con mi pedido',
        'Hola Juan, claro. ¿Cuál es el número de tu pedido?'
    ),
    (
        1,
        'El pedido número 1',
        'Tu pedido #1 está en estado "pagado" y será enviado pronto.'
    ),
    (
        2,
        'Cómo cambio mi dirección de envío?',
        'Puedes cambiar tu dirección en tu perfil, sección "Mis direcciones".'
    );

-- Insertar documentos del chatbot
INSERT INTO
    DocumentoChatbot (file)
VALUES ('faq_general.pdf'),
    ('politicas_envio.docx'),
    ('guia_tallas.pdf');

-- Insertar cupones
INSERT INTO
    Cupon (
        code,
        discount_amount,
        expiration_date
    )
VALUES (
        'DESCUENTO10',
        0.10,
        '2025-12-31'
    ),
    (
        'VERANO25',
        0.25,
        '2025-03-01'
    ),
    (
        'BIENVENIDA15',
        0.15,
        '2025-06-30'
    );

-- Insertar métricas
INSERT INTO
    Metricas (metric_name, value)
VALUES ('ventas_totales', 12399940),
    ('usuarios_activos', 1560),
    ('productos_vendidos', 89),
    ('ticket_promedio', 48997);