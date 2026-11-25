#include "(CurrentProject)/Ecommerce/MercadoLibre.js"
importClass("XMLHttpRequest");
importClass("VFile");
importClass("FormData");

refreshToken();

var orderId = theRoot.varToString("ORDER_ID");
var token   = theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK");
var rutaPdf = theRoot.varToString("RUTA_PDF");

var continuar = true;
var fiscalId = "";

// 1. Verificar que el archivo exista
var archivo = new VFile(rutaPdf);
if (!archivo.exists()) {
    theRoot.setVar("RETORNO", "El archivo no existe en la ruta: " + rutaPdf);
    continuar = false;
}

// 2. Obtener info de la orden para determinar pack_id u order_id
if (continuar) {
    var xhrGet = new XMLHttpRequest();
    xhrGet.open("GET", "https://api.mercadolibre.com/orders/" + orderId, false);
    xhrGet.setRequestHeader("Authorization", "Bearer " + token);
    xhrGet.send();

    if (xhrGet.status !== 200) {
        theRoot.setVar("RETORNO", "Error al obtener orden: " + xhrGet.status + " - " + xhrGet.responseText);
        continuar = false;
    } else {
        var orden = JSON.parse(xhrGet.responseText);
        fiscalId = (orden.pack_id && orden.pack_id !== null) ? orden.pack_id : orderId;
    }
}

// 3. Verificar si ya hay una factura cargada
if (continuar) {
    var endpointCheck = "https://api.mercadolibre.com/packs/" + fiscalId + "/fiscal_documents";
    var xhrCheck = new XMLHttpRequest();
    xhrCheck.open("GET", endpointCheck, false);
    xhrCheck.setRequestHeader("Authorization", "Bearer " + token);
    xhrCheck.send();

    if (xhrCheck.status === 200) {
		var response = JSON.parse(xhrCheck.responseText);
        var docs = response.fiscal_documents;
        if (docs.length > 0) {
            theRoot.setVar("RETORNO", "Ya hay una factura cargada. No se vuelve a subir.");
            continuar = false;
        }
    }
}

// 4. Enviar la factura si no estaba previamente
if (continuar) {
    var formData = new FormData();
    formData.append("fiscal_document", archivo);

    var endpoint = "https://api.mercadolibre.com/packs/" + fiscalId + "/fiscal_documents";

    var xhrPost = new XMLHttpRequest();
    xhrPost.open("POST", endpoint, false);
    xhrPost.setRequestHeader("Authorization", "Bearer " + token);
    xhrPost.send(formData);

    if (xhrPost.status === 200 || xhrPost.status === 201) {
        theRoot.setVar("RETORNO", "Factura PDF adjuntada correctamente.");
    } else {
        theRoot.setVar("RETORNO", "Error al subir factura: " + xhrPost.status + " - " + xhrPost.responseText);
    }
}
