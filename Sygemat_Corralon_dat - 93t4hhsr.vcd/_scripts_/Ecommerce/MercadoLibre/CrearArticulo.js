#include "(CurrentProject)/Ecommerce/MercadoLibre.js"

importClass("XMLHttpRequest");

var titulo 			=  theRoot.varToString("TIT");
var price  			=  theRoot.varToString("PRE");
var stock 			=  theRoot.varToInt("STK");
var id_mla 			=  theRoot.varToString("ID_MLA");
var codigoArticulo  =  theRoot.varToString("ID_ART");
var modelo          =  theRoot.varToString("MOD");
var marca           =  theRoot.varToString("MAR");
var foto 			=  theRoot.varToString("FOT");
var categoryId      =  theRoot.varToString("ID_CAT");
var Articuloref     =  theRoot.varToString("ID_REF");

var nuevaTrans = false;

// Separamos las URLs por el carácter '|'
var fotosArray = foto.split('|');

// Filtramos las URLs vacías y luego creamos el array de objetos 'pictures'
var pictures = fotosArray
  .filter(function(url) {
    return url.trim() !== ""; // Eliminamos URLs vacías o con solo espacios
  })
  .map(function(url) {
    return { "source": url };
  });

//hacemos llamada para ver si el token esta vencido.
refreshToken();

//Generamos el array de atributos
function CargarAtributos() {
    var nuevaTrans = false;
    var attributesArray = [];
    var hayTrans = theRoot.existTrans();
    if (!hayTrans) {
        nuevaTrans = theRoot.beginTrans("cargando atributos");
    }

    if (hayTrans || nuevaTrans) {
        var listaAtributos = new VRegisterList(theRoot);
        listaAtributos.setTable("sygemat_corralon_dat/ATB_ART");
        listaAtributos.load("ARTICULO", [codigoArticulo]);

        for (var i = 0; i < listaAtributos.size(); i++) {
            var reg = listaAtributos.readLockingAt(i);

            var id = reg.fieldToString("ATB.ID_NOM_MLA").toString();
            var valueName = reg.fieldToString("DSC").toString();
            var noApl = reg.fieldToInt("NO_APL");
            var requerido = reg.fieldToInt("REQ");
			
				// Excluir atributos sin descripción y con noApl igual a 0
				if (!valueName && noApl === 0) {
					continue; // Salta este atributo
				}
				// Si es requerido o processedValueName no es null
				if (requerido) {
					// Si es requerido, mandamos el processedValueName aunque esté vacío
					attributesArray.push({
						id: id,
						value_name: valueName
					});
				} else {
					var attributeObject = {
					id: id,
					value_name: valueName
					};

					// Si noApl es igual a 1, agrega la propiedad value_id con el valor "-1"
					if (noApl === 1) {
						attributeObject.value_id = "-1";
						attributeObject.value_name = null;
					}

					// Luego agrega el objeto al array
					attributesArray.push(attributeObject);
				}
			

        }
    }
    return attributesArray;
}

// Función para verificar si los atributos están completos antes de publicar
function verificarAtributosAntesDePublicar(data) {
    var xhrVerificar = new XMLHttpRequest();
    xhrVerificar.withCredentials = true;

    // Cambiamos la categoría en la URL según sea necesario
    var verificarURL = "https://api.mercadolibre.com/categories/" + categoryId + "/attributes/conditional";
    xhrVerificar.open("POST", verificarURL);
    xhrVerificar.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhrVerificar.setRequestHeader("Content-Type", "application/json");

    xhrVerificar.send(data);
	

    while (xhrVerificar.readyState != 4) {
        xhrVerificar.processEvents();
    }

    if (xhrVerificar.errorCode == 0 && xhrVerificar.status == 200) {
        // Analizamos la respuesta para buscar atributos requeridos
        try {
            var responseJSON = JSON.parse(xhrVerificar.responseText);
            var atributosFaltantes = responseJSON.required_attributes || [];

            if (atributosFaltantes.length > 0) {
				alert("Entro");
                var mensaje = "Faltan atributos obligatorios:\n";
                atributosFaltantes.forEach(function (atributo) {
                    mensaje += "- " + atributo.name + " (ID: " + atributo.id + ")\n";
                });

                return {
                    mensaje: "Validación fallida: faltan atributos obligatorios.",
                    detalles: mensaje,
                    status: xhrVerificar.status
                };
            }
			alert("Entro 2");
            // Si no hay atributos faltantes, retornamos null (todo está bien)
            return null;

        } catch (e) {
            return {
                mensaje: "Error inesperado al procesar la respuesta de verificación.",
                detalles: "No se pudo analizar la respuesta del servidor.",
                status: xhrVerificar.status
            };
        }

    } else if (xhrVerificar.status != 401) {
        return {
            mensaje: "Error al verificar atributos.",
            detalles: "Revisa los datos enviados o la respuesta del servidor.",
            status: xhrVerificar.status
        };
    }

    return {
        mensaje: "Error de autenticación.",
        detalles: "Revisa el token o inicia sesión nuevamente.",
        status: xhrVerificar.status
    };
}

var atributos = CargarAtributos();

atributos.push({
  "id": "SELLER_SKU",
  "value_name": Articuloref
});


var data = JSON.stringify({
  "title": titulo,
  "category_id": categoryId,
  "price": price,
  "currency_id": "ARS",
  "available_quantity": stock,
  "buying_mode": "buy_it_now",
  "condition": "new",
  "listing_type_id": "gold_special",
  "pictures": pictures,
  "attributes": atributos,
});

// Llamamos a la función para verificar atributos
var resultadoVerificacion = verificarAtributosAntesDePublicar(data);

alert(resultadoVerificacion);
if (resultadoVerificacion) {
    // Mostramos el error en caso de que falten atributos
    theRoot.setVar("MSJ", resultadoVerificacion.detalles);
    theRoot.setVar("DATA", data);
    theRoot.setVar("STATUS", 400);
   
}
else{

	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;

	xhr.open("POST", "https://api.mercadolibre.com/items");
	xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
	xhr.setRequestHeader("Content-Type", "application/json");

	xhr.send(data);

	while (xhr.readyState != 4) {
	  xhr.processEvents();
	}


	if (xhr.errorCode == 0 && xhr.status == 201) {
	  var oJson = JSON.parse(xhr.responseText);

		//Seteamos el ID de MLA al articulo, para que quede asociado
		var ListaArticulo = new VRegisterList( theRoot );
		ListaArticulo.setTable("sygemat_corralon_dat/EXT_ART_M");
		ListaArticulo.load("ID",codigoArticulo);
		
		if(ListaArticulo.size() > 0){
			var registroArticulo = ListaArticulo.readAt(0);
			try {
				
				registroArticulo.setField("MLA_COD", oJson.id );
				theRoot.setVar("ID_MLA", oJson.id);
				theRoot.setVar("STATUS", xhr.status);
				
				
			}catch (error) { /*no hacemos nada */ "" }
			
			registroArticulo.modifyRegister();
		}
		theRoot.setVar("MSJ	", "Articulo Cargado correctamente " + oJson.id);
		theRoot.setVar("DATA", JSON.stringify(data));
		theRoot.setVar("STATUS", xhr.status);

	}
	else if (xhr.status != 401) {
		// Si ocurre un error no esperado, mostramos el código de error y el mensaje
		try {
			var responseError = JSON.parse(xhr.responseText);
			// Convertimos los objetos a texto para que sean legibles
			var errorMessage = responseError.message || "Hubo un error al subir el artículo.";
			var errorDetails = JSON.stringify(responseError.cause) || "Por favor revisa los campos requeridos y vuelve a intentarlo.";
			theRoot.setVar("MSJ	", "Error al subir el artículo: " + errorMessage + "\nDetalles: " + errorDetails);
			theRoot.setVar("DATA", JSON.stringify(data));
			theRoot.setVar("STATUS", xhr.status);
		} catch (e) {}

	}
	else {
		
		// Si ocurre un error no esperado, mostramos el código de error y el mensaje
		try {
			var responseError = JSON.parse(xhr.responseText);
			// Convertimos los objetos a texto para que sean legibles
			var errorMessage = responseError.message || "Hubo un error al subir el artículo.";
			var errorDetails = JSON.stringify(responseError.cause) || "Por favor revisa los campos requeridos y vuelve a intentarlo.";
			theRoot.setVar("MSJ	", "Error al subir el artículo: " + errorMessage + "\nDetalles: " + errorDetails);
			theRoot.setVar("DATA", JSON.stringify(data));
			theRoot.setVar("STATUS", xhr.status);
		} catch (e) {}
	}
}


