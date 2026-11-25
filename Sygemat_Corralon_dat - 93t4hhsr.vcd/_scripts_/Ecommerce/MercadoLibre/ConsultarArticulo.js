// Incluir los archivos necesarios
#include "(CurrentProject)/Ecommerce/MercadoLibre/CargarAtributos.js"
#include "(CurrentProject)/Ecommerce/MercadoLibre.js"

// Importar la clase XMLHttpRequest
importClass("XMLHttpRequest");

// Variables obtenidas del contexto actual
var id_pub              = theRoot.varToString("ID_PUB");
var codigoArticulo      = theRoot.varToInt("ID_ART");
var obtenerInformacion  = theRoot.varToInt("INF_OK");

// Variable para manejar la transacción
var nuevaTrans = false;

// Obtener el producto usando el ID de publicación
var resultado = ConsultarProducto(id_pub);

if (!resultado || resultado.ok === false) {
    // Si no se encuentra el producto, establecer el resultado en una variable y salir
    theRoot.setVar("RES_BUS_ART", 0);
} else {
    // Producto encontrado: manejar los resultados
    theRoot.setVar("RES_BUS_ART", 1);
    theRoot.setVar("SOLD_QUANTITY",resultado.sold_quantity);
	theRoot.setVar("NOM_TPV",resultado.title);
	//Si el articulo se esta asociando, sincronizamos la informacion necesaria.
	if(obtenerInformacion === 1){
	
		// Obtener los atributos del producto basado en su categoría
		//ObtenerAtributos(resultado.category_id);
		//CargarAtributos(resultado.attributes,resultado.category_id,codigoArticulo);
		//Cargamos las fotos obtenidas

		CargarFotos(resultado.pictures);
		// Verificar si ya existe una transacción abierta
		var hayTrans = theRoot.existTrans();
		if (!hayTrans) {
			nuevaTrans = theRoot.beginTrans("Buscando articulo");
		}

		if (hayTrans || nuevaTrans) {
			// Crear una lista para manejar los registros de artículos
			var listaArticulos = new VRegisterList(theRoot);
			listaArticulos.clear();
			listaArticulos.setTable("sygemat_corralon_dat/ART_M");

			// Cargar los registros con el ID proporcionado por seller_custom_field
			var result = listaArticulos.load("ID", [codigoArticulo]);
			
			if (listaArticulos.size() > 0) {
				// Si no existe, agregar un nuevo registro
				var registroArticulo = listaArticulos.readAt(0);
				registroArticulo.setField("NOM_TPV", resultado.title);
				registroArticulo.modifyRegister();
				
				// Crear una lista para manejar los registros de artículos
				var listaArticulosExtension = new VRegisterList(theRoot);
				listaArticulosExtension.clear();
				listaArticulosExtension.setTable("sygemat_corralon_dat/EXT_ART_M");

				// Cargar los registros con el ID proporcionado por seller_custom_field
				var result = listaArticulosExtension.load("ID", [codigoArticulo]);
				
				if (listaArticulosExtension.size() > 0) {
					var registroArticuloExtension = listaArticulosExtension.readAt(0);
					registroArticuloExtension.setField("ID_CAT_ML", resultado.category_id);
					registroArticuloExtension.modifyRegister();
				}
				else {
					// Inserción en la tabla de articulo extension(EXT_ART_M)
							
                     var registroExtArticulo = new VRegister(theRoot);
                     registroExtArticulo.setTable("sygemat_corralon_dat/EXT_ART_M");
                     registroExtArticulo.setField("ID", codigoArticulo);
                     registroExtArticulo.setField("ID_CAT_ML", resultado.category_id);
							
					 registroExtArticulo.addRegister()
                            
					
				}
				
			}

			// Finalizar la transacción si fue iniciada en este contexto
			if (nuevaTrans) {
				theRoot.commitTrans();
			}
		}
	}
}

function CargarFotos(imagenes) {
    if (imagenes && imagenes.length > 0) {

        var nuevaTrans = false;
        var hayTrans = theRoot.existTrans();

        if (!hayTrans) {
            nuevaTrans = theRoot.beginTrans("Importando Imágenes");
        }

        if (hayTrans || nuevaTrans) {
            // Crear lista para manejar las fotos
            var listaFotos = new VRegisterList(theRoot);
            listaFotos.clear();
            listaFotos.setTable("sygemat_corralon_dat/ART_FOT");

            // Verificar si ya hay fotos registradas para el artículo
            listaFotos.load("ART_FOT", [codigoArticulo]);
			//alert("Lista fotos: " + listaFotos.size());
            if (listaFotos.size() === 0) {
                var posicion = 1;
                imagenes.forEach(function (imagen) {
					var registroFotos = new VRegister(theRoot);
                    registroFotos.setTable("sygemat_corralon_dat/ART_FOT");
					registroFotos.setField("ART", codigoArticulo); // ID del artículo
					registroFotos.setField("NOM_FOT", imagen.secure_url); // URL segura
					registroFotos.setField("CAT", posicion.toString()); // Posición actual
					registroFotos.setField("IMP", 1); // Tamaño

					if (!registroFotos.addRegister()) {
						alert(" ART_FOT Error al dar de alta el registro."); // Registrar error
					} else {
						posicion++; // Incrementar la posición después de que se añada correctamente
					}

                });


            }
        }

        // Finalizar la transacción si fue iniciada aquí
        if (nuevaTrans) {
            theRoot.commitTrans();
        }
    }
}
