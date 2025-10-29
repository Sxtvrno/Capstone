import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductDetail from "../components/ProductDetail";
import RelatedProducts from "../components/RelatedProducts";
import TemplateNavbar from "../components/TemplateNavbar";
import { productAPI } from "../services/api";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener configuración visual desde localStorage (igual que LandingPage)
  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const headerColor = localStorage.getItem("headerColor") || "#111827";
  const logo = localStorage.getItem("logoPreview") || null;

  // Cargar producto e imágenes
  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      if (!id) {
        setError("No se encontró el producto");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Obtener todos los productos públicos y buscar el específico
        const allProducts = await productAPI.getPublicProducts({ limit: 1000 });
        const productData = allProducts.find(
          (p) => String(p.id) === String(id)
        );

        if (!productData) {
          throw new Error("Producto no encontrado");
        }

        if (isMounted) {
          setProduct(productData);
        }

        // Obtener imágenes del producto (sin autenticación)
        try {
          // Intentar con método público primero
          let images;
          try {
            images = await productAPI.getImagesPublic(id);
          } catch (publicError) {
            // Si no existe endpoint público específico, usar método normal sin token
            images = await productAPI.getImages(id);
          }

          if (isMounted) {
            if (Array.isArray(images) && images.length > 0) {
              const imageUrls = images
                .map((img) => img.url_imagen || img.url || img.urlImage)
                .filter(Boolean);
              setProductImages(imageUrls);
            } else {
              setProductImages([]);
            }
          }
        } catch (imgError) {
          console.error("Error loading product images:", imgError);
          if (isMounted) {
            setProductImages([]);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "No se pudo cargar el producto"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <TemplateNavbar
          storeName={storeName}
          logo={logo}
          headerColor={headerColor}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando producto...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <TemplateNavbar
          storeName={storeName}
          logo={logo}
          headerColor={headerColor}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <svg
              className="w-20 h-20 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Producto no encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "El producto que buscas no está disponible"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Volver
              </button>
              <button
                onClick={() => navigate("/")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Combinar datos del producto con las imágenes cargadas
  const productWithImages = {
    ...product,
    name: product.nombre || product.name || product.title,
    price: product.precio || product.price,
    description: product.descripcion || product.description,
    stock: product.stock_quantity || product.stock || product.cantidad || 0,
    category: product.categoria || product.category,
    images: productImages.length > 0 ? productImages : [],
  };

  // Obtener ID y nombre de la categoría
  const categoryId =
    product.categoria_id || product.categoryId || product.category_id;
  const categoryName =
    product.categoria_nombre ||
    product.category?.nombre ||
    product.category?.name ||
    product.category;

  return (
    <>
      <TemplateNavbar
        storeName={storeName}
        logo={logo}
        headerColor={headerColor}
      />
      <ProductDetail product={productWithImages} />

      {/* Productos relacionados */}
      {categoryId && (
        <RelatedProducts
          currentProductId={id}
          categoryId={categoryId}
          categoryName={categoryName}
        />
      )}
    </>
  );
};

export default ProductDetailPage;
