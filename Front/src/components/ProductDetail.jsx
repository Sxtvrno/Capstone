import { useState } from "react";

const ProductDetail = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Producto no encontrado</p>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image || "https://via.placeholder.com/400"];

  // Verificar disponibilidad de stock (misma lógica que ProductGrid)
  const stock = product.stock_quantity ?? product.stock ?? 0;
  const isOutOfStock = stock <= 0;

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= stock) {
      setQuantity(newQuantity);
    }
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a
                href="/"
                className="text-gray-700 hover:text-blue-600 inline-flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Inicio
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2">
                  {product.name || product.nombre || product.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Product Detail Grid */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery / Carousel */}
            <div className="space-y-4">
              {/* Out of Stock Badge */}
              <div className="relative group">
                {isOutOfStock && (
                  <div className="absolute top-4 left-4 z-10 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                    AGOTADO
                  </div>
                )}

                {/* Main Image with Carousel Controls */}
                <div
                  className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden ${
                    isOutOfStock ? "opacity-60" : ""
                  }`}
                >
                  <img
                    src={images[selectedImage]}
                    alt={product.name || product.nombre || product.title}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />

                  {/* Carousel Controls - Solo si hay más de una imagen */}
                  {images.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Imagen anterior"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Imagen siguiente"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>

                      {/* Dots Indicator */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`transition-all duration-200 rounded-full ${
                              selectedImage === index
                                ? "w-8 h-2 bg-white"
                                : "w-2 h-2 bg-white/50 hover:bg-white/75"
                            }`}
                            aria-label={`Ir a imagen ${index + 1}`}
                          />
                        ))}
                      </div>

                      {/* Image Counter */}
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {selectedImage + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index
                          ? "border-blue-500 ring-2 ring-blue-200 scale-105"
                          : "border-gray-200 hover:border-gray-300 hover:scale-105"
                      } ${isOutOfStock ? "opacity-60" : ""}`}
                    >
                      <img
                        src={img}
                        alt={`${
                          product.name || product.nombre || product.title
                        } ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name || product.nombre || product.title}
                </h1>
                {product.category && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
                {/* SKU */}
                {product.sku && (
                  <p className="text-sm text-gray-500 mt-2">
                    SKU: {product.sku}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-bold text-gray-900">
                  $
                  {Number(product.price ?? product.precio ?? 0).toLocaleString(
                    "es-CL"
                  )}
                </span>
                {product.originalPrice && (
                  <span className="text-2xl text-gray-500 line-through">
                    ${Number(product.originalPrice).toLocaleString("es-CL")}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="border-t border-b border-gray-200 py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Descripción
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {product.description ||
                    product.descripcion ||
                    "Sin descripción disponible"}
                </p>
              </div>

              {/* Stock Status */}
              <div className="flex items-center space-x-2">
                {isOutOfStock ? (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-bold text-lg">
                      Producto Agotado
                    </span>
                  </>
                ) : stock <= 5 ? (
                  <>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-700 font-medium">
                      ¡Últimas {stock} unidades disponibles!
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">
                      En stock ({stock} {stock === 1 ? "unidad" : "unidades"}{" "}
                      disponibles)
                    </span>
                  </>
                )}
              </div>

              {/* Status Badge */}
              {product.status && (
                <div className="inline-flex items-center">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      product.status === "activo"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.status === "activo"
                      ? "Disponible"
                      : "No disponible"}
                  </span>
                </div>
              )}

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700 font-medium">Cantidad:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <span className="px-6 py-2 font-medium text-gray-900 border-x border-gray-300">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= stock}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {quantity >= stock && stock > 1 && (
                    <span className="text-sm text-gray-500">
                      (Máximo disponible)
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {isOutOfStock ? (
                  <div className="w-full bg-gray-300 text-gray-600 py-4 px-6 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center space-x-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span>Producto no disponible</span>
                  </div>
                ) : (
                  <button className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span>Agregar al carrito</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
