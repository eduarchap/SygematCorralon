importClass("XMLHttpRequest");

// ---------- Config ----------
var API_VERSION = theApp.globalVarToString("sygemat_corralon_dat/TN_API_VERSION");         // o "v1" según tienda/rollout
var STORE_ID    = theApp.globalVarToString("sygemat_corralon_dat/TN_STORE_ID");             // tu store id de Tienda Nube
var ACCESS_TOKEN= theApp.globalVarToString("sygemat_corralon_dat/TN_TOKEN");           // token OAuth de la tienda
var USER_AGENT  = theApp.globalVarToString("sygemat_corralon_dat/TN_USER");
var sku         = theRoot.varToString("ID_REF");
var id_tn       = theRoot.varToString("ID_TN");
var titulo      = theRoot.varToString("TIT");
var price = parseFloat(theRoot.varToString("PRE"));
var foto        = theRoot.varToString("FOT"); // URLs separadas por |
var stock       = parseFloat(theRoot.varToString("STK").replace(",", "."));



function tnRequest(method, path, bodyJson) {
  var url = "https://api.tiendanube.com/" + API_VERSION + "/" + STORE_ID + path;
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, false); // sincrónico para Velneo; en Node usá async/await
  xhr.setRequestHeader("Authentication", "bearer " + ACCESS_TOKEN);
  xhr.setRequestHeader("User-Agent", USER_AGENT);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(bodyJson ? JSON.stringify(bodyJson) : null);

  var status = xhr.status;
	alert(status);
  var txt = xhr.responseText || "";
  if (status >= 200 && status < 300) {
    return txt ? JSON.parse(txt) : {};
  } else {
    throw new Error("HTTP " + status + ": " + txt);
  }
}

// ---------- Utilidades ----------
function findProductBySKU(sku) {
  // Devuelve {product, variant} del primer match por SKU
  var p = tnRequest("GET", "/products/sku/" + encodeURIComponent(sku));
  var variant = null;
  if (p && p.variants && p.variants.length) {
    variant = p.variants.find(v => (v.sku || "") === sku) || p.variants[0];
  }
  return { product: p, variant: variant };
}

function updateProductFields(productId, fields) {
  // Para título, descripción, published, categorías, etc.
  // OJO: precio/stock van en variants (ver funciones debajo)
  return tnRequest("PUT", "/products/" + productId, fields);
}

function updateVariantPrice(productId, variantId, newPrice, promoPrice /*nullable*/) {
  // Actualiza precio de UNA variant (incluye virtual)
  var body = {
    id: variantId,
    price: newPrice,
  };
  if (promoPrice != null) body.promotional_price = String(promoPrice);
  return tnRequest("PUT", "/products/" + productId + "/variants/" + variantId, body);
}

function replaceVariantStock(productId, variantId, stockQty) {
  // Opción 1 (recomendada multi-inventory): enviar inventory_levels (reemplaza)
  var body = {
    id: sku,
    inventory_levels: [{ stock: Number(stockQty) }]
  };
  return tnRequest("PUT", "/products/" + productId + "/variants/" + variantId, body);
  // Opción 2 (legacy/rápida): POST /variants/stock con "replace"
  // return tnRequest("POST", "/products/" + productId + "/variants/stock", {
  //   operation: "replace",
  //   variants: [{ id: variantId, stock: Number(stockQty) }]
  // });
}

function addImage(productId, srcUrl, position /*opcional*/) {
  var body = { src: srcUrl };
  if (position) body.position = position;
  return tnRequest("POST", "/products/" + productId + "/images", body);
}

function listImages(productId) {
  return tnRequest("GET", "/products/" + productId + "/images");
}

function deleteImage(productId, imageId) {
  return tnRequest("DELETE", "/products/" + productId + "/images/" + imageId);
}

// ---------- Orquestador de "Upsert" ----------
/**
 * upsertItemTiendaNube({
 *   sku,                        // SKU a buscar (variant)
 *   title, description,         // campos de producto (opcional)
 *   price, promoPrice,          // precio (variant)
 *   stock,                      // stock (variant)
 *   imageUrls                   // array de URLs absolutas
 * })
 */
function upsertItemTiendaNube(cfg) {
  // 1) Buscar producto/variant por SKU
  var { product, variant } = findProductBySKU(cfg.sku);
  if (!product) throw new Error("No se encontró producto con SKU " + cfg.sku);

  // 2) Actualizar campos del producto (si vienen)
  var productPatch = {};
  if (cfg.title) {
    productPatch.name = { es: cfg.title }; // ajustá idiomas según tu tienda
  }
  if (cfg.description) {
    productPatch.description = { es: cfg.description };
  }
  if (Object.keys(productPatch).length) {
    updateProductFields(product.id, productPatch);
  }

  // 3) Actualizar precio (variant)
  if (cfg.price != null || cfg.promoPrice != null) {
    updateVariantPrice(product.id, variant.id, cfg.price ?? variant.price, cfg.promoPrice ?? null);
  }

  // 4) Actualizar stock (variant)
  if (cfg.stock != null) {
    replaceVariantStock(product.id, variant.id, cfg.stock);
  }

  // 5) Reemplazar imágenes si se envían
  /*if (Array.isArray(cfg.imageUrls) && cfg.imageUrls.length) {
    // Borrar todas las actuales (opcional: solo si querés reemplazar por completo)
    var current = listImages(product.id);
    (current || []).forEach(img => deleteImage(product.id, img.id));
    // Crear nuevas (máximo recomendado 9 en el POST de producto; acá no aplica ese límite)
    cfg.imageUrls.forEach((u, idx) => addImage(product.id, u, idx + 1));
  }*/

  // 6) Devolver estado final
  var refreshed = findProductBySKU(cfg.sku).product;
  return refreshed;
}

// ---------- Ejemplo de uso ----------
try {
  var result = upsertItemTiendaNube({
    sku:        sku,
    title:      titulo,
    price:      price,
    //promoPrice: 49999.99,         // opcional
    stock:    Math.round(stock),
    /*imageUrls: [
      "https://tu-cdn.com/imgs/sku-123-1.jpg",
      "https://tu-cdn.com/imgs/sku-123-2.jpg"
    ]*/
  });
  // En Velneo: theRoot.setVar("RESP_JSON", JSON.stringify(result));
  theRoot.setVar("MSJ", "Artículo modificado correctamente  " + id_tn);
  theRoot.setVar("STATUS", 200);
  theRoot.setVar("DATA", JSON.stringify(result));
} catch (e) {
  // En Velneo: theRoot.setVar("ERROR", e.message);
  theRoot.setVar("MSJ", e.message);
  // Buscar un número de 3 dígitos después de "HTTP "
  var match = String(e.message).match(/HTTP (\d{3})/);
  var code = match ? parseInt(match[1]) : 0;

  theRoot.setVar("STATUS", code);
  throw e;
}