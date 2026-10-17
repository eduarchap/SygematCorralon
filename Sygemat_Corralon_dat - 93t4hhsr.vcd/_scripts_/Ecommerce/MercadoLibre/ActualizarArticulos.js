#include "(CurrentProject)/Ecommerce/MercadoLibre.js"

importClass("XMLHttpRequest");

var titulo           = theRoot.varToString("TIT");
var price            = parseFloat(theRoot.varToString("PRE"));
var stock            = parseFloat(theRoot.varToString("STK").replace(",", "."));
var id_mla           = theRoot.varToString("ID_MLA");
var codigoArticulo   = theRoot.varToString("ID_ART");
var modelo           = theRoot.varToString("MOD");
var marca            = theRoot.varToString("MAR");
var foto             = theRoot.varToString("FOT");
var id_ref           = theRoot.varToString("ID_REF");
var id_ref_limpio    = String(id_ref || "").replace(/^\s+|\s+$/g, "");
var id_art_limpio    = String(codigoArticulo || "").replace(/^\s+|\s+$/g, "");
var skuIntegracion   = id_ref_limpio !== "" ? id_ref_limpio : id_art_limpio;

var continuar = true;
var tokenRenovadoEnEsteRun = false;

function reintentarSiTokenInvalido(status) {
    if (status !== 401 || tokenRenovadoEnEsteRun) {
        return false;
    }

    tokenRenovadoEnEsteRun = true;
    refreshToken();
    return true;
}

var busArticulo = ConsultarProducto(id_mla);
if (busArticulo && busArticulo.ok === false && reintentarSiTokenInvalido(busArticulo.status)) {
    busArticulo = ConsultarProducto(id_mla);
}

var soldQuantity = 0;
var variations = [];

var articuloJson = null;
var catalog_listing = false;
var fullFillMent = "";
var tieneFlex = false;
var userProductIdsStock = [];
var ultimoErrorImagen = "";
var bloqueaTituloPorFamilyName = false;

function esArray(valor) {
    return Object.prototype.toString.call(valor) === "[object Array]";
}

function parsearJsonSeguro(texto) {
    if (typeof texto !== "string" || texto === "") {
        return null;
    }

    try {
        return JSON.parse(texto);
    } catch (e) {
        return null;
    }
}

function clonarObjeto(objeto) {
    return JSON.parse(JSON.stringify(objeto));
}

function obtenerCausas(errorJson) {
    if (!errorJson) {
        return [];
    }

    if (esArray(errorJson.cause)) {
        return errorJson.cause;
    }

    if (typeof errorJson.cause === "object" && errorJson.cause !== null) {
        return [errorJson.cause];
    }

    if (typeof errorJson.cause !== "undefined") {
        return [{
            code: errorJson.error || ("cause_" + String(errorJson.cause)),
            message: errorJson.message || String(errorJson.cause),
            references: []
        }];
    }

    if (errorJson.error || errorJson.message) {
        return [{
            code: errorJson.error || "unknown_error",
            message: errorJson.message || "sin_mensaje",
            references: []
        }];
    }

    return [];
}

function referenciaIncluye(causa, campo) {
    if (!causa || !esArray(causa.references)) {
        return false;
    }

    for (var i = 0; i < causa.references.length; i++) {
        var referencia = String(causa.references[i] || "");
        if (referencia.indexOf(campo) !== -1) {
            return true;
        }
    }

    return false;
}

function contieneNoModificable(causas, campo) {
    for (var i = 0; i < causas.length; i++) {
        var code = String(causas[i].code || "");

        if (code === "item." + campo + ".not_modifiable") {
            return true;
        }

        if (code === "item.field_not_updatable" && referenciaIncluye(causas[i], campo)) {
            return true;
        }

        if (referenciaIncluye(causas[i], campo) && (code.indexOf("not_modifiable") !== -1 || code.indexOf("not_updatable") !== -1)) {
            return true;
        }
    }

    return false;
}

function contieneVariacionesNoModificables(causas) {
    for (var i = 0; i < causas.length; i++) {
        var code = String(causas[i].code || "");

        if (code === "variations.not_updatable" || code === "item.variations.not_modifiable") {
            return true;
        }

        if (referenciaIncluye(causas[i], "variations") && (code.indexOf("not_modifiable") !== -1 || code.indexOf("not_updatable") !== -1)) {
            return true;
        }
    }

    return false;
}

function contieneErrorImagen(causas) {
    for (var i = 0; i < causas.length; i++) {
        var code = String(causas[i].code || "");
        if (code === "item.pictures.picture_not_found") {
            return true;
        }
        if (referenciaIncluye(causas[i], "item.pictures")) {
            return true;
        }
    }

    return false;
}

function contieneConflictoUserProduct(causas, errorJson) {
    if (errorJson) {
        var mensaje = String(errorJson.message || "");
        var detalle = String(errorJson.error || "");

        if (contieneTexto(mensaje, "Repeated user-product") || contieneTexto(mensaje, "Conflict id") || contieneTexto(detalle, "repeated")) {
            return true;
        }
    }

    for (var i = 0; i < causas.length; i++) {
        var code = String((causas[i] || {}).code || "");
        if (code === "item.user_product.repeated.conflict") {
            return true;
        }
    }

    return false;
}

function simplificarPayloadConflictoUserProduct(payload) {
    if (!payload) {
        return false;
    }

    var cambio = false;

    if (typeof payload.title !== "undefined") {
        delete payload.title;
        cambio = true;
    }

    if (typeof payload.attributes !== "undefined") {
        delete payload.attributes;
        cambio = true;
    }

    if (typeof payload.pictures !== "undefined") {
        delete payload.pictures;
        cambio = true;
    }

    if (esArray(payload.variations)) {
        for (var i = 0; i < payload.variations.length; i++) {
            if (typeof payload.variations[i].attributes !== "undefined") {
                delete payload.variations[i].attributes;
                cambio = true;
            }

            if (typeof payload.variations[i].picture_ids !== "undefined") {
                delete payload.variations[i].picture_ids;
                cambio = true;
            }
        }
    }

    return cambio;
}

function obtenerPictureIdsInvalidos(causas) {
    var invalidos = [];

    for (var i = 0; i < causas.length; i++) {
        var causa = causas[i] || {};
        var code = String(causa.code || "");
        var message = String(causa.message || "");

        if (code === "item.pictures.picture_not_found") {
            var match = message.match(/Picture id ([^\s\.]+) does not exist/i);
            if (match && match[1] && invalidos.indexOf(String(match[1])) === -1) {
                invalidos.push(String(match[1]));
            }
        }
    }

    return invalidos;
}

function quitarPictureIdDePayload(payload, pictureId) {
    if (!payload || !pictureId) {
        return false;
    }

    var idBuscado = String(pictureId).toUpperCase();
    var cambio = false;

    if (esArray(payload.pictures)) {
        for (var p = payload.pictures.length - 1; p >= 0; p--) {
            var pic = payload.pictures[p] || {};
            var picId = String(pic.id || "").toUpperCase();
            var picSource = String(pic.source || "").toUpperCase();

            if ((picId !== "" && picId === idBuscado) || (picSource !== "" && picSource.indexOf(idBuscado) !== -1)) {
                payload.pictures.splice(p, 1);
                cambio = true;
            }
        }
    }

    if (esArray(payload.variations)) {
        for (var v = 0; v < payload.variations.length; v++) {
            var picIds = payload.variations[v].picture_ids;
            if (esArray(picIds)) {
                for (var i = picIds.length - 1; i >= 0; i--) {
                    if (String(picIds[i] || "").toUpperCase() === idBuscado) {
                        picIds.splice(i, 1);
                        cambio = true;
                    }
                }
            }
        }
    }

    return cambio;
}

function quitarUrlsConPictureId(fotos, pictureId) {
    if (!esArray(fotos) || !pictureId) {
        return fotos;
    }

    var idBuscado = String(pictureId).toUpperCase();
    var limpias = [];

    for (var i = 0; i < fotos.length; i++) {
        var url = String(fotos[i] || "");
        if (url.toUpperCase().indexOf(idBuscado) === -1) {
            limpias.push(url);
        }
    }

    return limpias;
}

function resumirCausas(causas) {
    if (!causas || causas.length === 0) {
        return "sin detalle";
    }

    var resumen = [];
    for (var i = 0; i < causas.length; i++) {
        var causa = causas[i] || {};
        var code = causa.code || "sin_codigo";
        var refs = esArray(causa.references) ? causa.references.join(",") : "sin_referencia";
        var msg = causa.message || "sin_mensaje";
        resumen.push(code + " [" + refs + "]: " + msg);
    }

    return resumen.join(" | ");
}

function contieneTexto(base, texto) {
    return String(base || "").toLowerCase().indexOf(String(texto || "").toLowerCase()) !== -1;
}

function construirMensajeExito(itemId, cambiosRetry) {
    if (!esArray(cambiosRetry) || cambiosRetry.length === 0) {
        return "Publicacion actualizada correctamente (" + itemId + ").";
    }

    var cambiosUnicos = {};
    for (var i = 0; i < cambiosRetry.length; i++) {
        var cambio = String(cambiosRetry[i] || "");

        if (cambio.indexOf("pictures_invalid_removed:") === 0 || cambio === "pictures_not_modifiable") {
            cambiosUnicos.pictures = true;
        } else if (cambio.indexOf("user_product_conflict") === 0) {
            cambiosUnicos.user_product_conflict = true;
        } else {
            cambiosUnicos[cambio] = true;
        }
    }

    var campos = [];
    if (cambiosUnicos.price) {
        campos.push("precio");
    }
    if (cambiosUnicos.available_quantity) {
        campos.push("stock");
    }
    if (cambiosUnicos.pictures) {
        campos.push("fotos");
    }
    if (cambiosUnicos.attributes) {
        campos.push("atributos (SKU)");
    }
    if (cambiosUnicos.seller_custom_field) {
        campos.push("codigo de referencia del vendedor (seller_custom_field)");
    }
    if (cambiosUnicos.user_product_conflict) {
        campos.push("datos de producto (titulo/atributos/fotos)");
    }

    if (campos.length === 0) {
        return "Publicacion actualizada correctamente (" + itemId + ").";
    }

    return "Publicacion actualizada parcialmente (" + itemId + "). Mercado Libre no permitio modificar: " + campos.join(", ") + ".";
}

function construirMensajeConsultaFallida(statusCode, itemId) {
    if (statusCode === 401) {
        return "No se pudo obtener la publicacion " + itemId + " porque la sesion con Mercado Libre vencio. Reintenta nuevamente.";
    }

    if (statusCode === 404) {
        return "La publicacion " + itemId + " no existe o fue eliminada en Mercado Libre.";
    }

    if (statusCode === 429) {
        return "No se pudo obtener la publicacion " + itemId + " porque Mercado Libre recibio demasiadas solicitudes. Espera unos segundos y reintenta.";
    }

    if (statusCode >= 500) {
        return "No se pudo obtener la publicacion " + itemId + " porque Mercado Libre tiene un problema temporal. Reintenta en unos minutos.";
    }

    return "No se pudo obtener la publicacion " + itemId + " desde Mercado Libre (status " + statusCode + "). Intenta nuevamente.";
}

function construirMensajeUsuarioError(statusCode, errorJson, itemId) {
    var causas = obtenerCausas(errorJson);
    var mensajeApi = errorJson && errorJson.message ? String(errorJson.message) : "";

    if (statusCode === 401) {
        return "No se pudo actualizar porque la sesion con Mercado Libre vencio. Reintenta nuevamente.";
    }

    if (statusCode === 403) {
        return "Mercado Libre rechazo la actualizacion por permisos (403) en la publicacion " + itemId + ". Puede ser un token sin permisos suficientes, una publicacion de otra cuenta, o una restriccion de la categoria." + (mensajeApi !== "" ? " Detalle: " + mensajeApi : "");
    }

    if (statusCode === 429) {
        return "No se pudo actualizar porque Mercado Libre recibio demasiadas solicitudes. Espera unos segundos y reintenta.";
    }

    if (statusCode >= 500) {
        return "No se pudo actualizar porque Mercado Libre tiene un problema temporal. Reintenta en unos minutos.";
    }

    if (contieneTexto(mensajeApi, "status:closed") || contieneTexto(mensajeApi, "[status:closed")) {
        return "La publicacion " + itemId + " esta cerrada y no se puede editar. Debes republicarla y usar el nuevo item_id.";
    }

    if (contieneTexto(mensajeApi, "under_review")) {
        return "La publicacion " + itemId + " esta en revision y por ahora Mercado Libre no permite cambios.";
    }

    if (contieneTexto(mensajeApi, "has_bids:true")) {
        return "La publicacion " + itemId + " esta inactiva y tiene una oferta/puja activa. Mientras dure ese estado, Mercado Libre bloquea cualquier cambio (precio, stock, SKU, fotos, variantes). Reintenta mas tarde.";
    }

    var detalleApi = errorJson ? JSON.stringify(errorJson) : "";
    if (contieneTexto(mensajeApi, "family_name") || contieneTexto(detalleApi, "family_name") || contieneTexto(detalleApi, "cannot modify the title")) {
        return "Mercado Libre no permite cambiar el titulo en esta publicacion porque pertenece a una familia de catalogo.";
    }

    if (contieneConflictoUserProduct(causas, errorJson)) {
        return "Mercado Libre detecto conflicto de producto duplicado (User Product). Reintenta sin modificar titulo, atributos ni fotos.";
    }

    if (contieneErrorImagen(causas)) {
        return "No se pudo actualizar porque una o mas fotos no son validas o no existen en Mercado Libre. Revisa las URLs de imagen.";
    }

    var bloqueaPrecio = contieneNoModificable(causas, "price");
    var bloqueaStock = contieneNoModificable(causas, "available_quantity");

    if (bloqueaPrecio && bloqueaStock) {
        return "Mercado Libre no permite modificar precio ni stock para esta publicacion (segun su estado o reglas de catalogo).";
    }

    if (bloqueaPrecio) {
        return "Mercado Libre no permite modificar el precio para esta publicacion.";
    }

    if (bloqueaStock) {
        return "Mercado Libre no permite modificar el stock para esta publicacion.";
    }

    for (var i = 0; i < causas.length; i++) {
        var causa = causas[i] || {};
        var code = String(causa.code || "");

        if (code === "item.field_not_updatable") {
            var referencias = esArray(causa.references) ? causa.references.join(", ") : "campos";
            return "Mercado Libre no permite actualizar estos campos en esta publicacion: " + referencias + ".";
        }
    }

    if (statusCode === 400) {
        return "Mercado Libre rechazo la actualizacion por validaciones del item. Revisa los datos enviados.";
    }

    return "No se pudo actualizar la publicacion " + itemId + " en Mercado Libre.";
}
function extraerPictureIdDesdeFuente(url) {
    if (!url) {
        return null;
    }

    var match = String(url).match(/([0-9]+-[A-Z]{3}[0-9]+_[0-9]+)/i);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

function buscarPictureIdEnArticulo(url, pictures) {
    if (!esArray(pictures)) {
        return null;
    }

    var idDesdeUrl = extraerPictureIdDesdeFuente(url);

    for (var i = 0; i < pictures.length; i++) {
        var picture = pictures[i] || {};
        var pictureId = picture.id ? String(picture.id) : "";
        var pictureUrl = picture.url ? String(picture.url) : "";
        var pictureSecureUrl = picture.secure_url ? String(picture.secure_url) : "";

        if (pictureUrl === url || pictureSecureUrl === url) {
            return pictureId;
        }

        if (idDesdeUrl && pictureId.toUpperCase() === idDesdeUrl.toUpperCase()) {
            return pictureId;
        }
    }

    return null;
}

function subirImagenYObtenerId(url) {
    var xhrImg = new XMLHttpRequest();
    xhrImg.open("POST", "https://api.mercadolibre.com/pictures", false);
    xhrImg.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhrImg.setRequestHeader("Content-Type", "application/json");
    xhrImg.setRequestHeader("Accept", "application/json");

    xhrImg.send(JSON.stringify({ source: url }));

    while (xhrImg.readyState !== 4) {
        xhrImg.processEvents();
    }

    if (xhrImg.status === 200 || xhrImg.status === 201) {
        var response = parsearJsonSeguro(xhrImg.responseText);
        if (response && response.id) {
            return response.id;
        }

        ultimoErrorImagen = "No se pudo procesar la imagen: " + url + ". Verifica que el enlace sea publico y apunte directo a la foto.";
        return null;
    }

    if (reintentarSiTokenInvalido(xhrImg.status)) {
        return subirImagenYObtenerId(url);
    }

    var errorResp = parsearJsonSeguro(xhrImg.responseText);
    if (errorResp && errorResp.message) {
        ultimoErrorImagen = "No se pudo subir la imagen: " + url + ". Mercado Libre devolvio error al descargarla.";
    } else {
        ultimoErrorImagen = "No se pudo subir la imagen: " + url + ". Verifica que sea accesible sin login.";
    }

    return null;
}

function resolverPictureIds(fotosArray, picturesActuales) {
    var ids = [];

    for (var i = 0; i < fotosArray.length; i++) {
        var url = fotosArray[i];

        var idExistente = buscarPictureIdEnArticulo(url, picturesActuales);
        if (idExistente) {
            ids.push(idExistente);
            continue;
        }

        var nuevoId = subirImagenYObtenerId(url);
        if (!nuevoId) {
            return [];
        }

        ids.push(nuevoId);
    }

    return ids;
}

function quitarPrecio(payload) {
    if (payload && typeof payload.price !== "undefined") {
        delete payload.price;
    }

    if (payload && esArray(payload.variations)) {
        for (var i = 0; i < payload.variations.length; i++) {
            if (typeof payload.variations[i].price !== "undefined") {
                delete payload.variations[i].price;
            }
        }
    }
}

function quitarStock(payload) {
    if (payload && typeof payload.available_quantity !== "undefined") {
        delete payload.available_quantity;
    }

    if (payload && esArray(payload.variations)) {
        for (var i = 0; i < payload.variations.length; i++) {
            if (typeof payload.variations[i].available_quantity !== "undefined") {
                delete payload.variations[i].available_quantity;
            }
        }
    }
}

function quitarAtributos(payload) {
    if (payload && typeof payload.attributes !== "undefined") {
        delete payload.attributes;
    }
}

function quitarSellerCustomField(payload) {
    if (payload && typeof payload.seller_custom_field !== "undefined") {
        delete payload.seller_custom_field;
    }
}

function quitarFotosPayload(payload) {
    if (payload && typeof payload.pictures !== "undefined") {
        delete payload.pictures;
    }
}

function ejecutarPutItem(itemId, payload) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    var jsonData = JSON.stringify(payload);

    xhr.open("PUT", "https://api.mercadolibre.com/items/" + itemId);
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.send(jsonData);

    while (xhr.readyState !== 4) {
        xhr.processEvents();
    }

    return {
        status: xhr.status,
        errorCode: xhr.errorCode,
        responseText: xhr.responseText,
        requestBody: jsonData
    };
}

// ---------------------------------------------------------------------------
// Stock distribuido (convivencia Full/Flex, solo MLA y MLC).
// Un item con logistic_type "fulfillment" + tag "self_service_in" tiene dos
// stocks independientes por user product: meli_facility (Full, lo maneja ML,
// no editable) y selling_address (deposito propio / Flex, editable). El stock
// del deposito NO se actualiza con available_quantity en PUT /items: va por
// PUT /user-products/{id}/stock/type/selling_address con el header x-version
// que devuelve el GET /user-products/{id}/stock.
// Doc: https://developers.mercadolibre.com.ar/es_ar/convivencia-full-y-flex
// ---------------------------------------------------------------------------
function obtenerHeaderRespuesta(xhr, nombre) {
    var buscado = String(nombre).toLowerCase();

    try {
        var valor = xhr.getResponseHeader(nombre);
        if (valor !== null && typeof valor !== "undefined" && String(valor) !== "") {
            return String(valor).replace(/^\s+|\s+$/g, "");
        }
    } catch (e) {
    }

    try {
        var lineas = String(xhr.getAllResponseHeaders() || "").split(/\r?\n/);
        for (var i = 0; i < lineas.length; i++) {
            var separador = lineas[i].indexOf(":");
            if (separador > 0 && lineas[i].substring(0, separador).replace(/^\s+|\s+$/g, "").toLowerCase() === buscado) {
                return lineas[i].substring(separador + 1).replace(/^\s+|\s+$/g, "");
            }
        }
    } catch (e2) {
    }

    return "";
}

function consultarStockUserProduct(userProductId) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.mercadolibre.com/user-products/" + userProductId + "/stock");
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhr.setRequestHeader("Accept", "application/json");

    xhr.send();

    while (xhr.readyState !== 4) {
        xhr.processEvents();
    }

    return {
        status: xhr.status,
        errorCode: xhr.errorCode,
        responseText: xhr.responseText,
        version: obtenerHeaderRespuesta(xhr, "x-version")
    };
}

function ejecutarPutStockDeposito(userProductId, cantidad, version) {
    var xhr = new XMLHttpRequest();
    var jsonData = JSON.stringify({ quantity: cantidad });

    xhr.open("PUT", "https://api.mercadolibre.com/user-products/" + userProductId + "/stock/type/selling_address");
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("x-version", version);

    xhr.send(jsonData);

    while (xhr.readyState !== 4) {
        xhr.processEvents();
    }

    return {
        status: xhr.status,
        errorCode: xhr.errorCode,
        responseText: xhr.responseText,
        requestBody: jsonData
    };
}

function construirMensajeStockDeposito(statusCode, errorJson) {
    var detalle = errorJson ? JSON.stringify(errorJson) : "";

    if (statusCode === 401) {
        return "la sesion con Mercado Libre vencio. Reintenta nuevamente.";
    }

    if (statusCode === 429) {
        return "Mercado Libre recibio demasiadas solicitudes. Espera unos segundos y reintenta.";
    }

    if (statusCode >= 500) {
        return "Mercado Libre tiene un problema temporal. Reintenta en unos minutos.";
    }

    if (contieneTexto(detalle, "fulfillment only") || contieneTexto(detalle, "no items are associated")) {
        return "la publicacion esta solo en Full (sin Flex), y ese stock lo maneja Mercado Libre.";
    }

    if (contieneTexto(detalle, "without inventory id") || contieneTexto(detalle, "full inbound")) {
        return "Mercado Libre exige enviar mercaderia a Full al menos una vez antes de cargar stock en el deposito propio.";
    }

    if (contieneTexto(detalle, "single warehouse")) {
        return "la cuenta usa stock multi-origen (seller_warehouse), que todavia no esta soportado por esta integracion.";
    }

    if (contieneTexto(detalle, "x-version")) {
        return "Mercado Libre no recibio la version del stock (x-version).";
    }

    return "Mercado Libre rechazo la actualizacion (status " + statusCode + ").";
}

function actualizarStockDeposito(userProductId, cantidad) {
    // 409 = x-version desactualizado (otro proceso toco el stock entre el GET
    // y el PUT). Se vuelve a consultar la version y se reintenta una vez.
    for (var intento = 0; intento < 2; intento++) {
        var consulta = consultarStockUserProduct(userProductId);
        if (reintentarSiTokenInvalido(consulta.status)) {
            consulta = consultarStockUserProduct(userProductId);
        }

        if (consulta.status !== 200) {
            return {
                ok: false,
                status: consulta.status,
                mensaje: construirMensajeStockDeposito(consulta.status, parsearJsonSeguro(consulta.responseText)),
                detalle: { paso: "GET stock", status: consulta.status, response: parsearJsonSeguro(consulta.responseText) || consulta.responseText }
            };
        }

        if (consulta.version === "") {
            return {
                ok: false,
                status: 400,
                mensaje: "Mercado Libre no devolvio la version del stock (x-version).",
                detalle: { paso: "GET stock", response: parsearJsonSeguro(consulta.responseText) || consulta.responseText }
            };
        }

        var put = ejecutarPutStockDeposito(userProductId, cantidad, consulta.version);
        if (reintentarSiTokenInvalido(put.status)) {
            put = ejecutarPutStockDeposito(userProductId, cantidad, consulta.version);
        }

        if (put.status === 200 || put.status === 204) {
            return { ok: true, status: put.status };
        }

        if (put.status !== 409) {
            var errorPut = parsearJsonSeguro(put.responseText);
            return {
                ok: false,
                status: put.status,
                mensaje: construirMensajeStockDeposito(put.status, errorPut),
                detalle: { paso: "PUT selling_address", status: put.status, request: put.requestBody, response: errorPut || put.responseText }
            };
        }
    }

    return {
        ok: false,
        status: 409,
        mensaje: "el stock se estaba modificando al mismo tiempo desde otro lado. Reintenta en unos segundos.",
        detalle: { paso: "PUT selling_address", status: 409 }
    };
}

if (!busArticulo || busArticulo.ok === false) {
    var statusConsulta = busArticulo && typeof busArticulo.status !== "undefined" ? busArticulo.status : 0;
    var respuestaConsulta = busArticulo ? parsearJsonSeguro(busArticulo.responseText) : null;

    theRoot.setVar("MSJ", construirMensajeConsultaFallida(statusConsulta, id_mla));
    theRoot.setVar("DATA", JSON.stringify({ status: statusConsulta, response: respuestaConsulta || (busArticulo ? busArticulo.responseText : "") }));
    theRoot.setVar("STATUS", statusConsulta || 400);
    continuar = false;
}

if (continuar && busArticulo) {
    articuloJson = busArticulo;
    variations = esArray(articuloJson.variations) ? articuloJson.variations : [];
    soldQuantity = articuloJson.sold_quantity || 0;

    var statusArticulo = String(articuloJson.status || "");

    if (statusArticulo === "under_review") {
        theRoot.setVar("MSJ", "La publicacion " + id_mla + " esta en revision y Mercado Libre no permite cambios por ahora.");
        theRoot.setVar("DATA", JSON.stringify(articuloJson));
        theRoot.setVar("STATUS", 400);
        continuar = false;
    } else if (statusArticulo === "closed") {
        theRoot.setVar("MSJ", "La publicacion " + id_mla + " esta cerrada. Debes republicarla y usar el nuevo item_id para futuras actualizaciones.");
        theRoot.setVar("DATA", JSON.stringify(articuloJson));
        theRoot.setVar("STATUS", 400);
        continuar = false;
    }

    catalog_listing = articuloJson.catalog_listing === true;
    var familyNameActual = String(articuloJson.family_name || "").replace(/^\s+|\s+$/g, "");
    bloqueaTituloPorFamilyName = familyNameActual !== "";
    if (articuloJson.shipping && articuloJson.shipping.logistic_type) {
        fullFillMent = articuloJson.shipping.logistic_type;
    }

    if (articuloJson.shipping && esArray(articuloJson.shipping.tags)) {
        for (var st = 0; st < articuloJson.shipping.tags.length; st++) {
            if (articuloJson.shipping.tags[st] === "self_service_in") {
                tieneFlex = true;
                break;
            }
        }
    }

    // Sin variaciones el user product es el del item; con variaciones se toma
    // el de cada variacion que se actualiza (se completa en el loop de abajo).
    if (variations.length === 0 && articuloJson.user_product_id) {
        userProductIdsStock.push(String(articuloJson.user_product_id));
    }
}

var convivenciaFullFlex = fullFillMent === "fulfillment" && tieneFlex;

if (continuar) {
    var fotosArray = [];
    var fotosRaw = String(foto || "").split("|");
    for (var f = 0; f < fotosRaw.length; f++) {
        var limpia = String(fotosRaw[f] || "").replace(/^\s+|\s+$/g, "");
        if (limpia !== "") {
            fotosArray.push(limpia);
        }
    }

    var picture_ids = [];

    if (catalog_listing !== true && fotosArray.length > 0) {
        picture_ids = resolverPictureIds(fotosArray, articuloJson ? articuloJson.pictures : []);

        if (picture_ids.length !== fotosArray.length) {
            theRoot.setVar("MSJ", ultimoErrorImagen !== "" ? ultimoErrorImagen : "No se pudieron validar todas las imagenes de la publicacion " + id_mla + ".");
            theRoot.setVar("DATA", JSON.stringify({ pictures: fotosArray }));
            theRoot.setVar("STATUS", 400);
            continuar = false;
        }
    }

    if (continuar && esArray(variations) && variations.length > 0) {
        var nuevasVariaciones = [];

        for (var v = 0; v < variations.length; v++) {
            var variation = variations[v];
            var attrs = esArray(variation.attributes) ? variation.attributes : [];

            var sellerSkuAttr = null;
            for (var a = 0; a < attrs.length; a++) {
                if (attrs[a] && attrs[a].id === "SELLER_SKU") {
                    sellerSkuAttr = attrs[a];
                    break;
                }
            }

            var actualizarVariacion = (sellerSkuAttr && sellerSkuAttr.value_name === id_ref_limpio) || !sellerSkuAttr;

            if (actualizarVariacion) {
                var newAttrs = [];
                var skuActualizado = false;

                for (var b = 0; b < attrs.length; b++) {
                    var attr = attrs[b];
                    if (attr && attr.id === "SELLER_SKU") {
                        newAttrs.push({
                            id: "SELLER_SKU",
                            value_id: id_ref_limpio,
                            value_name: id_ref_limpio
                        });
                        skuActualizado = true;
                    } else {
                        newAttrs.push(attr);
                    }
                }

                if (!skuActualizado) {
                    newAttrs.push({
                        id: "SELLER_SKU",
                        value_name: id_ref_limpio
                    });
                }

                var updatedVariation = {
                    id: variation.id,
                    price: price,
                    attributes: newAttrs
                };

                if (catalog_listing !== true && picture_ids.length > 0) {
                    updatedVariation.picture_ids = picture_ids;
                }

                if (fullFillMent !== "fulfillment") {
                    updatedVariation.available_quantity = stock;
                }

                if (variation.user_product_id && userProductIdsStock.indexOf(String(variation.user_product_id)) === -1) {
                    userProductIdsStock.push(String(variation.user_product_id));
                }

                nuevasVariaciones.push(updatedVariation);
            } else {
                var newVariation = clonarObjeto(variation);
                delete newVariation.catalog_product_id;
                delete newVariation.picture_ids;

                if (fullFillMent === "fulfillment") {
                    delete newVariation.available_quantity;
                }

                newVariation.price = price;
                nuevasVariaciones.push(newVariation);
            }
        }

        variations = nuevasVariaciones;
    }

    if (continuar) {
        var data = {};

        if (esArray(variations) && variations.length > 0) {
            data.variations = variations;

            if (catalog_listing !== true) {
                var allPictureIds = {};
                for (var x = 0; x < variations.length; x++) {
                    var varPics = variations[x].picture_ids;
                    if (esArray(varPics)) {
                        for (var y = 0; y < varPics.length; y++) {
                            allPictureIds[varPics[y]] = true;
                        }
                    }
                }

                data.pictures = [];
                for (var picId in allPictureIds) {
                    if (allPictureIds.hasOwnProperty(picId)) {
                        data.pictures.push({ id: picId });
                    }
                }
            }
        } else {
            if (catalog_listing !== true && picture_ids.length > 0) {
                data.pictures = [];
                for (var p = 0; p < picture_ids.length; p++) {
                    data.pictures.push({ id: picture_ids[p] });
                }
            }

            data.price = price;

            if (fullFillMent !== "fulfillment") {
                data.available_quantity = stock;
            }
        }

        if (soldQuantity === 0 && catalog_listing !== true && !bloqueaTituloPorFamilyName) {
            data.title = titulo;
        }

        if (catalog_listing !== true && skuIntegracion !== "") {
            data.seller_custom_field = skuIntegracion;
        }

        if (catalog_listing !== true && (!variations || variations.length === 0) && id_ref_limpio !== "") {
            data.attributes = [
                {
                    id: "SELLER_SKU",
                    value_name: id_ref_limpio
                }
            ];
        }

        var payload = clonarObjeto(data);
        var resultado = ejecutarPutItem(id_mla, payload);

        if (reintentarSiTokenInvalido(resultado.status)) {
            resultado = ejecutarPutItem(id_mla, payload);
        }

        var intento = 0;
        var cambiosRetry = [];

        while (resultado.status === 400 && intento < 2) {
            var errJson = parsearJsonSeguro(resultado.responseText);
            var causas = obtenerCausas(errJson);

            if (contieneVariacionesNoModificables(causas) && esArray(payload.variations) && payload.variations.length > 0) {
                // El precio y el stock de este item viven dentro de "variations". Si ML
                // bloquea las variations enteras (tipico de item inactivo con puja/oferta
                // activa) no hay nada que reintentar: cualquier payload recortado seguiria
                // sin poder tocar precio ni stock.
                break;
            }

            var payloadRetry = clonarObjeto(payload);
            var cambioAplicado = false;

            if (contieneNoModificable(causas, "pictures")) {
                quitarFotosPayload(payloadRetry);
                cambioAplicado = true;
                cambiosRetry.push("pictures_not_modifiable");
            }

            if (contieneNoModificable(causas, "price")) {
                quitarPrecio(payloadRetry);
                cambioAplicado = true;
                cambiosRetry.push("price");
            }

            if (contieneNoModificable(causas, "available_quantity")) {
                quitarStock(payloadRetry);
                cambioAplicado = true;
                cambiosRetry.push("available_quantity");
            }

            if (contieneNoModificable(causas, "attributes")) {
                quitarAtributos(payloadRetry);
                cambioAplicado = true;
                cambiosRetry.push("attributes");
            }

            if (contieneNoModificable(causas, "seller_custom_field")) {
                quitarSellerCustomField(payloadRetry);
                cambioAplicado = true;
                cambiosRetry.push("seller_custom_field");
            }

            if (contieneConflictoUserProduct(causas, errJson)) {
                var simplificado = simplificarPayloadConflictoUserProduct(payloadRetry);
                if (simplificado) {
                    cambioAplicado = true;
                    cambiosRetry.push("user_product_conflict");
                }
            }

            if (contieneErrorImagen(causas) && catalog_listing !== true) {
                var pictureIdsInvalidos = obtenerPictureIdsInvalidos(causas);

                if (pictureIdsInvalidos.length > 0) {
                    var removidoDelPayload = false;

                    for (var pi = 0; pi < pictureIdsInvalidos.length; pi++) {
                        fotosArray = quitarUrlsConPictureId(fotosArray, pictureIdsInvalidos[pi]);
                        if (quitarPictureIdDePayload(payloadRetry, pictureIdsInvalidos[pi])) {
                            removidoDelPayload = true;
                        }
                    }

                    if (removidoDelPayload) {
                        cambioAplicado = true;
                        cambiosRetry.push("pictures_invalid_removed:" + pictureIdsInvalidos.join(","));
                    }
                }

                if (!cambioAplicado && fotosArray.length > 0) {
                    var repictureIds = resolverPictureIds(fotosArray, articuloJson ? articuloJson.pictures : []);
                    if (repictureIds.length === fotosArray.length) {
                        payloadRetry.pictures = [];
                        for (var rp = 0; rp < repictureIds.length; rp++) {
                            payloadRetry.pictures.push({ id: repictureIds[rp] });
                        }

                        if (esArray(payloadRetry.variations)) {
                            for (var rv = 0; rv < payloadRetry.variations.length; rv++) {
                                payloadRetry.variations[rv].picture_ids = repictureIds;
                            }
                        }

                        cambioAplicado = true;
                        cambiosRetry.push("pictures");
                    }
                }
            }

            if (!cambioAplicado) {
                break;
            }

            payload = payloadRetry;
            resultado = ejecutarPutItem(id_mla, payload);
            intento++;
        }

        if (resultado.errorCode === 0 && resultado.status === 200) {
            var okJson = parsearJsonSeguro(resultado.responseText);
            var itemActualizado = okJson && okJson.id ? okJson.id : id_mla;
            var msjOk = construirMensajeExito(itemActualizado, cambiosRetry);

            theRoot.setVar("MSJ", msjOk);
            theRoot.setVar("DATA", resultado.requestBody);
            theRoot.setVar("STATUS", resultado.status);
        } else {
            var errorJsonFinal = parsearJsonSeguro(resultado.responseText);
            var mensajeFinal = construirMensajeUsuarioError(resultado.status, errorJsonFinal, id_mla);
            var detalleTecnico = {
                status: resultado.status,
                request: parsearJsonSeguro(resultado.requestBody) || resultado.requestBody,
                response: errorJsonFinal || resultado.responseText,
                causes_resume: resumirCausas(obtenerCausas(errorJsonFinal))
            };

            theRoot.setVar("MSJ", mensajeFinal);
            theRoot.setVar("DATA", JSON.stringify(detalleTecnico));
            theRoot.setVar("STATUS", resultado.status);
        }

        var itemOk = resultado.errorCode === 0 && resultado.status === 200;

        if (convivenciaFullFlex) {
            // Se hace aunque el PUT /items haya fallado: el stock del deposito es
            // un recurso aparte y no depende de que se acepten precio/titulo/etc.
            var msjStock = "";
            var detalleStock = [];
            var falloStock = null;

            if (isNaN(stock)) {
                msjStock = "No se actualizo el stock del deposito porque el valor de stock no es valido.";
                falloStock = 400;
            } else if (userProductIdsStock.length === 0) {
                msjStock = "No se actualizo el stock del deposito porque Mercado Libre no informo el user_product_id de la publicacion.";
                falloStock = 400;
            } else {
                var cantidadDeposito = Math.max(0, Math.floor(stock));

                for (var up = 0; up < userProductIdsStock.length; up++) {
                    var resStock = actualizarStockDeposito(userProductIdsStock[up], cantidadDeposito);
                    detalleStock.push({ user_product_id: userProductIdsStock[up], quantity: cantidadDeposito, ok: resStock.ok, detalle: resStock.detalle || null });

                    if (!resStock.ok && falloStock === null) {
                        falloStock = resStock.status || 400;
                        msjStock = "No se pudo actualizar el stock del deposito: " + resStock.mensaje;
                    }
                }

                if (falloStock === null) {
                    msjStock = "Stock del deposito propio (Flex) actualizado a " + cantidadDeposito + " u. El stock en Full lo maneja Mercado Libre.";
                }
            }

            theRoot.setVar("MSJ", theRoot.varToString("MSJ") + " " + msjStock);
            theRoot.setVar("DATA", JSON.stringify({
                item: parsearJsonSeguro(theRoot.varToString("DATA")) || theRoot.varToString("DATA"),
                stock_deposito: detalleStock
            }));

            if (itemOk && falloStock !== null) {
                theRoot.setVar("STATUS", falloStock);
            }
        } else if (fullFillMent === "fulfillment" && itemOk) {
            theRoot.setVar("MSJ", theRoot.varToString("MSJ") + " El stock no se envio porque la publicacion esta solo en Full: ese stock lo maneja Mercado Libre y se repone enviando mercaderia a Full.");
        }
    }
}