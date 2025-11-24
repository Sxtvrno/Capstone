SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET transaction_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config ('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';

--
-- Name: actualizar_estado_producto(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_estado_producto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$



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



$$;

ALTER FUNCTION public.actualizar_estado_producto() OWNER TO postgres;

--
-- Name: crear_carrito_por_cliente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.crear_carrito_por_cliente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO carrito (cliente_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.crear_carrito_por_cliente() OWNER TO postgres;

--
-- Name: eliminar_carrito_por_cliente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.eliminar_carrito_por_cliente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM carrito WHERE cliente_id = OLD.id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.eliminar_carrito_por_cliente() OWNER TO postgres;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  NEW.updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;

END;

$$;

ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

--
-- Name: update_daily_chatbot_metrics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_daily_chatbot_metrics() RETURNS void
    LANGUAGE plpgsql
    AS $$



BEGIN



    INSERT INTO chatbot_metrics (



        date,



        total_conversations,



        total_messages,



        escalated_to_human,



        top_intents



    )



    SELECT 



        CURRENT_DATE,



        COUNT(DISTINCT session_id),



        COUNT(*),



        COUNT(*) FILTER (WHERE intent = 'request_human'),



        jsonb_agg(DISTINCT intent)



    FROM chatbot_conversations



    WHERE DATE(timestamp) = CURRENT_DATE



    ON CONFLICT (date) DO UPDATE SET



        total_conversations = EXCLUDED.total_conversations,



        total_messages = EXCLUDED.total_messages,



        escalated_to_human = EXCLUDED.escalated_to_human,



        top_intents = EXCLUDED.top_intents;



END;



$$;

ALTER FUNCTION public.update_daily_chatbot_metrics() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administrador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.administrador (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    hash_pwd character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone
);

ALTER TABLE public.administrador OWNER TO postgres;

--
-- Name: administrador_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.administrador_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.administrador_id_seq OWNER TO postgres;

--
-- Name: administrador_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.administrador_id_seq OWNED BY public.administrador.id;

--
-- Name: articulocarrito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.articulocarrito (
    carrito_id integer NOT NULL,
    producto_id integer NOT NULL,
    quantity integer NOT NULL,
    total_price numeric(10, 2) NOT NULL
);

ALTER TABLE public.articulocarrito OWNER TO postgres;

--
-- Name: carrito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrito (
    id integer NOT NULL,
    cliente_id integer,
    session_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.carrito OWNER TO postgres;

--
-- Name: carrito_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carrito_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.carrito_id_seq OWNER TO postgres;

--
-- Name: carrito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carrito_id_seq OWNED BY public.carrito.id;

--
-- Name: categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true
);

ALTER TABLE public.categoria OWNER TO postgres;

--
-- Name: categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categoria_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.categoria_id_seq OWNER TO postgres;

--
-- Name: categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categoria_id_seq OWNED BY public.categoria.id;

--
-- Name: chatbot_conversaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chatbot_conversaciones (
    id integer NOT NULL,
    sender_id text,
    mensaje_usuario text NOT NULL,
    respuesta_bot text,
    intent text,
    confidence real,
    pedido_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.chatbot_conversaciones OWNER TO postgres;

--
-- Name: chatbot_conversaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chatbot_conversaciones_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.chatbot_conversaciones_id_seq OWNER TO postgres;

--
-- Name: chatbot_conversaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chatbot_conversaciones_id_seq OWNED BY public.chatbot_conversaciones.id;

--
-- Name: cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    hash_pwd character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    social_login_id character varying(255),
    verification_status character varying(50) DEFAULT 'pendiente'::character varying,
    password_reset_token character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.cliente OWNER TO postgres;

--
-- Name: cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cliente_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.cliente_id_seq OWNER TO postgres;

--
-- Name: cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cliente_id_seq OWNED BY public.cliente.id;

--
-- Name: detalle_pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_pedido (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10, 2) NOT NULL
);

ALTER TABLE public.detalle_pedido OWNER TO postgres;

--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_pedido_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.detalle_pedido_id_seq OWNER TO postgres;

--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_pedido_id_seq OWNED BY public.detalle_pedido.id;

--
-- Name: direccion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.direccion (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    comuna character varying(100) NOT NULL,
    region character varying(100) NOT NULL,
    calle character varying(255) NOT NULL,
    nro character varying(10) NOT NULL,
    lat double precision,
    lon double precision,
    is_default boolean DEFAULT false
);

ALTER TABLE public.direccion OWNER TO postgres;

--
-- Name: direccion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.direccion_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.direccion_id_seq OWNER TO postgres;

--
-- Name: direccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.direccion_id_seq OWNED BY public.direccion.id;

--
-- Name: documentochatbot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentochatbot (
    document_id integer NOT NULL,
    file character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.documentochatbot OWNER TO postgres;

--
-- Name: documentochatbot_document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documentochatbot_document_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.documentochatbot_document_id_seq OWNER TO postgres;

--
-- Name: documentochatbot_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documentochatbot_document_id_seq OWNED BY public.documentochatbot.document_id;

--
-- Name: interaccionchatbot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interaccionchatbot (
    interaction_id integer NOT NULL,
    cliente_id integer NOT NULL,
    message text NOT NULL,
    response text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.interaccionchatbot OWNER TO postgres;

--
-- Name: interaccionchatbot_interaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.interaccionchatbot_interaction_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.interaccionchatbot_interaction_id_seq OWNER TO postgres;

--
-- Name: interaccionchatbot_interaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.interaccionchatbot_interaction_id_seq OWNED BY public.interaccionchatbot.interaction_id;

--
-- Name: metricas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metricas (
    metric_id integer NOT NULL,
    metric_name character varying(255) NOT NULL,
    value numeric(10, 2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.metricas OWNER TO postgres;

--
-- Name: metricas_metric_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metricas_metric_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.metricas_metric_id_seq OWNER TO postgres;

--
-- Name: metricas_metric_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metricas_metric_id_seq OWNED BY public.metricas.metric_id;

--
-- Name: pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pago (
    payment_id integer NOT NULL,
    order_id integer NOT NULL,
    payment_method character varying(100) NOT NULL,
    payment_status character varying(50) NOT NULL,
    transaction_id character varying(100) NOT NULL,
    amount numeric(10, 2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    token_ws character varying(64),
    buy_order character varying(50),
    authorization_code character varying(50),
    payment_type_code character varying(10),
    response_code character varying(10),
    installments_number integer,
    card_last4 character varying(4),
    card_type character varying(20),
    commerce_code character varying(30),
    status_received character varying(30),
    refunded_amount numeric(10, 2) DEFAULT 0,
    reconciliation_status character varying(30),
    raw_response jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pago OWNER TO postgres;

--
-- Name: pago_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pago_payment_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pago_payment_id_seq OWNER TO postgres;

--
-- Name: pago_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pago_payment_id_seq OWNED BY public.pago.payment_id;

--
-- Name: pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedido (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    order_status character varying(50) DEFAULT 'creado'::character varying,
    shipping_address text NOT NULL,
    total_price numeric(10, 2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(10, 2),
    tax_total numeric(10, 2),
    discount_total numeric(10, 2),
    shipping_cost numeric(10, 2),
    currency character varying(10) DEFAULT 'CLP'::character varying,
    payment_id integer,
    shipping_status character varying(50) DEFAULT 'pendiente'::character varying,
    tracking_code character varying(100),
    notas text,
    canceled_at timestamp without time zone,
    user_ip character varying(45),
    user_agent character varying(255)
);

ALTER TABLE public.pedido OWNER TO postgres;

--
-- Name: pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pedido_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pedido_id_seq OWNER TO postgres;

--
-- Name: pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pedido_id_seq OWNED BY public.pedido.id;

--
-- Name: preguntas_frecuentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.preguntas_frecuentes (
    id integer NOT NULL,
    categoria character varying(100),
    pregunta text NOT NULL,
    respuesta text NOT NULL,
    palabras_clave text,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.preguntas_frecuentes OWNER TO postgres;

--
-- Name: TABLE preguntas_frecuentes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.preguntas_frecuentes IS 'Preguntas frecuentes que responde el chatbot';

--
-- Name: preguntas_frecuentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.preguntas_frecuentes_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.preguntas_frecuentes_id_seq OWNER TO postgres;

--
-- Name: preguntas_frecuentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.preguntas_frecuentes_id_seq OWNED BY public.preguntas_frecuentes.id;

--
-- Name: producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto (
    id integer NOT NULL,
    sku character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    price numeric(10, 2) NOT NULL,
    stock_quantity integer NOT NULL,
    category_id integer NOT NULL,
    status character varying(50) DEFAULT 'activo'::character varying,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.producto OWNER TO postgres;

--
-- Name: producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.producto_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.producto_id_seq OWNER TO postgres;

--
-- Name: producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.producto_id_seq OWNED BY public.producto.id;

--
-- Name: productoimagen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productoimagen (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    url_imagen character varying(255) NOT NULL,
    is_primary boolean DEFAULT false,
    orden integer DEFAULT 0
);

ALTER TABLE public.productoimagen OWNER TO postgres;

--
-- Name: productoimagen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productoimagen_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.productoimagen_id_seq OWNER TO postgres;

--
-- Name: productoimagen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productoimagen_id_seq OWNED BY public.productoimagen.id;

--
-- Name: store_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_config (
    id integer NOT NULL,
    store_name character varying(255) DEFAULT 'Mi Tienda'::character varying NOT NULL,
    logo_url text,
    header_color character varying(20) DEFAULT '#111827'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.store_config OWNER TO postgres;

--
-- Name: store_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_config_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.store_config_id_seq OWNER TO postgres;

--
-- Name: store_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_config_id_seq OWNED BY public.store_config.id;

--
-- Name: tickets_soporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets_soporte (
    id integer NOT NULL,
    usuario_id integer,
    conversacion text,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion timestamp without time zone,
    notas text
);

ALTER TABLE public.tickets_soporte OWNER TO postgres;

--
-- Name: TABLE tickets_soporte; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tickets_soporte IS 'Tickets cuando el usuario pide ayuda humana';

--
-- Name: tickets_soporte_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_soporte_id_seq AS integer START
WITH
    1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.tickets_soporte_id_seq OWNER TO postgres;

--
-- Name: tickets_soporte_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_soporte_id_seq OWNED BY public.tickets_soporte.id;

--
-- Name: administrador id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrador
ALTER COLUMN id
SET DEFAULT nextval(
    'public.administrador_id_seq'::regclass
);

--
-- Name: carrito id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
ALTER COLUMN id
SET DEFAULT nextval(
    'public.carrito_id_seq'::regclass
);

--
-- Name: categoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
ALTER COLUMN id
SET DEFAULT nextval(
    'public.categoria_id_seq'::regclass
);

--
-- Name: chatbot_conversaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_conversaciones
ALTER COLUMN id
SET DEFAULT nextval(
    'public.chatbot_conversaciones_id_seq'::regclass
);

--
-- Name: cliente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
ALTER COLUMN id
SET DEFAULT nextval(
    'public.cliente_id_seq'::regclass
);

--
-- Name: detalle_pedido id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
ALTER COLUMN id
SET DEFAULT nextval(
    'public.detalle_pedido_id_seq'::regclass
);

--
-- Name: direccion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direccion
ALTER COLUMN id
SET DEFAULT nextval(
    'public.direccion_id_seq'::regclass
);

--
-- Name: documentochatbot document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentochatbot
ALTER COLUMN document_id
SET DEFAULT nextval(
    'public.documentochatbot_document_id_seq'::regclass
);

--
-- Name: interaccionchatbot interaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interaccionchatbot
ALTER COLUMN interaction_id
SET DEFAULT nextval(
    'public.interaccionchatbot_interaction_id_seq'::regclass
);

--
-- Name: metricas metric_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metricas
ALTER COLUMN metric_id
SET DEFAULT nextval(
    'public.metricas_metric_id_seq'::regclass
);

--
-- Name: pago payment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
ALTER COLUMN payment_id
SET DEFAULT nextval(
    'public.pago_payment_id_seq'::regclass
);

--
-- Name: pedido id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
ALTER COLUMN id
SET DEFAULT nextval(
    'public.pedido_id_seq'::regclass
);

--
-- Name: preguntas_frecuentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preguntas_frecuentes
ALTER COLUMN id
SET DEFAULT nextval(
    'public.preguntas_frecuentes_id_seq'::regclass
);

--
-- Name: producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
ALTER COLUMN id
SET DEFAULT nextval(
    'public.producto_id_seq'::regclass
);

--
-- Name: productoimagen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productoimagen
ALTER COLUMN id
SET DEFAULT nextval(
    'public.productoimagen_id_seq'::regclass
);

--
-- Name: store_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_config
ALTER COLUMN id
SET DEFAULT nextval(
    'public.store_config_id_seq'::regclass
);

--
-- Name: tickets_soporte id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets_soporte
ALTER COLUMN id
SET DEFAULT nextval(
    'public.tickets_soporte_id_seq'::regclass
);

--
-- Name: administrador administrador_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrador
ADD CONSTRAINT administrador_email_key UNIQUE (email);

--
-- Name: administrador administrador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrador
ADD CONSTRAINT administrador_pkey PRIMARY KEY (id);

--
-- Name: articulocarrito articulocarrito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulocarrito
ADD CONSTRAINT articulocarrito_pkey PRIMARY KEY (carrito_id, producto_id);

--
-- Name: carrito carrito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
ADD CONSTRAINT carrito_pkey PRIMARY KEY (id);

--
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);

--
-- Name: chatbot_conversaciones chatbot_conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_conversaciones
ADD CONSTRAINT chatbot_conversaciones_pkey PRIMARY KEY (id);

--
-- Name: cliente cliente_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
ADD CONSTRAINT cliente_email_key UNIQUE (email);

--
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);

--
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id);

--
-- Name: detalle_pedido detalle_pedido_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
ADD CONSTRAINT detalle_pedido_unique UNIQUE (pedido_id, producto_id);

--
-- Name: direccion direccion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direccion
ADD CONSTRAINT direccion_pkey PRIMARY KEY (id);

--
-- Name: documentochatbot documentochatbot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentochatbot
ADD CONSTRAINT documentochatbot_pkey PRIMARY KEY (document_id);

--
-- Name: interaccionchatbot interaccionchatbot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interaccionchatbot
ADD CONSTRAINT interaccionchatbot_pkey PRIMARY KEY (interaction_id);

--
-- Name: metricas metricas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metricas
ADD CONSTRAINT metricas_pkey PRIMARY KEY (metric_id);

--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
ADD CONSTRAINT pago_pkey PRIMARY KEY (payment_id);

--
-- Name: pedido pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
ADD CONSTRAINT pedido_pkey PRIMARY KEY (id);

--
-- Name: preguntas_frecuentes preguntas_frecuentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preguntas_frecuentes
ADD CONSTRAINT preguntas_frecuentes_pkey PRIMARY KEY (id);

--
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
ADD CONSTRAINT producto_pkey PRIMARY KEY (id);

--
-- Name: producto producto_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
ADD CONSTRAINT producto_sku_key UNIQUE (sku);

--
-- Name: productoimagen productoimagen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productoimagen
ADD CONSTRAINT productoimagen_pkey PRIMARY KEY (id);

--
-- Name: store_config store_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_config
ADD CONSTRAINT store_config_pkey PRIMARY KEY (id);

--
-- Name: tickets_soporte tickets_soporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets_soporte
ADD CONSTRAINT tickets_soporte_pkey PRIMARY KEY (id);

--
-- Name: idx_administrador_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_administrador_email ON public.administrador USING btree (email);

--
-- Name: idx_cliente_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cliente_email ON public.cliente USING btree (email);

--
-- Name: idx_direccion_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_direccion_cliente ON public.direccion USING btree (cliente_id);

--
-- Name: idx_interaccion_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interaccion_cliente ON public.interaccionchatbot USING btree (cliente_id);

--
-- Name: idx_pago_buy_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pago_buy_order ON public.pago USING btree (buy_order);

--
-- Name: idx_pago_pedido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pago_pedido ON public.pago USING btree (order_id);

--
-- Name: idx_pago_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pago_token ON public.pago USING btree (token_ws);

--
-- Name: idx_pedido_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pedido_cliente ON public.pedido USING btree (cliente_id);

--
-- Name: idx_preguntas_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preguntas_activo ON public.preguntas_frecuentes USING btree (activo);

--
-- Name: idx_preguntas_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preguntas_categoria ON public.preguntas_frecuentes USING btree (categoria);

--
-- Name: idx_producto_administrador; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_administrador ON public.producto USING btree (created_by);

--
-- Name: idx_producto_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_categoria ON public.producto USING btree (category_id);

--
-- Name: idx_tickets_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_estado ON public.tickets_soporte USING btree (estado);

--
-- Name: idx_tickets_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_usuario ON public.tickets_soporte USING btree (usuario_id);

--
-- Name: ux_carrito_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_carrito_cliente ON public.carrito USING btree (cliente_id);

--
-- Name: pago pago_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pago_touch BEFORE UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

--
-- Name: pedido pedido_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pedido_touch BEFORE UPDATE ON public.pedido FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

--
-- Name: cliente trg_cliente_delete_carrito; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cliente_delete_carrito AFTER DELETE ON public.cliente FOR EACH ROW EXECUTE FUNCTION public.eliminar_carrito_por_cliente();

--
-- Name: cliente trg_cliente_insert_carrito; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cliente_insert_carrito AFTER INSERT ON public.cliente FOR EACH ROW EXECUTE FUNCTION public.crear_carrito_por_cliente();

--
-- Name: producto trigger_actualizar_estado_producto; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_estado_producto BEFORE INSERT OR UPDATE OF stock_quantity ON public.producto FOR EACH ROW EXECUTE FUNCTION public.actualizar_estado_producto();

--
-- Name: articulocarrito articulocarrito_carrito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulocarrito
ADD CONSTRAINT articulocarrito_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carrito (id) ON DELETE CASCADE;

--
-- Name: articulocarrito articulocarrito_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulocarrito
ADD CONSTRAINT articulocarrito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto (id) ON DELETE CASCADE;

--
-- Name: carrito carrito_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
ADD CONSTRAINT carrito_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente (id) ON DELETE CASCADE;

--
-- Name: detalle_pedido detalle_pedido_pedido_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido
ADD CONSTRAINT detalle_pedido_pedido_fk FOREIGN KEY (pedido_id) REFERENCES public.pedido (id);

--
-- Name: direccion direccion_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direccion
ADD CONSTRAINT direccion_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente (id) ON DELETE CASCADE;

--
-- Name: interaccionchatbot interaccionchatbot_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interaccionchatbot
ADD CONSTRAINT interaccionchatbot_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente (id) ON DELETE CASCADE;

--
-- Name: pago pago_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
ADD CONSTRAINT pago_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pedido (id) ON DELETE CASCADE;

--
-- Name: pedido pedido_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedido
ADD CONSTRAINT pedido_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente (id) ON DELETE CASCADE;

--
-- Name: producto producto_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
ADD CONSTRAINT producto_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categoria (id) ON DELETE CASCADE;

--
-- Name: producto producto_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
ADD CONSTRAINT producto_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.administrador (id) ON DELETE SET NULL;

--
-- Name: productoimagen productoimagen_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productoimagen
ADD CONSTRAINT productoimagen_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto (id) ON DELETE CASCADE;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;

GRANT ALL ON SCHEMA public TO PUBLIC;