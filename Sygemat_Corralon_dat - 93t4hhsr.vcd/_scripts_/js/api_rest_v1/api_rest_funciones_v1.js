/**
 * ====================================================================================================
 *
 * FUNCIONES COMUNES para el API REST v1
 *
 * 1.01 - 15/06/2016 - Modificadas funciones tablaIdRef(), objetosTipoTablaDestino() y tablaDestinoIdRef()
 * 1.02 - 31/10/2016 - Revisada la función imagenFromBase64 para procesar devolver imágenes recibidasen base64
 * 1.03 - 25/09/2017 - Revisado estilo de llaves
 * 1.04 - 26/02/2019 - Permitir que en la URL los parámetros puedan contener el símbolo ?
 * 1.05 - 01/10/2019 - Comprueba si el contenido es un JSON devuelve el JSON sin tratar
 * 1.06 - 11/11/2019 - Optimizamos search con indexOf y contemplar api_key que nos llegue por headers
 * 1.07 - 20/11/2019 - Modificado var uriPathInfo = decodeURIComponent(escape(theRequest.pathInfo())); y
 * 1.08 - 27/04/2021 - Comprobación de retorno de JSON en vTableInfo.FielTypeObject
 *
 * ====================================================================================================
 **/

importClass("VImage");


/**
 * ----------------------------------------------------------------------------------------------------
 * requestToObjeto [Parseador de la request, devuelve un objeto JSON con todas las partes extraídas]
 * 
 * @param {[String]} url [Requerido URL que se parseará para extraer todas sus partes]
 * @return {Object} requestParsed Objeto JSON con todas las variables y arrays de las partes
 * ----------------------------------------------------------------------------------------------------
 **/
function requestToObjeto() { // Extraemos las partes del bloque pathInfo del request
    var uriMetodo = theRequest.method();
    var uriPathInfo = decodeURIComponent(escape(theRequest.pathInfo()));
    var uriPathInfoSplit = uriPathInfo.split('/');
    var posicionVersion = uriPathInfoSplit.indexOf(version);
    var uriRecurso = (uriPathInfoSplit.length > (posicionVersion + 0)) ? uriPathInfoSplit[posicionVersion + 1] : "";
    var uriIdentificador = (uriPathInfoSplit.length > (posicionVersion + 1)) ? uriPathInfoSplit[posicionVersion + 2] : "";
    var uriRelaciones = (uriPathInfoSplit.length > (posicionVersion + 2)) ? uriPathInfoSplit[posicionVersion + 3] : "";
    var uriRecursosrel = (uriPathInfoSplit.length > (posicionVersion + 3)) ? uriPathInfoSplit[posicionVersion + 4] : "";

    // Preparamos el idRef del recurso: tabla, proceso o búsqueda
    var uriProceso = "";
    var uriBusqueda = "";
    var uriTabla = "";

    switch (uriRecurso) {
        case "_image":
            // Para el endpoint de imágenes la tabla está en la posición del identificador
            // URL: /v1/_image/{tabla}/{id}/{campo}
            var uriTabla = tablaIdRef(uriIdentificador.toUpperCase());
            break;

        case "_process":
            var uriProceso = objetoIdRef(VObjectInfo.TypeProcess, uriIdentificador.toUpperCase());
            if (uriProceso) {
                var uriTabla = tablaDestinoIdRef(VObjectInfo.TypeProcess, uriProceso);
            }
            break;

        case "_query":
            var uriBusqueda = objetoIdRef(VObjectInfo.TypeQuery, uriIdentificador.toUpperCase());
            if (uriBusqueda) {
                var uriTabla = tablaDestinoIdRef(VObjectInfo.TypeQuery, uriBusqueda);
            }
            break;

        default:
            var uriTabla = tablaIdRef(uriRecurso.toUpperCase());
    }

    // Extraemos los parámetros del request
    var uriUnparsedUri = decodeURIComponent(theRequest.unparsedUri());
    var uriParametros = uriUnparsedUri.substring(uriUnparsedUri.indexOf('?', 0) + 1, uriUnparsedUri.length);

    // Creamos los arrays de los diferentes tipos de parámetros
    var uriApiKey = [];
    var uriToken = [];
    var uriErrors = [];
    var uriFields = [];
    var uriFieldsTablas = [];
    var uriFieldsCampos = [];
    var uriFilter = [];
    var uriFilterQuery = [];
    var uriWhere = [];
    var uriInclude = [];
    var uriPage = [];
    var uriParam = [];
    var uriSort = [];
	var ejecutarEnInstancia = "false";
	var identificadorInstancia = "";
	var usuarioInstancia = "";
	var passwordInstancia = "";
	var VRLInstancia = "";
	var mostrarUriobjeto = "false";
	var uriImageAsUrl = false; // Por defecto se mantiene el comportamiento histórico: imagen en Base64 inline

    // Extraemos los diferentes tipos de parámetros
    if (typeof uriParametros !== "undefined") {
        var uriParametrosSplit = uriParametros.split('&');
        for (var index = 0; index < uriParametrosSplit.length; index++) {
            var parametro = uriParametrosSplit[index];
            var parametroLower = parametro.toLowerCase();

            if (parametroLower.indexOf("api_key=") !== -1) {
                uriApiKey.push(parametro.replace("api_key=", ""));
            } else if (parametroLower.indexOf("fields=") !== -1) {
                uriFields.push(parametro.replace("fields", ""));
            } else if (parametroLower.indexOf("filterquery[") !== -1) {
                uriFilterQuery.push(parametro.substring(parametroLower.indexOf("filterquery[") + 11));
            } else if (parametroLower.indexOf("filter[") !== -1) {
                uriFilter.push(parametro.replace("filter", ""));
            } else if (parametroLower.indexOf("include=") !== -1) {
                uriInclude.push(parametro.replace("include=", ""));
            } else if (parametroLower.indexOf("page[") !== -1) {
                uriPage.push(parametro.replace("page", ""));
            } else if (parametroLower.indexOf("param[") !== -1) {
                uriParam.push(parametro.replace("param", ""));
            } else if (parametroLower.indexOf("sort=") !== -1) {
                uriSort.push(parametro.replace("sort=", ""));
            } else if (parametroLower.indexOf("where[") !== -1) {
                uriWhere.push(parametro.replace("where", ""));
            } else if (parametroLower.indexOf("ejecutareninstancia=") !== -1) {
                ejecutarEnInstancia = parametro.replace("ejecutarEnInstancia=", "")				
            } else if (parametroLower.indexOf("usuarioinstancia=") !== -1) {
                usuarioInstancia = parametro.replace("usuarioInstancia=", "")				
            } else if (parametroLower.indexOf("passwordinstancia=") !== -1) {
                passwordInstancia = parametro.replace("passwordInstancia=", "")				
            } else if (parametroLower.indexOf("vrlinstancia=") !== -1) {
                VRLInstancia = parametro.replace("VRLInstancia=", "")				
            } else if (parametroLower.indexOf("identificadorinstancia=") !== -1) {
                identificadorInstancia = parametro.replace("identificadorInstancia=", "")				
            } else if (parametroLower.indexOf("mostraruriobjeto=") !== -1) {
                mostrarUriobjeto = parametro.replace("mostrarUriobjeto=", "")
            } else if (parametroLower.indexOf("image_as_url=") !== -1) {
                var valorImageAsUrl = parametro.replace("image_as_url=", "").toLowerCase();
                uriImageAsUrl = (valorImageAsUrl === "true" || valorImageAsUrl === "1");
            }
			
        }
    }

    // Si se han recibido fields se repasan creando dos arrays uno con las tablas y otro con la lista de campos de la tabla
    if (uriFields.length > 0) {
        for (var index = 0; index < uriFields.length; index++) {
            var fieldsSplit = uriFields[index].split('=');
            if (fieldsSplit[0] == "") {
                uriFieldsTablas.push(uriTabla.split("/")[1].toLowerCase());
            } else {
                uriFieldsTablas.push(fieldsSplit[0].substring(1, fieldsSplit[0].length - 1).toLowerCase());
            } uriFieldsCampos.push(fieldsSplit[1]);
        }
    }

    // Si no hemos recibido información sobre paginación asumimos un máximo de 1000 registros a devolver
    if (uriPage.length == 0) {
        uriPage.push("[number]=1");
        uriPage.push("[size]=1000");
    }

    // Comprobamos si tenemos api_key o token en headers (recorremos headerKeys para ser insensibles a mayúsculas/minúsculas)
    var headersRecibidos = theRequest.headerKeys();
    var xApiKey = false;
    var xToken = false;
    for (var hIndex = 0; hIndex < headersRecibidos.length; hIndex++) {
        var nombreHeader = headersRecibidos[hIndex].toUpperCase();
        if (nombreHeader === "X-API-KEY") {
            xApiKey = theRequest.header(headersRecibidos[hIndex]);
        } else if (nombreHeader === "AUTHORIZATION") {
            xToken = theRequest.header(headersRecibidos[hIndex]);
        }
    }
    if (uriApiKey.length == 0 && xApiKey !== false) {
        uriApiKey.push(xApiKey);
    }

    // Comprobamos si tenemos token en headers (Bearer o Basic)
    if ((uriToken.length == 0) && (xToken !== false) && ((xToken.indexOf("Bearer ") != -1) || (xToken.indexOf("Basic ") != -1))) {
        uriToken.push(xToken.replace("Bearer ", "").replace("Basic ", ""));
    }

    // Leemos el body del POST
	// Si viene del proceso sygemat_corralon_dat/JSON_VTA_ECOM ejecutamos el encode
	
	if(uriProceso == "sygemat_corralon_dat/JSON_VTA_ECOM") {
		JsonEncode = encodeURIComponent(theRequest.body());
		}
	else {
		JsonEncode = theRequest.body()
		}
		
		
    var uriBody = "";
    if ((uriMetodo == "POST") || (uriMetodo == "PUT") || (uriMetodo == "PATCH")) { // Nos aseguramos que la codificación sea correcta
        var cadDecode = decodeURIComponent(JsonEncode);

        if (esValidoJson(cadDecode)) {
            uriBody = JSON.parse(cadDecode);
        } else {
            uriErrors.push("El objeto JSON recibido en el body de la petición no es válido");
        }
    }

    // Preparar objeto de retorno
    var uriObjeto = {
        'api_key': uriApiKey,
        'metodo': uriMetodo,
        'recurso': uriRecurso,
        'tabla': uriTabla,
        'proceso': uriProceso,
        'busqueda': uriBusqueda,
        'identificador': uriIdentificador,
        'relaciones': uriRelaciones,
        'recursosrel': uriRecursosrel,
        'fields_tablas': uriFieldsTablas,
        'fields_campos': uriFieldsCampos,
        'filter': uriFilter,
        'filter_query': uriFilterQuery,
        'where': uriWhere,
        'include': uriInclude,
        'page': uriPage,
        'param': uriParam,
        'sort': uriSort,
        'body': uriBody,
        'errores': uriErrors,
        'token': uriToken,
        'max_reg': 100,
		'ejecutarEnInstancia': ejecutarEnInstancia,
		'usuarioInstancia': usuarioInstancia,
		'passwordInstancia': passwordInstancia,
		'VRLInstancia': VRLInstancia,
		'identificadorInstancia': identificadorInstancia,
		'mostrarUriobjeto': mostrarUriobjeto,
		'image_as_url': uriImageAsUrl
    };

    // Obtenemos la información de seguridad del API Key y la añadimos a uriObjeto
    getApiKeySeguridad(uriObjeto);

    // Devolver el objeto con todos los datos parseados
    return uriObjeto;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * convertirIdEnIdRef [Dado un ID de tabla, lo convierte en IdRef]
 * 
 * @param {[string]} ID
 * @return {[string]} IdRef de la tabla
 * ----------------------------------------------------------------------------------------------------
 **/

function convertirIdEnIdRef( tablaId ){
	var proyectoInfoPrincipal = theApp.mainProjectInfo();
	var proyectoId = tablaId.split("@")[0];
	var tablaId = tablaId.split("@")[1];
	var tablaIdRef = "";
	
	for( var i = 0; i < proyectoInfoPrincipal.legacyProjectCount(); i++ ){
		var proyectoInfo = proyectoInfoPrincipal.legacyProjectInfo(i);
		//Solo verificamos si el tipo es TypeDat = 0
		if( proyectoInfo.type() == VProjectInfo.TypeDat ){
			//Verificamos si el proyecto coincide para obtener su alias
			if( proyectoInfo.id() == proyectoId ){
				tablaIdRef = proyectoInfo.alias() + "/" + tablaId;
				i = proyectoInfoPrincipal.legacyProjectCount();
			}
		}
	}
	return tablaIdRef;	
}

/**
 * ----------------------------------------------------------------------------------------------------
 * evaluarSeguridadCampoEnlazado [Evaluar si corresponde o no el campo solicitado en los parametros fields]
 * 
 * @param {[string]} campo que deseamos verificar
 * @param {[string]} IdRef de la tabla donde esta dicho campo
 * @param {[string]} apiKeyId id del maestro del ApiKey asociado a la seguridad 
 * @param {[Object]} uriObjeto []
 * @param {[Object]} uriSegCampos [] campos permitidos
 * @return {Object} requestParsed Objeto JSON con todas las variables y arrays de las partes
 * ----------------------------------------------------------------------------------------------------
 **/

function evaluarSeguridadCampoEnlazado( campo, campoOriginal, tablaIdRef, apikeyId, uriObjeto, uriSegCampos ){
	
	//Creamos un registro de la tabla en cuestion para buscar la tabla del campo recibido
	var campoMaestro = campo.split(".")[0].toLowerCase();
	var registro = new VRegister(theRoot);
	registro.setTable( tablaIdRef );
	var tablaInfo = registro.tableInfo();
	var posicion = 0;
	//Buscamos la posicion del campo recibido
	for( var i = 0; i < tablaInfo.fieldCount(); i++ ){
		if( tablaInfo.fieldId(i).toLowerCase() == campoMaestro ){
			posicion = i;
			i = tablaInfo.fieldCount();
		}
	}
	//Si es un tipo de enlace de tabla estatica, se deja continuar
	if( tablaInfo.fieldBindType( posicion ) == 2 ){
		uriSegCampos.push(campoOriginal);
		return 1;
	}
	//Buscamos y convertimos el ID del tableInfo en un IdRef valido
	var tablaMaestroId = tablaInfo.fieldBoundedTableId( posicion );
	var tablaMestroIdRef = convertirIdEnIdRef(tablaMaestroId);
	
	//Buscamos en la seguridad
	var registroSeg = new VRegister(theRoot);
    registroSeg.setTable("sygemat_corralon_dat/API_SEG_W");
    var indice = "API_KEY_TAB";
    var partes = [];
    partes.push(apikeyId);
	partes.push(tablaMestroIdRef);
	
	if (registroSeg.readRegister(indice, partes, VRegister.SearchThis) == true) { // Leemos los métodos admitidos
		// -------------------
		// Seguridad de CAMPOS
		// -------------------
		// Leemos los campos admitidos, si no están marcados todos esos son los admitidos en caso de estar marcados todos pasan a ser los excluidos
		if (registroSeg.fieldToBool("CAM_TOD") == false) {
			var apikeyCampos = registroSeg.fieldToString("CAM").split(",");
			if (apikeyCampos.length > 0) {
				//Verificamos uno a uno si esta permitido
				//Si el campo evaluado contiene un unico . significa que el campo buscado 
				//es de la tabla tablaMestroIdRef, con lo cual verifico y retorno
				if( campo.split(".").length == 2 ){
					var campoBuscado = campo.split(".")[1].toUpperCase();						
					if( apikeyCampos.indexOf( campoBuscado ) == -1 ){
						uriObjeto.errores.push("No se retornan valores del campo " + campoOriginal);
					}else{
						uriSegCampos.push(campoOriginal);
					}
				}else{
					//Si contiene mas de un . significa que debo llamar nuevamente la misma funcion
					//pero pasandole los parametros correspondientes
					evaluarSeguridadCampoEnlazado( campo.substring( campoMaestro.length + 1 ), campoOriginal, tablaMestroIdRef, apikeyId, uriObjeto, uriSegCampos );						
				}
			}else{
				uriObjeto.errores.push("No se retornan valores del campo " + campoOriginal);
			}				
		}else{
			uriSegCampos.push(campoOriginal);
		}
    }else{
		uriObjeto.errores.push("No se retornan valores del campo " + campoOriginal);
	}
}


/**
 * ----------------------------------------------------------------------------------------------------
 * parseRequest [Parseador de la request, devuelve un objeto JSON con todas las partes extraídas]
 * 
 * @param {[Object]} uriObjeto []
 * @return {Object} requestParsed Objeto JSON con todas las variables y arrays de las partes
 * ----------------------------------------------------------------------------------------------------
 **/
function getApiKeySeguridad(uriObjeto) { // Preparar las variables de trabajo
    var uriSegMetodos = [];
    var uriSegCampos = [];
    var uriSegProcesos = [];
    var uriSegBusquedas = [];

    // Leemos el registro del API Key para obtener su código (ID)
    var registroApiKey = new VRegister(theRoot);
    registroApiKey.setTable("sygemat_corralon_dat/API_KEY_W");
    registroApiKey.readRegister("API_KEY", [uriObjeto.api_key[0]], VRegister.SearchThis);
    var apikeyId = registroApiKey.fieldToInt("ID");

    if (apikeyId != 0) { // Leemos el registro de la seguridad para el API Key
        var registroSeg = new VRegister(theRoot);
        registroSeg.setTable("sygemat_corralon_dat/API_SEG_W");
        var indice = (uriObjeto.tabla == "" ? "API_KEY_SIN_TAB" : "API_KEY_TAB");
        var partes = [];
        partes.push(apikeyId);
        if (uriObjeto.tabla != "") {
            partes.push(uriObjeto.tabla);
        }

        if (registroSeg.readRegister(indice, partes, VRegister.SearchThis) == true) { // Leemos los métodos admitidos
            if (registroSeg.fieldToBool("MET_GET") == true) {
                uriSegMetodos.push("GET");
            }
            if (registroSeg.fieldToBool("MET_PUT") == true) {
                uriSegMetodos.push("PUT");
                uriSegMetodos.push("PATCH");
            }
            if (registroSeg.fieldToBool("MET_POS") == true) {
                uriSegMetodos.push("POST");
            }
            if (registroSeg.fieldToBool("MET_DEL") == true) {
                uriSegMetodos.push("DELETE");
            }

            // -------------------
            // Seguridad de CAMPOS
            // -------------------
            // Leemos los campos admitidos, si no están marcados todos esos son los admitidos en caso de estar marcados todos pasan a ser los excluidos
            apikeyCampos = registroSeg.fieldToString("CAM").split(",");
            var campos = [];
            if (registroSeg.fieldToBool("CAM_TOD") == true) {
                campos = camposTabla(uriObjeto.tabla, apikeyCampos);
            } else {
                if (apikeyCampos.length > 0) {
                    campos = apikeyCampos;
                }
            }

            // Si hay parámetro fields para la tabla se procesan sus campos para dejar solo esos en la lista de campos a retornar
            var campos_tablas = uriObjeto.fields_tablas;
            if (campos_tablas.length) {
                var posicionTabla = campos_tablas.indexOf(uriObjeto.tabla.split("/")[1].toLowerCase());
                if (posicionTabla != -1) {
                    var fieldsCamposId = uriObjeto.fields_campos[posicionTabla].split(",");
                    for (var numCampo = 0; numCampo < fieldsCamposId.length; numCampo++) {                        
						if( fieldsCamposId[numCampo].split(".").length == 1 ){ //Si es un campo propio de la tabla, lo dejamos evaluar normalmente
							if (campos.indexOf(fieldsCamposId[numCampo].split(".")[0].toUpperCase()) != -1) {
								uriSegCampos.push(fieldsCamposId[numCampo].toUpperCase());
							} else {
								uriObjeto.errores.push("No se retornan valores del campo " + fieldsCamposId[numCampo]);
							}
						}else{//si es un campo enlazado a maestro, lo evaluamos individualmente por bloque
							evaluarSeguridadCampoEnlazado(fieldsCamposId[numCampo], fieldsCamposId[numCampo], uriObjeto.tabla, apikeyId, uriObjeto, uriSegCampos );
							//uriObjeto.errores.push("No se retornan valoressss del campo " + fieldsCamposId[numCampo]);
						}
                    }
                }
            } else {
                uriSegCampos = campos;
            }

            // ---------------------
            // Seguridad de PROCESOS
            // ---------------------
            // Leemos los procesos admitidos, si no están marcados todos esos son los admitidos en caso de estar marcados todos pasan a ser los excluidos
            // Solo se calcula cuando se pide un proceso: con PRO_TOD recorre todos los procesos del proyecto
            apikeyProcesos = registroSeg.fieldToString("PRO").split(",");
            if (uriObjeto.recurso !== "_process") {
                uriSegProcesos = [];
            } else if (registroSeg.fieldToBool("PRO_TOD") == true) {
                uriSegProcesos = objetosTipoTablaDestino(VObjectInfo.TypeProcess, uriObjeto.tabla, apikeyProcesos);
            } else {
                if (apikeyProcesos.length > 0) {
                    uriSegProcesos = apikeyProcesos;
                }
            }

            // ----------------------
            // Seguridad de BUSQUEDAS
            // ----------------------
            // Leemos las búsquedas admitidas, si no están marcadas todas esas son las admitidas en caso de estar marcadas todas pasan a ser las excluidas
            // Solo se calcula cuando se pide una búsqueda: con BUS_TOD recorre todas las búsquedas del proyecto
            apikeyBusquedas = registroSeg.fieldToString("BUS").split(",");
            if (uriObjeto.recurso !== "_query") {
                uriSegBusquedas = [];
            } else if (registroSeg.fieldToBool("BUS_TOD") == true) {
                uriSegBusquedas = objetosTipoTablaDestino(VObjectInfo.TypeQuery, uriObjeto.tabla, apikeyBusquedas);
            } else {
                if (apikeyBusquedas.length > 0) {
                    uriSegBusquedas = apikeyBusquedas;
                }
            }
        }
    } else {
        uriObjeto.errores.push("El API Key de la solicitud no es válido");
    }

    // Añadimos los datos de seguridad al objeto
    uriObjeto.seg_metodos = uriSegMetodos;
    uriObjeto.seg_campos = uriSegCampos;
    uriObjeto.seg_procesos = uriSegProcesos;
    uriObjeto.seg_busquedas = uriSegBusquedas;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * valorCampoJSON [Devuelve el valor de un campo en formato JSON]
 *
 * @param {[VRegister]} registro Registro del que se obtendrá el valor del campo
 * @param {[Number]} campo Numero de campo del registro
 * @param {Number} campoTipoObjeto Opcional: tipo de objeto del campo ya resuelto (evita buscarlo por registro)
 * @returns {String} Devuelve una cadena de texto con el valor del campo en formato JSON
 * ----------------------------------------------------------------------------------------------------
 **/
function valorCampoJSON(registro, campoId, campoTipo, imageAsUrl, hostUrl, campoTipoObjeto) { // Preparamos las variables de trabajo
    var valor = "";

    // Obtenemos el valor en función del tipo de campo
    switch (campoTipo) {
        case VTableInfo.FieldTypeDateTime: // Campos de tipo tiempo (fecha y hora)
        case VTableInfo.FieldTypeFormulaDateTime: // Campos de tipo fórmula fecha y hora (mismo tratamiento)
            valor = registro.fieldToDateTime(campoId).toJSON();
            break;

        case VTableInfo.FieldTypeTime: // Campos de tipo hora
            valor = registro.fieldToTime(campoId).toString();
            break;

        case VTableInfo.FieldTypeDate:
        case VTableInfo.FieldTypeFormulaDate: // Campos de tipo fórmula fecha (mismo tratamiento)
            // Campos de tipo fecha
            // Componemos una nueva fecha UTC ya que la del campo viene con la diferencia horaria local
            var fecha = registro.fieldToDate(campoId);
            valor = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())).toJSON();
            break;

        case VTableInfo.FieldTypeBool: // Campos de tipo booleano
            valor = (registro.fieldToInt(campoId) == 1) ? true : false;
            break;

        case VTableInfo.FieldTypeNumeric: // Campos de tipo numérico
        case VTableInfo.FieldTypeFormulaNumeric: // Campos de tipo fórmula numérica (mismo tratamiento; antes se devolvía como texto)
            valor = registro.fieldToDouble(campoId);
            break;

        case VTableInfo.FieldTypeObject: // Campos de tipo objeto
            // El tipo de objeto llega precalculado desde listaToObjeto; si no, se resuelve acá
            if (campoTipoObjeto === undefined) {
                campoTipoObjeto = registro.tableInfo().fieldObjectType(registro.tableInfo().findField(campoId));
            }
            switch (campoTipoObjeto) {
                case VTableInfo.ObjectTypeText: // Objeto texto
                case VTableInfo.ObjectTypeRichText: // Objeto texto enriquecido
                case VTableInfo.ObjectTypeFormula: // Objeto fórmula
                    // Si el contenido es un JSON se devuelve el JSON sin tratar, si no el texto.
                    // Se lee el campo una sola vez y se parsea una sola vez (antes: hasta 3 lecturas y 2 parseos).
                    var texto = registro.fieldToString(campoId);
                    try {
                        valor = JSON.parse(texto);
                    } catch (e) {
                        valor = texto;
                    }
                    break;

                case VTableInfo.ObjectTypePicture: // Objeto dibujo
                    var imagen = registro.fieldToImage(campoId);
                    if (imagen) {
                        // Comportamiento histórico: Base64 inline. Si se pide image_as_url=true
                        // se devuelve en cambio una URL al endpoint /_image/{tabla}/{id}/{campo} (payload liviano).
                        if (imageAsUrl === true && hostUrl) {
                            var tablaIdImg = registro.tableInfo().id().toLowerCase();
                            var registroIdImg = registro.fieldToString("ID");
                            valor = hostUrl + "/_image/" + tablaIdImg + "/" + registroIdImg + "/" + campoId.toLowerCase();
                        } else {
                            valor = imagenToBase64(imagen);
                        }
                    }
                    break;
            }
            break;

        default: // El resto de tipos de campos
            valor = registro.fieldToString(campoId);
    }

    // Retornamos el valor del campo
    return valor;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * tablaIdRef [Devuelve el idRef del identificador de una tabla]
 * 
 * @param {[String]} tablaId [Requerido Identificador de la tabla]
 * @return {String} idRef de la tabla
 * ----------------------------------------------------------------------------------------------------
 **/
function tablaIdRef(tablaId) { // Se lee el proyecto principal
    var proyecto = theApp.mainProjectInfo();

    // Se repasan todas las tablas buscando la recibida en el parámetro
    for (var numTabla = 0; numTabla < proyecto.allTableCount(); numTabla++) {
        if (proyecto.allTableInfo(numTabla).id() == tablaId) {
            return proyecto.allTableInfo(numTabla).idRef();
        }
    }

    // Si no se ha encontrado se devuelve null
    return null;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * objetoIdRef [Devuelve el idRef del identificador de un objeto]
 * 
 * @param {[String]} objetoTipo [Requerido Tipo de objeto] 
 * @param {[String]} objetoId [Requerido Identificador del objeto]
 * @return {String} idRef del objeto
 * ----------------------------------------------------------------------------------------------------
 **/
function objetoIdRef(objetoTipo, objetoId) { // Se lee el proyecto principal
    var proyecto = theApp.mainProjectInfo();

    // Se repasan todos los objetos tablas buscando la recibida en el parámetro
    for (var numObjeto = 0; numObjeto < proyecto.allObjectCount(objetoTipo); numObjeto++) {
        if (proyecto.allObjectInfo(objetoTipo, numObjeto).id() == objetoId) {
            return proyecto.allObjectInfo(objetoTipo, numObjeto).idRef();
        }
    }

    // Si no se ha encontrado se devuelve null
    return null;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * tablaDestinoIdRef [Devuelve el idRef de la tabla de destino de un objeto]
 * 
 * @param {[String]} objetoTipo [Requerido Tipo de objeto]  
 * @param {[String]} objetoIdRef [Requerido Identificador de referencia del objeto]
 * @return {String} idRef de la tabla de destino del objeto
 * ----------------------------------------------------------------------------------------------------
 **/
function tablaDestinoIdRef(objetoTipo, objetoIdRef) {

    var tablaDestinoIdRef = "";

    // Obtenemos el proyecto
    var objetoProyecto = theApp.projectInfo(objetoIdRef.split("/")[0]);
    if (objetoProyecto) { // Obtenemos el objectInfo del objeto
        var objetoId = objetoIdRef.split("/")[1];
        var objetoInfo = objetoProyecto.objectInfo(objetoTipo, objetoId);
        if (objetoInfo) { // Analizamos la salida del objeto
            if (objetoInfo.outputType() != VObjectInfo.IONone) {
                tablaDestinoIdRef = objetoInfo.outputTable().idRef();
            }
        }
    }

    // Retornamos el idRef de la tabla de destino del objeto
    return tablaDestinoIdRef;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * Lista objetos de tipo y tabla de destino [Devuelve array con idRefs de objetos de un tipo y tabla destino]
 * 
 * @param {[String]} tipoObjeto [Requerido tipo de objeto]
 * @param {[String]} tablaDestino [Requerido idRef de la tabla de destino de los objetos]
 * @param {[Array]} objetosExcluir [Requerido Array de idRefs de los obtejos a excluir de la lista a retornar]
 * @return [{String}] objetosIdRef [Array de idRefs de los objetos]
 * ----------------------------------------------------------------------------------------------------
 **/
function objetosTipoTablaDestino(tipoObjeto, tablaDestinoIdRef, objetosExcluir) { // Se preparan las variables de trabajo
    var objetosIdRef = [];
    var proyectoPrincipal = theApp.mainProjectInfo();

    // Leer todos los objetos del tipo
    var numObjetos = proyectoPrincipal.allObjectCount(tipoObjeto);
    for (var numObjeto = 0; numObjeto < numObjetos; numObjeto++) { // Si el objeto no es privado y su tabla de destino se corresponde con la solicitada se añade al array a retornar
        var objeto = proyectoPrincipal.allObjectInfo(tipoObjeto, numObjeto);
        if ((objeto.isPrivate() == false) && (objeto.outputTable().idRef() == tablaDestinoIdRef)) { // Se verifica que el objeto no esté en el array de objetos a excluir recibido
            if (objetosExcluir.indexOf(objeto.idRef()) == -1) {
                objetosIdRef.push(objeto.idRef());
            }
        }
    }

    // Retornamos el array con los idRefs de los objetos encontrados
    return objetosIdRef;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * Lista de campos de un tabla [Devuelve array con identificadores de campos no privados de un tabla]
 * 
 * @param {[String]} tablaIdRef [Requerido idRef de la tabla]
 * @param {[Array]} camposExcluir [Requerido Array de identificadores de los campos a excluir de la lista a retornar]
 * @return [{String}] camposId [Array de identificadores de los campos]
 * ----------------------------------------------------------------------------------------------------
 **/
function camposTabla(tablaIdRef, camposExcluir) { // Se preparan las variables de trabajo
    var camposId = [];

    // Obtenemos el tableInfo de la tabla recibida
    var proyectoInfo = theApp.projectInfo(tablaIdRef.split("/")[0]);
    var tablaInfo = proyectoInfo.objectInfo(VObjectInfo.TypeTable, tablaIdRef.split("/")[1]);
    if (tablaInfo) { // Leemos los campos de la tabla
        var numCampos = tablaInfo.subObjectCount(VObjectInfo.TypeField);
        for (var numCampo = 0; numCampo < numCampos; numCampo++) { // Si el campo no es privado se añade a lista de retorno
            var campo = tablaInfo.subObjectInfo(VObjectInfo.TypeField, numCampo);
            if (campo.isPrivate() == false) { // Se verifica que el campo no esté en el array de campos a excluir recibido
                if (camposExcluir.indexOf(campo.id()) === -1) {
                    camposId.push(campo.id());
                }
            }
        }
    }

    // Retornamos la lista de campos obtenidos
    return camposId;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * tablaObjeto [Devuelve un objeto con el tablaInfo del idRef recibido]
 * 
 * @param {[tablaIdRef]} IdRef de la tabla [Requerido]
 * @return {Object} objeto de la clase VTableInfo
 * ----------------------------------------------------------------------------------------------------
 **/
function tablaObjeto(tablaIdRef) {

    var proyectoAlias = tablaIdRef.split("/")[0];
    var tablaId = tablaIdRef.split("/")[1];
    var proyectoInfo = theApp.projectInfo(proyectoAlias);
    var tablaInfo = proyectoInfo.tableInfo(tablaId);
    return tablaInfo;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * imagenToBase64 [Devuelve una cadena con el valor de una imagen en base64]
 * 
 * @param {[VImage]} imagen [Requerido objeto de la clase VImage]
 * @return {String} cadena que representa la imagen en base64
 * ----------------------------------------------------------------------------------------------------
 **/
function imagenToBase64(imagen) {

    var byteArray = new VByteArray();
    byteArray = imagen.saveToData("PNG", 0);
    var imagenBase64 = byteArray.toBase64().toLatin1String();
    return imagenBase64;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * imagenFromBase64 [Devuelve una imagen a partir de una cadena en base64]
 * 
 * @param {[imagenBase64]} cadena que contiene una imagen en formato base 64
 * @return {VImage} objeto de la clase VImage
 * ----------------------------------------------------------------------------------------------------
 **/
function imagenFromBase64(imagenBase64) { // Convertimos el buffer en base64 en un byteArray
    var ba = new VByteArray();
    var ba64 = new VByteArray();
    ba.setText(imagenBase64);
    ba64.fromBase64(ba);

    // Intentamos obtener la imagen en 4 formatos diferentes soportados
    var imagen = new VImage();
    imagenOk = imagen.loadFromData(ba64, "PNG");
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "JPG");
    }
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "JPEG");
    }
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "BMP");
    }

    // Retornamos la imagen obtenida
    return imagen;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * esValidoJson [Devuelve true si el JSON es válido]
 * 
 * @param {json} Objeto JSON
 * @return {Boolean} True si es válido el JSON y false si tiene errores
 * ----------------------------------------------------------------------------------------------------
 **/
function esValidoJson(json) {

    try {
        JSON.parse(json);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * ----------------------------------------------------------------------------------------------------
 * setError [Añade error al array de respuesta]
 * 
 * @codigo {String} Codigo de error
 * @mensaje {String} Mensaje de error
 * @uriObjeto {string} Objeto
 * ----------------------------------------------------------------------------------------------------
 **/
function setError(codigoError, mensajeError, uriObjeto) {
	uriObjeto.errores.push( { "status": codigoError, "message": mensajeError } );
	uriObjeto.status = codigoError;
	uriObjeto.status_text = mensajeError;
}


// =============================================================================
// FUNCIONES AGREGADAS - filtros avanzados, caché y performance
// =============================================================================

function parseFechaUTC(val) {
    if (!val) return 0;
    val = val.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        var p = val.split('/');
        return Date.UTC(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        var p = val.split('-');
        return Date.UTC(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }
    return new Date(val).getTime();
}

function obtenerCampoDeIndice(tablaIdRef, indiceId) {
    try {
        var pAlias = tablaIdRef.split("/")[0];
        var tId    = tablaIdRef.split("/")[1];
        var pInfo  = theApp.projectInfo(pAlias);
        if (!pInfo) return null;
        var tInfo  = pInfo.objectInfo(VObjectInfo.TypeTable, tId);
        if (!tInfo) return null;
        var n = tInfo.subObjectCount(VObjectInfo.TypeIndex);
        for (var i = 0; i < n; i++) {
            var idx = tInfo.subObjectInfo(VObjectInfo.TypeIndex, i);
            if (idx.id().toUpperCase() === indiceId.toUpperCase()) {
                if (idx.subObjectCount(VObjectInfo.TypeIndexPart) > 0) {
                    return idx.subObjectInfo(VObjectInfo.TypeIndexPart, 0).id();
                }
            }
        }
    } catch(e) {}
    return null;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * obtenerPartesClave [Devuelve array con las partes de una clave, soportando claves compuestas]
 *
 * Para tablas Sub-Maestro con índice compuesto, se usa "~" como separador en la URL.
 * Ejemplo: identificador "1~5" → ["1", "5"] (PLA_IMP=1, ID=5)
 * Identificador simple "5" → ["5"] (compatible con comportamiento anterior)
 *
 * @param {String} identificador Cadena del identificador recibido en la URL
 * @return {Array} Array con las partes de la clave
 * ----------------------------------------------------------------------------------------------------
 **/
function obtenerPartesClave(identificador) {
    if (identificador.indexOf('~') !== -1) {
        return identificador.split('~');
    }
    return [identificador];
}

/**
 * validarBody [Valida tipos de datos del body antes de insertar o modificar un registro]
 *
 * Verifica que cada campo enviado exista en la tabla y que su valor sea del tipo correcto.
 * No valida valores vacíos/null (se consideran "sin valor" y Velneo aplica defaults).
 *
 * @param {Object}     body      Objeto JSON con los campos a validar (un solo registro)
 * @param {VTableInfo} tablaInfo TableInfo de la tabla destino
 * @param {Object}     uriObjeto Objeto de la request (para setError)
 * @return {Boolean}   true si todo OK; false si hay error de tipo o campo inexistente
 **/
function validarBody(body, tablaInfo, uriObjeto) {
    for (var propiedad in body) {
        if (propiedad.toLowerCase() === 'registros') continue;
        var campoId     = propiedad.toUpperCase();
        var campoNumero = tablaInfo.findField(campoId);

        if (campoNumero === -1) {
            setError("400", "El campo '" + propiedad + "' no existe en la tabla", uriObjeto);
            return false;
        }

        var campoTipo  = tablaInfo.fieldType(campoNumero);
        var campoValor = body[propiedad];

        if (campoValor === null || campoValor === undefined || campoValor === "") continue;

        if (campoTipo === VTableInfo.FieldTypeNumeric) {
            if (isNaN(Number(campoValor))) {
                setError("400", "El campo '" + propiedad + "' debe ser numérico (recibido: '" + campoValor + "')", uriObjeto);
                return false;
            }
        } else if (campoTipo === VTableInfo.FieldTypeBool) {
            if (campoValor !== true && campoValor !== false && campoValor !== 1 && campoValor !== 0) {
                setError("400", "El campo '" + propiedad + "' debe ser booleano: true/false o 1/0", uriObjeto);
                return false;
            }
        } else if (campoTipo === VTableInfo.FieldTypeDate || campoTipo === VTableInfo.FieldTypeDateTime) {
            if (isNaN(new Date(campoValor).getTime())) {
                setError("400", "El campo '" + propiedad + "' no tiene formato de fecha válido (recibido: '" + campoValor + "')", uriObjeto);
                return false;
            }
        }
    }
    return true;
}

/**
 * obtenerMapaIndicesPorCampo [Devuelve mapa { CAMPO_ID: INDICE_ID } con el índice de cada campo]
 *
 * Por cada campo se toma el índice que se llama igual que el campo y cuya primera parte es ese
 * campo (convención de Velneo para el índice "completo" del campo). Puede tener más partes
 * (ej. VTA_PRE + NUM_LIN en las líneas): cargar con una sola clave resuelve la primera parte
 * y la lista sigue ordenada por ese campo. El campo de la parte se lee de su propiedad "Campo"
 * porque el id de la parte puede ser otro (ej. índice CLT con parte CLT_ENT).
 *
 * Condición para indexar: se aceptan los índices sin condición y los de "#OFF = 0" (no incluyen
 * los registros desactivados, igual que las listas del vClient — decisión 2026-10-16). Cualquier
 * otra condición deja afuera registros que la búsqueda tiene que ver, así que esos no se usan
 * (ej. VTA_PED_LIN_G: where[vta_ped][eq] devolvía 0 al tomar un índice condicionado de VTA_PED).
 *
 * Solo tipos "clave única" o "acepta repetidas": los de palabras / trozos de palabras /
 * múltiples claves indexan cada palabra por separado (repetidos y sin el orden del campo).
 * El resultado se guarda por tabla para no recorrer los metadatos más de una vez por petición.
 *
 * @param {String} tablaIdRef  IdRef de la tabla (ej: "alias/TABLA_ID")
 * @return {Object} Mapa campo → indice
 **/
var cacheMapaIndicesPorCampo = {};
function obtenerMapaIndicesPorCampo(tablaIdRef) {
    if (cacheMapaIndicesPorCampo[tablaIdRef]) return cacheMapaIndicesPorCampo[tablaIdRef];
    var mapa = {};
    try {
        var pAlias = tablaIdRef.split("/")[0];
        var tId    = tablaIdRef.split("/")[1];
        var pInfo  = theApp.projectInfo(pAlias);
        if (!pInfo) return mapa;
        var tInfo  = pInfo.objectInfo(VObjectInfo.TypeTable, tId);
        if (!tInfo) return mapa;
        var tablaInfo = pInfo.tableInfo(tId);
        var n = tInfo.subObjectCount(VObjectInfo.TypeIndex);
        for (var i = 0; i < n; i++) {
            try {
                var idx = tInfo.subObjectInfo(VObjectInfo.TypeIndex, i);
                if (idx.subObjectCount(VObjectInfo.TypeIndexPart) < 1) continue;
                var indiceId = idx.id().toUpperCase();
                var parte = idx.subObjectInfo(VObjectInfo.TypeIndexPart, 0);
                var campoId = (leerPropiedadObjeto(parte, ["campo", "field"]) || parte.id()).toUpperCase();
                if (indiceId !== campoId) continue;
                var condicion = (leerPropiedadObjeto(idx, ["condici", "condition"]) || "").replace(/\s/g, "").toUpperCase();
                if (condicion !== "" && condicion !== "#OFF=0") continue;
                // Tipos de índice: 0 = clave única, 3 = acepta repetidas (ver enum VTableInfo IndexType*)
                var numIndice = tablaInfo ? tablaInfo.findIndex(idx.id()) : -1;
                var tipoIndice = (numIndice !== -1) ? tablaInfo.indexType(numIndice) : -1;
                if (tipoIndice !== 0 && tipoIndice !== 3) continue;
                mapa[campoId] = idx.id();
            } catch(eIdx) {}
        }
    } catch(e) {}
    cacheMapaIndicesPorCampo[tablaIdRef] = mapa;
    return mapa;
}

/**
 * leerPropiedadObjeto [Devuelve como texto la primera propiedad cuyo nombre contenga alguno de los patrones]
 * Si la propiedad referencia otro objeto (ej. el campo de una parte de índice) devuelve su id.
 * Devuelve null si no la encuentra o no se puede leer.
 **/
function leerPropiedadObjeto(objeto, patrones) {
    try {
        var numPropiedades = objeto.propertyCount();
        for (var p = 0; p < numPropiedades; p++) {
            var nombre = String(objeto.propertyName(p)).toLowerCase();
            for (var k = 0; k < patrones.length; k++) {
                if (nombre.indexOf(patrones[k]) === 0) {
                    try {
                        var ref = objeto.propertyObjectInfo(p);
                        if (ref && !ref.isNull() && ref.id()) return String(ref.id());
                    } catch (eRef) {}
                    var dato = objeto.propertyData(p);
                    return (dato === null || dato === undefined) ? "" : String(dato);
                }
            }
        }
    } catch (e) {}
    return null;
}

/**
 * parsearCondicionesWhere [Convierte entradas "[CAMPO][operador]=valor" en condiciones preparadas]
 *
 * Deja los valores ya convertidos según el tipo de campo (número, fecha en ms UTC, texto en
 * minúsculas, mapas para in/nin) para no reconvertirlos por cada registro.
 *
 * @param {Array}      where     Entradas "[CAMPO][operador]=valor"
 * @param {VTableInfo} tablaInfo TableInfo de la tabla
 * @return {Array} Condiciones { campo, operador, valor, esNumerico, esFecha, esFechaHora, esAlfa, ... }
 **/
function parsearCondicionesWhere(where, tablaInfo) {
    var condiciones = [];
    for (var i = 0; i < where.length; i++) {
        var entrada = where[i];
        var eqPos = entrada.indexOf('=');
        if (eqPos === -1) continue;
        var clave = entrada.substring(0, eqPos);
        var valor = entrada.substring(eqPos + 1);
        var partes = clave.match(/\[([^\]]+)\]/g);
        if (!partes || partes.length < 2) continue;
        var campo    = partes[0].substring(1, partes[0].length - 1).toUpperCase();
        var operador = partes[1].substring(1, partes[1].length - 1).toLowerCase();
        condiciones.push({ campo: campo, operador: operador, valor: valor });
    }

    for (var c = 0; c < condiciones.length; c++) {
        var campoNum  = tablaInfo.findField(condiciones[c].campo);
        var campoTipo = tablaInfo.fieldType(campoNum);
        condiciones[c].esNumerico  = (campoTipo === VTableInfo.FieldTypeNumeric);
        condiciones[c].esFecha     = (campoTipo === VTableInfo.FieldTypeDate);
        condiciones[c].esFechaHora = (campoTipo === VTableInfo.FieldTypeDateTime);
        condiciones[c].esAlfa      = (campoNum !== -1) && ((campoTipo >= VTableInfo.FieldTypeAlpha256 && campoTipo <= VTableInfo.FieldTypeAlphaUtf16) || campoTipo === VTableInfo.FieldTypeFormulaAlfa);
        var op  = condiciones[c].operador;
        var val = condiciones[c].valor;
        var esFechaPrec = condiciones[c].esFecha || condiciones[c].esFechaHora;
        if (op === "between") {
            var rango = val.split(",");
            if (esFechaPrec) { condiciones[c].rangoMinMs = parseFechaUTC(rango[0]); condiciones[c].rangoMaxMs = parseFechaUTC(rango[1]); }
            else { condiciones[c].rangoMin = condiciones[c].esNumerico ? parseFloat(rango[0]) : rango[0]; condiciones[c].rangoMax = condiciones[c].esNumerico ? parseFloat(rango[1]) : rango[1]; }
        } else if (op === "in" || op === "nin") {
            var opts = val.split(",");
            if (condiciones[c].esNumerico) { var m = {}; for (var oi=0;oi<opts.length;oi++) m[parseFloat(opts[oi])]=true; condiciones[c].opcionesNumMap = m; }
            else { var m = {}; for (var oi=0;oi<opts.length;oi++) m[opts[oi].toLowerCase()]=true; condiciones[c].opcionesLowerMap = m; }
        } else if (esFechaPrec) {
            condiciones[c].valorFechaMs = parseFechaUTC(val);
        } else if (condiciones[c].esNumerico) {
            condiciones[c].valorNum = parseFloat(val);
        } else {
            condiciones[c].valorLower = val.toLowerCase();
        }
    }
    return condiciones;
}

/**
 * aplicarCondicionesClavePorIndice [Resuelve las condiciones eq / in sobre campos indexados]
 *
 * Cada valor es una carga por clave del índice (lo mismo que "cargar lista" del vClient), sin leer
 * fichas. La carga por clave es exacta también en campos alfabéticos (verificado: filter[EST]=P
 * devuelve lo mismo que recorrer con starts), así que no se vuelve a evaluar registro a registro.
 *
 * @param {Array}    condiciones  Condiciones de parsearCondicionesWhere
 * @param {Object}   mapaIndices  Mapa campo → índice (obtenerMapaIndicesPorCampo)
 * @param {String}   tablaIdRef   IdRef de la tabla
 * @param {Function} aplicar      Recibe el VRegisterList resultante y lo aplica a la lista de trabajo
 * @param {Function} estaVacia    Devuelve true si la lista de trabajo ya quedó vacía
 * @return {Array} Condiciones que quedan por evaluar registro a registro
 **/
function aplicarCondicionesClavePorIndice(condiciones, mapaIndices, tablaIdRef, aplicar, estaVacia) {
    var restantes = [];
    for (var c = 0; c < condiciones.length; c++) {
        var cond = condiciones[c];
        var indice = mapaIndices[cond.campo];
        if (!indice || (cond.operador !== "eq" && cond.operador !== "in") || estaVacia()) {
            restantes.push(cond);
            continue;
        }

        var valores = (cond.operador === "in") ? cond.valor.split(",") : [cond.valor];
        var conjunto = new VRegisterList(theRoot);
        var parcial = new VRegisterList(theRoot);
        conjunto.setTable(tablaIdRef);
        parcial.setTable(tablaIdRef);
        var vistos = {};
        for (var v = 0; v < valores.length; v++) {
            if (vistos[valores[v]] === true) continue;
            vistos[valores[v]] = true;
            parcial.clear();
            parcial.load(indice, [valores[v]]);
            conjunto.append(parcial);
        }
        aplicar(conjunto);
    }
    return restantes;
}

/**
 * aplicarCondicionesRangoPorIndice [Resuelve gt/gte/lt/lte/between sobre campos numéricos o fecha indexados]
 *
 * Junta todas las condiciones de rango de un mismo campo en un único [mínimo, máximo] y lo resuelve
 * con cargarRangoPorIndice (búsqueda binaria en el índice ordenado). Las demás condiciones se devuelven.
 **/
function aplicarCondicionesRangoPorIndice(condiciones, mapaIndices, tablaIdRef, aplicar, estaVacia) {
    var restantes = [];
    var rangos = {};
    var camposOrden = [];
    for (var c = 0; c < condiciones.length; c++) {
        var cond = condiciones[c];
        var op = cond.operador;
        var esRango = (op === "gt" || op === "gte" || op === "lt" || op === "lte" || op === "between");
        var esFecha = cond.esFecha || cond.esFechaHora;
        if (!esRango || !mapaIndices[cond.campo] || !(cond.esNumerico || esFecha)) {
            restantes.push(cond);
            continue;
        }

        if (!rangos[cond.campo]) {
            rangos[cond.campo] = { min: null, incluyeMin: true, max: null, incluyeMax: true,
                                   tipo: cond.esFechaHora ? "fechaHora" : (cond.esFecha ? "fecha" : "numero") };
            camposOrden.push(cond.campo);
        }
        var r = rangos[cond.campo];
        var valor = esFecha ? cond.valorFechaMs : cond.valorNum;
        if (op === "between") {
            acotarMinimo(r, esFecha ? cond.rangoMinMs : cond.rangoMin, true);
            acotarMaximo(r, esFecha ? cond.rangoMaxMs : cond.rangoMax, true);
        } else if (op === "gte" || op === "gt") {
            acotarMinimo(r, valor, op === "gte");
        } else {
            acotarMaximo(r, valor, op === "lte");
        }
    }

    for (var i = 0; i < camposOrden.length; i++) {
        if (estaVacia()) break;
        var campo = camposOrden[i];
        aplicar(cargarRangoPorIndice(tablaIdRef, mapaIndices[campo], campo, rangos[campo]));
    }
    return restantes;
}

function acotarMinimo(r, valor, incluye) {
    if (valor === null || valor === undefined || isNaN(valor)) return;
    if (r.min === null || valor > r.min) { r.min = valor; r.incluyeMin = incluye; }
    else if (valor === r.min && !incluye) { r.incluyeMin = false; }
}

function acotarMaximo(r, valor, incluye) {
    if (valor === null || valor === undefined || isNaN(valor)) return;
    if (r.max === null || valor < r.max) { r.max = valor; r.incluyeMax = incluye; }
    else if (valor === r.max && !incluye) { r.incluyeMax = false; }
}

// Hasta este nº de registros dentro del rango se leen las fichas; con más se recorta la lista del
// índice en memoria (quitar posiciones no lee fichas)
var UMBRAL_RANGO_LECTURA = 200;

/**
 * cargarRangoPorIndice [Devuelve los registros cuyo campo está dentro del rango, usando el índice]
 *
 * La carga del índice trae solo números de registro, ya ordenados por el campo. Con búsqueda
 * binaria se ubican las posiciones de inicio y fin del rango leyendo ~2·log2(n) fichas
 * (unas 40 en una tabla de un millón), en vez de leer todas las fichas desde el principio.
 *
 * @param {String} tablaIdRef IdRef de la tabla
 * @param {String} indice     Índice de una parte sobre el campo (clave única o acepta repetidas)
 * @param {String} campoId    Campo del índice
 * @param {Object} rango      { min, incluyeMin, max, incluyeMax, tipo: "numero"|"fecha"|"fechaHora" }
 * @return {VRegisterList} Registros dentro del rango, en orden del índice
 **/
function cargarRangoPorIndice(tablaIdRef, indice, campoId, rango) {
    var listaIdx = new VRegisterList(theRoot);
    listaIdx.setTable(tablaIdRef);
    listaIdx.load(indice, []);
    var n = listaIdx.size();

    var valorEn = function (posicion) {
        return valorOrdenableCampo(listaIdx.readAt(posicion), campoId, rango.tipo);
    };

    var desde = 0;
    var hasta = n;
    if (rango.min !== null) {
        desde = primeraPosicionQueCumple(n, valorEn, function (v) { return rango.incluyeMin ? (v >= rango.min) : (v > rango.min); });
    }
    if (rango.max !== null) {
        hasta = primeraPosicionQueCumple(n, valorEn, function (v) { return rango.incluyeMax ? (v > rango.max) : (v >= rango.max); });
    }

    var conjunto = new VRegisterList(theRoot);
    conjunto.setTable(tablaIdRef);
    if (hasta <= desde) return conjunto;

    var enRango = hasta - desde;
    if (enRango <= UMBRAL_RANGO_LECTURA || enRango * 20 <= (n - enRango)) {
        for (var i = desde; i < hasta; i++) {
            var reg = listaIdx.readAt(i);
            if (reg) conjunto.append(reg);
        }
        return conjunto;
    }

    // Rango grande: se recortan las puntas de la lista del índice sin leer fichas
    for (var j = n - 1; j >= hasta; j--) {
        listaIdx.removeAt(j);
    }
    if (desde > 0) {
        listaIdx.invert();
        for (var k = 0; k < desde; k++) {
            listaIdx.removeAt(listaIdx.size() - 1);
        }
        listaIdx.invert();
    }
    return listaIdx;
}

/**
 * primeraPosicionQueCumple [Búsqueda binaria: primera posición de [0, n) cuyo valor cumple la condición]
 * La condición debe ser monótona sobre la lista ordenada (false ... false, true ... true).
 **/
function primeraPosicionQueCumple(n, valorEn, cumple) {
    var lo = 0;
    var hi = n;
    while (lo < hi) {
        var mid = (lo + hi) >>> 1;
        if (cumple(valorEn(mid))) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

/**
 * valorOrdenableCampo [Valor numérico comparable de un campo número / fecha / fecha-hora]
 * Las fechas vacías o inválidas quedan como -Infinity (en el índice ordenan primero).
 **/
function valorOrdenableCampo(registro, campoId, tipo) {
    if (!registro) return -Infinity;
    var valor;
    if (tipo === "fechaHora") {
        var dt = registro.fieldToDateTime(campoId);
        valor = dt ? dt.getTime() : NaN;
    } else if (tipo === "fecha") {
        var d = registro.fieldToDate(campoId);
        valor = d ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) : NaN;
    } else {
        valor = registro.fieldToDouble(campoId);
    }
    return isNaN(valor) ? -Infinity : valor;
}

/**
 * filtrarListaPorCondiciones [Evalúa registro a registro las condiciones que no tienen índice]
 *
 * Arma una lista nueva con los registros que cumplen (en vez de quitar uno por uno con removeAt,
 * que en listas grandes reacomoda la lista en cada baja) y la deja en la lista recibida.
 **/
function filtrarListaPorCondiciones(lista, condiciones, tablaIdRef) {
    if (!condiciones || condiciones.length === 0) return;

    var listaOk = new VRegisterList(theRoot);
    listaOk.setTable(tablaIdRef || lista.tableInfo().idRef());

    var numRegistros = lista.size();
    for (var numReg = 0; numReg < numRegistros; numReg++) {
        var registro = lista.readAt(numReg);
        if (!registro) continue;
        var eliminar = false;
        for (var c = 0; c < condiciones.length; c++) {
            var cond = condiciones[c];
            var op   = cond.operador;
            var esNum  = cond.esNumerico;
            var esFecha = cond.esFecha || cond.esFechaHora;
            var valorCampo;
            if (esNum) { valorCampo = registro.fieldToDouble(cond.campo); }
            else if (cond.esFechaHora) { var dt = registro.fieldToDateTime(cond.campo); valorCampo = dt ? dt.getTime() : 0; }
            else if (cond.esFecha) { var d = registro.fieldToDate(cond.campo); valorCampo = d ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) : 0; }
            else { valorCampo = registro.fieldToString(cond.campo); }
            var valorLow = (esNum || esFecha) ? "" : valorCampo.toLowerCase();
            var cumple = true;
            switch (op) {
                case "eq":  cumple = esFecha ? (valorCampo===cond.valorFechaMs) : (esNum ? (valorCampo===cond.valorNum) : (valorLow===cond.valorLower)); break;
                case "ne":  cumple = esFecha ? (valorCampo!==cond.valorFechaMs) : (esNum ? (valorCampo!==cond.valorNum) : (valorLow!==cond.valorLower)); break;
                case "like":   cumple = (valorLow.indexOf(cond.valorLower) !== -1); break;
                case "starts": cumple = (valorLow.indexOf(cond.valorLower) === 0); break;
                case "gt":  cumple = esFecha ? (valorCampo>cond.valorFechaMs)  : (esNum ? (valorCampo>cond.valorNum)  : (valorCampo>cond.valor)); break;
                case "gte": cumple = esFecha ? (valorCampo>=cond.valorFechaMs) : (esNum ? (valorCampo>=cond.valorNum) : (valorCampo>=cond.valor)); break;
                case "lt":  cumple = esFecha ? (valorCampo<cond.valorFechaMs)  : (esNum ? (valorCampo<cond.valorNum)  : (valorCampo<cond.valor)); break;
                case "lte": cumple = esFecha ? (valorCampo<=cond.valorFechaMs) : (esNum ? (valorCampo<=cond.valorNum) : (valorCampo<=cond.valor)); break;
                case "between": cumple = esFecha ? (valorCampo>=cond.rangoMinMs && valorCampo<=cond.rangoMaxMs) : (valorCampo>=cond.rangoMin && valorCampo<=cond.rangoMax); break;
                case "in":  cumple = esNum ? (cond.opcionesNumMap[valorCampo]===true) : (cond.opcionesLowerMap[valorLow]===true); break;
                case "nin": cumple = esNum ? (cond.opcionesNumMap[valorCampo]!==true) : (cond.opcionesLowerMap[valorLow]!==true); break;
                case "empty": cumple = (cond.valorLower==="true") ? (esNum ? (valorCampo===0) : (valorCampo==="")) : (esNum ? (valorCampo!==0) : (valorCampo!=="")); break;
                default: cumple = true;
            }
            if (!cumple) { eliminar = true; break; }
        }
        if (!eliminar) listaOk.append(registro);
    }

    lista.clear();
    lista.append(listaOk);
}

/**
 * whereFilter [Aplica condiciones where sobre una lista ya cargada]
 * Se mantiene por compatibilidad; listaFiltrarOrdenarPaginar usa directamente las funciones de arriba.
 **/
function whereFilter(lista, where, tablaInfo, tablaIdRef) {
    if (!where || where.length === 0) return;
    var condiciones = parsearCondicionesWhere(where, tablaInfo);
    if (condiciones.length === 0) return;
    if (tablaIdRef) {
        condiciones = aplicarCondicionesClavePorIndice(condiciones, obtenerMapaIndicesPorCampo(tablaIdRef), tablaIdRef,
            function (conjunto) { lista.cross(conjunto); },
            function () { return lista.size() === 0; });
    }
    if (lista.size() > 0) {
        filtrarListaPorCondiciones(lista, condiciones, tablaIdRef);
    }
}

/**
 * ----------------------------------------------------------------------------------------------------
 * validarPunterosExisten [Valida que cada campo puntero (FK) del body referencie un maestro existente]
 *
 * Velneo NO valida punteros por defecto: un ID inexistente se graba como puntero "colgado".
 * Esta función recorre los campos enviados, detecta los que son puntero a tabla y verifica
 * que el maestro referenciado exista. Si alguno no existe, setea error 409 y devuelve false.
 *
 * - No valida valores vacíos / 0 (se consideran "sin referencia").
 * - Omite enlaces a tablas estáticas (fieldBindType == 2) salvo validarEstaticas == true.
 * - "Fail open": si por metadatos no puede resolver un campo, NO bloquea (continúa).
 *
 * @param {VTableInfo} tablaInfo   tableInfo de la tabla destino
 * @param {Object}     registroBody objeto JSON con los campos a grabar (un registro)
 * @param {Object}     uriObjeto    objeto de la request (para setError)
 * @param {Boolean}    validarEstaticas opcional, incluir enlaces a tablas estáticas
 * @return {Boolean}   true si todo OK; false si encontró una FK inexistente
 * ----------------------------------------------------------------------------------------------------
 **/
function validarPunterosExisten(tablaInfo, registroBody, uriObjeto, validarEstaticas) {
    for (var prop in registroBody) {
        if (prop.toLowerCase() === "registros") continue;             // envoltorio de lote
        var valor = registroBody[prop];
        if (valor === "" || valor === null || valor === undefined || valor === 0 || valor === "0") continue;

        try {
            var campoId = prop.toUpperCase();
            var pos = tablaInfo.findField(campoId);
            if (pos === -1) continue;                                  // campo inexistente: otra validación lo trata

            var bindType = tablaInfo.fieldBindType(pos);
            if (bindType === 2 && validarEstaticas !== true) continue; // enlace a tabla estática: omitir por defecto

            var boundedId = tablaInfo.fieldBoundedTableId(pos);
            if (!boundedId || boundedId === "") continue;             // no es un campo puntero

            var idRefMaestro = convertirIdEnIdRef(boundedId);
            if (!idRefMaestro || idRefMaestro === "") continue;       // no se pudo resolver el proyecto: no bloquear

            var regMaestro = new VRegister(theRoot);
            regMaestro.setTable(idRefMaestro);
            if (regMaestro.readRegister("ID", [valor], VRegister.SearchThis) === false) {
                setError("409", "El campo " + campoId + " referencia un registro inexistente en "
                         + boundedId.split("@")[1] + " (ID " + valor + ")", uriObjeto);
                return false;
            }
        } catch (e) {
            // Ante cualquier problema de metadatos, no bloquear el alta por este campo.
            continue;
        }
    }
    return true;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * asignarCamposOrdenados [Asigna los campos del JSON a la ficha en ORDEN DE DECLARACIÓN de la tabla]
 *
 * Problema que resuelve: Velneo recalcula los "contenidos iniciales" (defaults) a medida que se
 * asignan los campos. Si un campo cuyo default depende de otro (ej. CLT depende de EMP) se asigna
 * ANTES que ese otro, el recálculo posterior pisa el valor explícito. Como el orden de las claves
 * del JSON lo decide el cliente, el resultado dependía de cómo armara el JSON.
 *
 * Solución: ordenar las claves por el índice de campo en la tabla (los campos "driver" -empresa,
 * división, artículo- se declaran antes que los dependientes -cliente, precio-) y asignarlas en ese
 * orden. Es dinámico (vale para cualquier tabla, lo deduce de los metadatos) y barato (ordena en
 * memoria ~N claves; no agrega lecturas a disco).
 *
 * @param {VRegister}  registro   ficha en memoria (nueva o a modificar)
 * @param {Object}     datos      objeto JSON con los campos a asignar (un registro)
 * @param {VTableInfo} tablaInfo  tableInfo de la tabla destino
 * ----------------------------------------------------------------------------------------------------
 **/
function asignarCamposOrdenados(registro, datos, tablaInfo) {
    // 1) Recolectar las claves con su posición de campo en la tabla
    var claves = [];
    for (var prop in datos) {
        if (prop.toLowerCase() === "registros") continue;       // envoltorio de lote
        var num = tablaInfo.findField(prop.toUpperCase());
        claves.push({ id: prop, num: (num === -1 ? 999999 : num) });   // los desconocidos van al final
    }
    // 2) Ordenar por orden de declaración (driver antes que dependiente)
    claves.sort(function (a, b) { return a.num - b.num; });
    // 3) Asignar en ese orden
    for (var i = 0; i < claves.length; i++) {
        var campoId = claves[i].id.toUpperCase();
        var campoValor = datos[claves[i].id];
        var campoNumero = tablaInfo.findField(campoId);
        var campoTipoObjeto = tablaInfo.fieldObjectType(campoNumero);
        if (campoTipoObjeto == VTableInfo.ObjectTypePicture) {  // campo objeto imagen (base64)
            registro.setFieldImage(campoId, imagenFromBase64(campoValor));
        } else if ((campoValor === "") && ((campoTipoObjeto == VTableInfo.ObjectTypeText) || (campoTipoObjeto == VTableInfo.ObjectTypeRichText))) {
            // Campo objeto texto/texto enriquecido vacío: setField("") no limpia el contenido del objeto,
            // hay que vaciar explícitamente el byte array subyacente.
            var vacio = new VByteArray();
            vacio.clear();
            registro.setFieldByteArray(campoId, vacio);
        } else {
            registro.setField(campoId, campoValor);
        }
    }
}
