#include "(CurrentProject)/Documentos/WebServer/base64.js"
#include "(CurrentProject)/Documentos/WebServer/cirrus.js"

// Definición del controlador
	wApp.helloController = {
		sayHello: function(params){
			theApp.setGlobalVar("sygemat_corralon_dat/DOC_G_DRI_AUT_COD", params.code);
			return("Autorización correcta !");
		}
	}

// Crear las rutas
	wApp.router.addRoutes({"GET /authorized": "helloController#sayHello"})

// Procesar la respuesta
	var request = theRoot.varToString("REQUEST")
	theRoot.setVar("RESPONSE", Response(Request(request)));