importClass("XMLHttpRequest");

var token = theRoot.varToString("TKN");
var get_pag = theRoot.varToBool("GET_PAG");
var get_id = theRoot.varToString("GET_ID");
var xhr = new XMLHttpRequest();
xhr.withCredentials = true;



if (get_pag == 0) {
  xhr.open(
    "GET",
    "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10"
  );
  xhr.setRequestHeader("Authorization", "Bearer " + token);
} else {
  xhr.open("GET", "https://api.mercadopago.com/v1/payments/" + get_id + "");
  xhr.setRequestHeader("Authorization", "Bearer " + token);
}

xhr.send();
//alert(xhr.errorCode);
//alert(xhr.status);

while (xhr.readyState != 4) {
  xhr.processEvents();
}

if (xhr.errorCode == 0 && xhr.status == 200) {
  var oJson = JSON.parse(xhr.responseText);

	if(get_pag == 0){
	  // Filtrar pagos excluyendo los que tienen "order.type" igual a "mercadolibre"
	  var filteredPayments = oJson.results.filter(function (payment) {
		return !payment.order || payment.order.type !== "mercadolibre";
	  });

	  // Actualizar el JSON con los pagos filtrados
	  oJson.results = filteredPayments;
	  
	  // Guardar el resultado filtrado en la variable "RET"
	  theRoot.setVar("RET", JSON.stringify(oJson));
	}
	else {
		theRoot.setVar("RET", JSON.stringify(oJson));
	}
  
} else {
  // Manejar errores
	theRoot.setVar("ERR_CON", "Error: " + xhr.status + " - " + xhr.errorCode);
	//alert("Error: " + xhr.status + " - " + xhr.errorCode);
  
}





