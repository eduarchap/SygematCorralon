#include "(CurrentProject)/Ecommerce/ajax.js"

function verificarYActualizarToken() {
    var currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos desde Epoch
    var tokenRenewalTime = theApp.globalVarToInt("sygemat_corralon_dat/DOC_MLA_AUT_TOK_RENEWAL_TIME"); // Tiempo en el que se renovó el token
    var expiresIn = theApp.globalVarToInt("sygemat_corralon_dat/DOC_MLA_AUT_TOK_EXP_IN"); // Duración del token en segundos

    // Verificamos si el token ha expirado
    if (currentTime >= (tokenRenewalTime + expiresIn)) {
        // El token ha expirado o está a punto de expirar, se procede a renovarlo
		refreshToken()
    } 
}

// Llamar a la función de verificación y renovación
verificarYActualizarToken();


function refreshToken(){
	  $.ajax({
	  url: "https://api.mercadolibre.com/oauth/token",
	  type: "POST",
	  headers: {
		"accept": "application/json",
		"content-type": "application/x-www-form-urlencoded"
	  },
	  data: {
		client_id     : theApp.globalVarToString("sygemat_corralon_dat/DOC_G_MLA_CLI_ID"),
		client_secret : theApp.globalVarToString("sygemat_corralon_dat/DOC_G_MLA_CLI_SEC"),
		refresh_token : theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_REF_TOK"),
		grant_type    : "refresh_token"
	  },
	  dataType: "json",
	  success: function(data) {
			var currentTime = Math.floor(Date.now() / 1000);
			data = JSON.parse(data);

			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_TOK", data.access_token);
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_REF_TOK", data.refresh_token);
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_TOK_EXP_IN", data.expires_in);
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_TOK_RENEWAL_TIME", currentTime );


	  },
	  error: function(xhr, status, error) {
		// Solo invalidamos las credenciales guardadas cuando ML confirma que el
		// refresh_token en si es invalido (invalid_grant). Ante errores
		// transitorios (red, timeout, 5xx, rate limit) dejamos el token viejo
		// intacto: borrarlo ahi tira abajo toda actualizacion posterior del lote
		// sin posibilidad de recuperarse sola.
		var refreshTokenInvalido = false;
		try {
			var errorBody = typeof xhr === "string" ? JSON.parse(xhr) : xhr;
			refreshTokenInvalido = errorBody && errorBody.error === "invalid_grant";
		} catch (e) {
			refreshTokenInvalido = false;
		}

		theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_TOK_LAST_ERROR", "refreshToken error: " + String(error) + " - " + String(xhr));

		if (refreshTokenInvalido) {
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_TOK", "");
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_MLA_AUT_REF_TOK", "");
		}
	  }
	});
}

//Buscamos primero la categoria por el titulo
function BuscarCategoria(titulo) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.open("GET", "https://api.mercadolibre.com/sites/MLA/domain_discovery/search?q=" + encodeURIComponent(titulo));
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));

    xhr.send();

    while (xhr.readyState != 4) {
        xhr.processEvents();
    }

    if (xhr.errorCode == 0 && xhr.status == 200) {
        var oJson = JSON.parse(xhr.responseText);
		
		// Validamos que la respuesta no esté vacía
        if (oJson.length > 0) {
            var categorias = [];
            oJson.forEach(function(item) {
                categorias.push({
                    categoryId: item.category_id,
                    categoryName: item.domain_name + "/" + item.category_name
                });
            });
            return categorias; // Retornamos todas las categorías
        } else {
            alert("No se encontraron categorías para el título: " + titulo);
            return [{
                categoryId: "MLA1902",
                categoryName: "No se encontró categoría"
            }];
        }
    }
	else {
        alert("Error en la llamada a la API de MercadoLibre.");
        return [];
    }
}

//Buscamos Articulo
function ConsultarProducto(idPublicacion) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.open("GET", "https://api.mercadolibre.com/items/" + idPublicacion + "?include_attributes=all");
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));

    xhr.send();

    while (xhr.readyState != 4) {
        xhr.processEvents();
    }

    if (xhr.errorCode == 0 && xhr.status == 200) {
        var oJson = JSON.parse(xhr.responseText);
		return oJson;

    }
	else {
		// Antes esto colapsaba a 0 y se perdia el motivo real del fallo
		// (401 sesion vencida, 404 no existe, 429 rate limit, 5xx, timeout...).
		// Devolvemos el status real para que el que llama pueda reportarlo.
		return {
			ok: false,
			status: xhr.status,
			errorCode: xhr.errorCode,
			responseText: xhr.responseText
		};
    }
}

//Buscar categoria por ID
function BuscarCategoriaID(IdCategoria) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
	
    xhr.open("GET", "https://api.mercadolibre.com/categories/" + IdCategoria);
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));

    xhr.send();

    while (xhr.readyState != 4) {
        xhr.processEvents();
    }

    if (xhr.errorCode == 0 && xhr.status == 200) {
        var oJson = JSON.parse(xhr.responseText);
		
            return oJson; // Retornamos el nombre de la categoria
        } 
}
	
