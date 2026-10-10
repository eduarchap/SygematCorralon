#include "(CurrentProject)/Ecommerce/MercadoLibre.js"

importClass("XMLHttpRequest");

var titulo          = theRoot.varToString("TIT");
var codigoArticulo  = theRoot.varToString("ID_ART");
var categoryId      = theRoot.varToString("ID_CAT");
var id_pub      = theRoot.varToString("ID_PUB");
var Articuloref     =  theRoot.varToString("ID_REF");

var nuevaTrans = false;
// Hacemos llamada para ver si el token está vencido.
refreshToken();

function ObtenerAtributos(categoryId) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.mercadolibre.com/categories/" + categoryId + "/attributes");
    xhr.setRequestHeader("Authorization", "Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_MLA_AUT_TOK"));
    xhr.send();

    while (xhr.readyState != 4) {
        xhr.processEvents();
    }

    if (xhr.status === 200) {
        var atributos = JSON.parse(xhr.responseText);

        if (atributos) {
            atributos.forEach(function(attr) {
                // Filtrar solo los atributos con relevance = 1
                if (attr.relevance === 1 || (attr.tags && attr.tags.required === true)) {
                    
                    var hayTrans = theRoot.existTrans();
                    if (!hayTrans) {
                        nuevaTrans = theRoot.beginTrans("Importando Atributos");
                    }

                    if (hayTrans || nuevaTrans) {
                        // Verificar si el atributo ya existe
                        var listaAtributos = new VRegisterList(theRoot);
                        listaAtributos.clear();
                        listaAtributos.setTable("sygemat_corralon_dat/ATB_M");
                        var result = listaAtributos.load("ID_NOM_MLA", [attr.id]);
						
                        if (listaAtributos.size() === 0) {
                            // Inserción en la tabla de atributos (ATB_M)
							
                            var registroAtributo = new VRegister(theRoot);
                            registroAtributo.setTable("sygemat_corralon_dat/ATB_M");
                            registroAtributo.setField("NAME", attr.name);
                            registroAtributo.setField("HINT", attr.hint || "");
							registroAtributo.setField("ID_NOM_MLA", attr.id);
							registroAtributo.setField("ALLOW_VARIATIONS", attr.tags.allow_variations ? 1 : 0);
							if(attr.default_unit !== null){
								registroAtributo.setField("DEFAULT_UNIT", attr.default_unit);
							}
							
							if(attr.values && attr.values.length > 0){
								registroAtributo.setField("TIP", "2");
							}
							else {
                                // Si no tiene valores, TIP = 1
                                registroAtributo.setField("TIP", "1");
                            }
                            
                            if (registroAtributo.addRegister()) {
                                var codigoAtributo = registroAtributo.fieldToInt("ID");
								
								//Damos de alta las opciones de los atributos
								if (attr.values && attr.values.length > 0) {

                                // Insertar las opciones en la tabla de opciones (ATB_OPC)
                                attr.values.forEach(function(value) {
                                    var registroOpcion = new VRegister(theRoot);
                                    registroOpcion.setTable("sygemat_corralon_dat/ATB_OPC");
                                    registroOpcion.setField("OPC", value.name);
                                    registroOpcion.setField("ATB", codigoAtributo);
									registroOpcion.setField("ID_CAT", categoryId);
									registroOpcion.setField("ID_VALUE", value.id);
                                    registroOpcion.addRegister();
                                });

								}

                                // Inserción en la tabla de atributos por artículo (ATB_ART)
                                var registroAtributoArticulo = new VRegister(theRoot);
                                registroAtributoArticulo.setTable("sygemat_corralon_dat/ATB_ART");
                                registroAtributoArticulo.setField("ART", codigoArticulo);
                                registroAtributoArticulo.setField("ATB", codigoAtributo);

                                // Convertir booleano a numérico (0 o 1)
								var requerido = 0;
								
								// Verificar si el atributo es obligatorio (requerido o condicionalmente requerido)
								if (attr.tags && (attr.tags.required || attr.tags.conditional_required)) {
									requerido = 1;
								}
								if (attr.id === 'SELLER_SKU'){
									registroAtributoArticulo.setField("DSC", Articuloref);
								}
								
								registroAtributoArticulo.setField("REQ", requerido);
								if(attr.values && attr.values.length > 0){
								registroAtributoArticulo.setField("TIP", "2");
								}
								else {
                                // Si no tiene valores, TIP = 1
                                registroAtributoArticulo.setField("TIP", "1");
								}
                                registroAtributoArticulo.addRegister();
                            }
                        }
						else if (listaAtributos.size() > 0) {
								var codigoAtributo = listaAtributos.readAt(0).fieldToInt("ID");
							
								//Damos de alta las opciones de los atributos
								if (attr.values && attr.values.length > 0) {
									// Verificar si el atributo ya existe
									var listaAtributosOpciones = new VRegisterList(theRoot);
									listaAtributosOpciones.clear();
									listaAtributosOpciones.setTable("sygemat_corralon_dat/ATB_OPC");
									var result = listaAtributosOpciones.load("ATB_ID_CAT", [codigoAtributo,categoryId]);
									
									if (listaAtributosOpciones.size() === 0)
									// Insertar las opciones en la tabla de opciones (ATB_OPC)
									attr.values.forEach(function(value) {
										var registroOpcion = new VRegister(theRoot);
										registroOpcion.setTable("sygemat_corralon_dat/ATB_OPC");
										registroOpcion.setField("OPC", value.name);
										registroOpcion.setField("ATB", codigoAtributo);
										registroOpcion.setField("ID_CAT", categoryId);
										registroOpcion.setField("ID_VALUE", value.id);
										registroOpcion.addRegister();
									});

								}
								
								var codigoAtributo = listaAtributos.readAt(0).fieldToInt("ID");
								
                                // Inserción en la tabla de atributos por artículo (ATB_ART)
                                var registroAtributoArticulo = new VRegister(theRoot);
                                registroAtributoArticulo.setTable("sygemat_corralon_dat/ATB_ART");
                                registroAtributoArticulo.setField("ART", codigoArticulo);
                                registroAtributoArticulo.setField("ATB", codigoAtributo);

                                // Convertir booleano a numérico (0 o 1)
								var requerido = 0;

								// Verificar si el atributo es obligatorio (requerido o condicionalmente requerido)
								if (attr.tags && (attr.tags.required || attr.tags.conditional_required)) {
									requerido = 1;
								}
								if (attr.id === 'SELLER_SKU'){
									registroAtributoArticulo.setField("DSC", Articuloref);
								}
								registroAtributoArticulo.setField("REQ", requerido);
								if(attr.values && attr.values.length > 0){
								registroAtributoArticulo.setField("TIP", "2");
								}
								else {
                                // Si no tiene valores, TIP = 1
                                registroAtributoArticulo.setField("TIP", "1");
								}
                                registroAtributoArticulo.addRegister();
						}
                    }
                }
            });
        }
    } else {
        alert("Error al obtener atributos: " + xhr.status + ", " + xhr.responseText);
    }
}

if(categoryId !== ""){
var atributos = ObtenerAtributos(categoryId);
}
// Si se creó una nueva transacción, se finaliza
if (nuevaTrans) {
    theRoot.commitTrans();
}

// Obtener el producto usando el ID de publicación
if(id_pub !== ""){
var resultado = ConsultarProducto(id_pub);
	var attributes  = resultado.attributes;
	//alert("Atributos: " + JSON.stringify(attributes));
	CargarAtributos(attributes, categoryId, codigoArticulo);
}

function CargarAtributos(attributes, categoryId, codigoArticulo) {
	
    if (attributes) {
        attributes.forEach(function(attr) {
            var hayTrans = theRoot.existTrans();
            var nuevaTrans = false;
            if (!hayTrans) {
                nuevaTrans = theRoot.beginTrans("Importando Atributos");
            }

            if (hayTrans || nuevaTrans) {
                // Verificar si el atributo ya existe
                var listaAtributos = new VRegisterList(theRoot);
                listaAtributos.clear();
                listaAtributos.setTable("sygemat_corralon_dat/ATB_M");
                var result = listaAtributos.load("ID_NOM_MLA", [attr.id]);

                if (listaAtributos.size() > 0) {
                    var reg = listaAtributos.readLockingAt(0);
                    var codigoAtributo = parseInt(reg.fieldToString("ID"), 10);

                    // Procesar las opciones del atributo
                    if (attr.values && attr.values.length > 0) {
                        attr.values.forEach(function(value) {
                            // Verificar si el value.id es null
                            if (value.id === null || value.id === "-1") {
								
                                // Buscar en ATB_ART y modificar DSC con value.name
                                var listaAtributoArticulo = new VRegisterList(theRoot);
                                listaAtributoArticulo.clear();
                                listaAtributoArticulo.setTable("sygemat_corralon_dat/ATB_ART");
                                var result = listaAtributoArticulo.load("ARTICULO", [codigoArticulo, codigoAtributo]);
                                
                                if (listaAtributoArticulo.size() > 0) {
                                    var registroAtributoArticulo = listaAtributoArticulo.readAt(0);
										
									registroAtributoArticulo.setField("DSC", value.name);
									if (attr.id === 'YIELD_OF_SALES_UNIT'){
									registroAtributoArticulo.setField("COE", value.struct.number);
									}
									if (attr.id === 'BASEBOARDS_YIELD_OF_SALES_UNIT'){
									registroAtributoArticulo.setField("COE", value.struct.number);
									}
									//registroAtributoArticulo.setField("COE", value.struct.number);
										
									if(value.id === "-1"){
										registroAtributoArticulo.setField("NO_APL", true);
									}
                                    registroAtributoArticulo.modifyRegister();
                                }
                            } else {
                                // Procesar normalmente los valores con un value.id válido
                                var listaAtributosOpciones = new VRegisterList(theRoot);
                                listaAtributosOpciones.clear();
                                listaAtributosOpciones.setTable("sygemat_corralon_dat/ATB_OPC");
								//Si el valor viene -1 significa que no aplica por ende 
								if(value.id === "-1"){
										// Buscar en ATB_ART y modificar ATB_OPC
										var listaAtributoArticulo = new VRegisterList(theRoot);
										listaAtributoArticulo.clear();
										listaAtributoArticulo.setTable("sygemat_corralon_dat/ATB_ART");
										var result = listaAtributoArticulo.load("ARTICULO", [codigoArticulo, codigoAtributo]);

										if (listaAtributoArticulo.size() > 0) {
											var registroAtributoArticulo = listaAtributoArticulo.readAt(0);
											registroAtributoArticulo.setField("NO_APL", true);
											registroAtributoArticulo.setField("ATB_OPC", 0)
											registroAtributoArticulo.modifyRegister();
										}
								}
								else{
									var result = listaAtributosOpciones.load("ID_VALUE_ID_CAT_ATB", [value.id, categoryId, codigoAtributo]);

									if (listaAtributosOpciones.size() > 0) {
										var reg = listaAtributosOpciones.readLockingAt(0);
										var codigoAtributoOpcion = parseInt(reg.fieldToString("ID"), 10);

										// Buscar en ATB_ART y modificar ATB_OPC
										var listaAtributoArticulo = new VRegisterList(theRoot);
										listaAtributoArticulo.clear();
										listaAtributoArticulo.setTable("sygemat_corralon_dat/ATB_ART");
										var result = listaAtributoArticulo.load("ARTICULO", [codigoArticulo, codigoAtributo]);

										if (listaAtributoArticulo.size() > 0) {
											var registroAtributoArticulo = listaAtributoArticulo.readAt(0);
											registroAtributoArticulo.setField("ATB_OPC", codigoAtributoOpcion);
											
											if(value.name === "null"){
											registroAtributoArticulo.setField("NO_APL", true);
											}
											registroAtributoArticulo.modifyRegister();
										}
									}
								}
                                
                            }
                        });
                    }
                }
            }
        });

        // Confirmar la transacción si fue creada en este proceso
        if (nuevaTrans) {
            theRoot.commitTrans();
        }
    }
}





