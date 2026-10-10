#include "(CurrentProject)/Ecommerce/MercadoLibre.js"
importClass("XMLHttpRequest");

//SI esperamos el webhook, geteamos el USERID Y RESOURCE ORDER
//var userId = theRoot.varToInt("USER_ID");
var orderId = theRoot.varToString("ORDER_ID");

// Función genérica para realizar una solicitud GET
function makeRequest(url, token) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true; // Permitir credenciales
    xhr.open("GET", url, false); // Solicitud sincrónica
    xhr.setRequestHeader("Authorization", "Bearer " + token); // Token en el header
    xhr.send();

    if (xhr.readyState === 4) {
        if (xhr.status === 200) {
            return JSON.parse(xhr.responseText); // Retorna el objeto parseado
        } else {
            return null; // Manejo de error
        }
    }
}

// Función para transformar additional_info
function transformAdditionalInfo(additionalInfo) {
    return additionalInfo.reduce((obj, item) => {
        obj[item.type] = item.value;
        return obj;
    }, {});
}

var token = theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK");

// Paso 1: Obtener el seller_id desde /users/me
var userData = makeRequest("https://api.mercadolibre.com/users/me", token);
var sellerId = userData.id; // Extraer el seller_id


// Paso 2: Obtener las órdenes del día del seller
var now = new Date();
now.setHours(now.getHours() - 3); // Restar 3 horas
var today = now.toISOString().split("T")[0]; // Obtener solo la parte YYYY-MM-DD

if((orderId !== "")){
	var ordersUrl = "https://api.mercadolibre.com/"+orderId
	var ArrayOrdenes = 0;
	}
else {
	var ArrayOrdenes = 1;
	var ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${sellerId}&order.status=paid&order.date_created.from=${today}T00:00:00.000-00:00&order.date_created.to=${today}T23:59:59.999-00:00&sort=date_desc&limit=50&offset=0`;
}



var ordersData = makeRequest(ordersUrl, token);

// Normalizar: si es una sola orden, convertirla en un array con un solo elemento
var ordersList = [];

if (ordersData) {
    if (ordersData.results) {
        // Es una búsqueda múltiple
        ordersList = ordersData.results;
    } else if (ordersData.id) {
        // Es una sola orden
        ordersList = [ordersData];
    }
}

// Paso 3: Enriquecer cada orden con billingInfo, shipments y atributos de artículos
ordersList.forEach((order) => {
    // Obtener billingInfo
    var billingUrl = `https://api.mercadolibre.com/orders/${order.id}/billing_info`;
    var billingData = makeRequest(billingUrl, token);

    if (billingData) {
        if (billingData.billing_info && billingData.billing_info.additional_info) {
            // Transformar additional_info
            billingData.billing_info = transformAdditionalInfo(billingData.billing_info.additional_info);
        }
        order.billing_info = billingData.billing_info || null; // Agregar billingInfo al objeto de la orden
    } else {
        order.billing_info = null; // En caso de error, asignar null
    }

    // Obtener información de shipments
    if (order.shipping && order.shipping.id) {
        var shipmentUrl = `https://api.mercadolibre.com/shipments/${order.shipping.id}`;
        var shipmentData = makeRequest(shipmentUrl, token);

        if (shipmentData) {
            order.shipping_info = {
                logistic_type: shipmentData.logistic_type || null, // Tipo de logística (FULL, etc.)
                status: shipmentData.status || null,             // Estado del envío
                mode: shipmentData.mode || null,                // Modo de envío (me2, custom, etc.)
				latitude: shipmentData.receiver_address ? shipmentData.receiver_address.latitude : null,  // Latitud
				longitude: shipmentData.receiver_address ? shipmentData.receiver_address.longitude : null // Longitud (corregido)
            };
        } else {
            order.shipping_info = null; // En caso de error, asignar null
        }
    } else {
        order.shipping_info = null; // Si no hay shipping ID, asignar null
    }

    // Obtener atributos de cada artículo en la orden
    // Obtener atributos de cada artículo en la orden
    order.order_items.forEach((item) => {
        var itemUrl = `https://api.mercadolibre.com/items/${item.item.id}`;
        var itemData = makeRequest(itemUrl, token);

        if (itemData && itemData.attributes) {
            // Filtrar solo el atributo con id "SALES_UNIT"
            var salesUnit = itemData.attributes.find(attr => attr.id === "SALES_UNIT");

            if (salesUnit) {
                item.sales_unit = salesUnit; // Guardar todo el objeto "SALES_UNIT"
            }
        }
    });
});

if((ArrayOrdenes == 0)){
var dataFinal = {
  results: [ordersData]
};
// Si lo necesitás como string JSON:
var dataFinalStr = JSON.stringify(dataFinal);
// Paso 4: Guardar los datos obtenidos en una variable
theRoot.setVar("DATA", dataFinalStr);
}
else {
	theRoot.setVar("DATA", JSON.stringify(ordersData));
}

