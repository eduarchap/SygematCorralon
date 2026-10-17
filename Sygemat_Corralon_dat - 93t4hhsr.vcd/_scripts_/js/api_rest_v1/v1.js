#include "(CurrentProject)/js/api_rest_v1/api_rest_funciones_v1.js"

/**
 * ====================================================================================================
 *
 * v1 - Motor proceso de peticiones del API REST v1
 *
 * 1.02 - 31/10/2016 - Revisada la función metodoPost para procesar grabar campos objeto dibujo recibidos en base64
 * 1.03 - 25/09/2017 - Revisado estilo de llaves
 * 1.04 - 26/02/2019 - Ejecución de procesos en método post
 *                   - Si hay errores no se ordena, pagina ni se genera el objeto a retornar
 *                   - Control del número de páginas y de la primera y última página
 * 1.05 - 25/11/2020 - API Key por cabeceras
 * 1.06 - 27/04/2021 - Mejoras varias: list.size() como undefined, API Key por cabeceras,
 * 					   normalización de mensajes de error, posibilidad de cruzar o quitar listas con filtros,
 *                     ...
 *
 * ====================================================================================================
 */

//'use strict';


/**
 * ----------------------------------------------------------------------------------------------------
 * @file Recepcionamos la petición, la procesamos y devolvemos la respuesta
 * @author Velneo
 * ----------------------------------------------------------------------------------------------------
 **/
// Asumimos que el identificador del proceso es el número de versión del API
var version = theRoot.objectInfo().id().toLowerCase();

// Con una lista base de hasta este tamaño, evaluar sus fichas es más barato que recorrer un índice entero
// (se declara arriba porque general() se ejecuta antes de llegar al final del script)
var UMBRAL_LISTA_CHICA = 1000;

// Máximo de registros por página que acepta page[size] (si piden más, se recorta a este valor).
// Se probó 10000 (2026-10-16): con muchos campos la respuesta pasa los timeouts, se deja en 1000.
var PAGINA_MAXIMA = 1000;

// Importamos las clases necesarias
importClass("VImage");
importClass("VProcess");
importClass("VQuery");
importClass("VByteArray");


// Parseamos el request obteniendo un objeto con todas sus partes
var ejecutarLocalmente = true;
var peticionOffline = false;
//Aqui se define si es ejecuion onLine (apache) o offLine (funcion remota)
var bodyEspecial = theRoot.varToString("BODY_COMPRESS");

if( bodyEspecial == "" ){
	var uriObjeto = requestToObjeto();
}else{
	var uriObjeto = JSON.parse(bodyEspecial);
}

if( typeof uriObjeto.ejecutarEnInstancia != "undefined" ){
	if( uriObjeto.mostrarUriobjeto == "true"){
		alert(JSON.stringify(uriObjeto));
	}
	if( (uriObjeto.ejecutarEnInstancia == "true") ){		
		//Entonces ejecuta un llamado a funcion remota de la otra instancia
		//Cambio la propiedad a false, para que cuando llegue al otro lado,no se vuelva a ejecutar esta logica
		uriObjeto.ejecutarEnInstancia = false;
		ejecutarLocalmente = false;		
	}
}

if( ejecutarLocalmente == true ){
	//Obtenemos el body especial si es el caso	
	if( bodyEspecial != ""){				
		peticionOffline = true;
	}else{
		// Generamos la respuesta a la petición recibida
		theResponse.setContentType("application/json; charset=utf-8");

		// Cabeceras para permitir llamadas CORS
		theResponse.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-API-Key");
		theResponse.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, DELETE");
		theResponse.setHeader("Access-Control-Allow-Origin", "*");
		theResponse.setHeader("Access-Control-Expose-Headers", "X-API-Key");

		// Headers de cache HTTP (permiten que Apache mod_cache_disk almacene las respuestas GET)
		if (uriObjeto.metodo === "GET") {
			theResponse.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
			theResponse.setHeader("Last-Modified", new Date().toUTCString());
			var expDate = new Date(new Date().getTime() + 3600000);
			theResponse.setHeader("Expires", expDate.toUTCString());
		} else {
			theResponse.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
			theResponse.setHeader("Pragma", "no-cache");
		}
	}
	
	// Si hay errores los retornamos y si todo está correcto procesamo el método solicitado
	if (uriObjeto.metodo === "OPTIONS") {
		// Preflight CORS: las cabeceras ya quedaron seteadas arriba, no se procesa nada más.
		// Evita que un preflight (sin api_key ni headers custom) devuelva un error en el body.
	} else if (uriObjeto.errores.length > 0) {
		var listaObjeto = {};
		listaObjeto.errors = uriObjeto.errores;
		if( peticionOffline == false ){
			theResponse.setHeader("X-No-Cache", "1");
			theResponse.setBody(JSON.stringify(listaObjeto));
		}else{
			theRoot.setVar("RETORNO_UNCOMPRESS",JSON.stringify(listaObjeto));
		}
	} else { // Creamos la lista de registro para el retorno
		var lista = new VRegisterList(theRoot);
		lista.setTable(uriObjeto.tabla);

		// Devolvemos la respuesta en formato JSON compacto (sin tabulaciones: ~20-30 % menos bytes
		// y menos CPU al armarla; también achica lo que viaja entre instancias con ejecutarEnInstancia)
		var retorno = general()

		if (retorno === "__IMAGE_SERVED__") {
			// servirImagen() ya escribió el body binario de la imagen, no hay que tocarlo.
		} else if ((typeof(retorno) == "string")) {
			if( peticionOffline == false ){
				theResponse.setBody(retorno);
			}else{
				theRoot.setVar("RETORNO_UNCOMPRESS",retorno);
			}
		} else {
			if( peticionOffline == false ){
				if (retorno.count === 0 || (retorno.errors && retorno.errors.length > 0)) {
					theResponse.setHeader("X-No-Cache", "1");
				}
				theResponse.setBody(JSON.stringify(retorno));
			}else{
				theRoot.setVar("RETORNO_UNCOMPRESS",JSON.stringify(retorno));
			}
		}
	}
}else{
	var vbUriObjeto = new VByteArray();
	var vbUriObjetoComprimido = new VByteArray();
	vbUriObjeto.setText( JSON.stringify(uriObjeto) );
	vbUriObjetoComprimido = vbUriObjeto.compress();
	var retorno = theRoot.calcFormulaVelneo('rfc:EJECUTAR_API_REST_SUPERIOR("'+uriObjeto.VRLInstancia+'","'+uriObjeto.identificadorInstancia+'","'+uriObjeto.usuarioInstancia+'","'+uriObjeto.passwordInstancia+'","'+ vbUriObjetoComprimido.toBase64().toLatin1String() +'")');
	vbUriObjetoComprimido.fromBase64( retorno );
	theResponse.setBody(vbUriObjetoComprimido.uncompress().toLatin1String());
	theResponse.setHeader("Content-Type", "application/json");
}

/**
 * ----------------------------------------------------------------------------------------------------
 * general [Analiza la petición recibida, la procesa y genera la respuesta]
 * 
 * @return {Object} request Objeto JSON con la respuesta a retornar
 * ----------------------------------------------------------------------------------------------------
 **/
function general() { // Si hay tabla definida creamos el objeto para almacenar los registros a retornar, en caso contrario una cadena vacía
    if (uriObjeto.tabla == "") {
        lista = "";
    }

    // Verificamos que el método solicitado es válido para el API Key
    var seg_metodos = uriObjeto.seg_metodos;
    if (seg_metodos.indexOf(uriObjeto.metodo) == -1) { // Si no es válido se devuelve un error
        setError("405", "El método " + uriObjeto.metodo + " no es válido para este API Key", uriObjeto);
		//uriObjeto.errores.push("El método " + uriObjeto.metodo + " no es válido para este API Key");
    } else { // Si es válido, ejecutamos la función correspondiente en función del método recibido
        switch (uriObjeto.metodo) {
            case "GET":
                var retorno = metodoGet();
                // Si devuelve un string finalizar
                if ((typeof(retorno) == "string") && (retorno != "")) {
                    return retorno;
                }
                break;
            case "POST":
                var retorno = metodoPost();

                // Si devulve un string finalizar
                if ((typeof(retorno) == "string") && (retorno != ""))
                    return retorno;

                break;
            case "PUT":
            case "PATCH":
                var retorno = metodoPut();

                // Si devuelve un string finalizar
                if ((typeof(retorno) == "string") && (retorno != ""))
                    return retorno;

                break;
            case "DELETE":
                return metodoDelete();
                break;
        }
    }

    // Aplicamos los parámetros de lista filtrar, ordenar y paginar
    listaFiltrarOrdenarPaginar();

    // Procesamos la lista de registros para generar el json de respuesta y lo retornamos
    listaObjeto = listaToObjeto();

    // Si hay errores los añadimos al objeto de salida
    if (uriObjeto.errores.length > 0) 
        listaObjeto.errors = uriObjeto.errores;
    

    // Retornamos el objeto de respuesta a la petición
    return listaObjeto;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * metodoGet [Ejecución del método GET solicitado]
 * 
 * @return {Object} Se devuelve una cadena con el retorno si es un proceso sin tabla de destino
 * ----------------------------------------------------------------------------------------------------
 **/
function metodoGet() { // Se ejecuta la función correspondiente en función del recurso solicitado
    switch (uriObjeto.recurso) {
        case "_image":
            // ------------------------------------------------------------
            // IMAGE - Servir el binario de un campo imagen de un registro
            // ------------------------------------------------------------
            return servirImagen();

        case "_process":
            // ------------------------------------------------------------
            // PROCESS - Si se ha recibido un proceso se ejecuta sin origen
            // ------------------------------------------------------------
            if (uriObjeto.proceso != "") {
                var retorno = ejecutarProceso();
            }

            // Si devuelve un string finalizar
            if ((typeof(retorno) == "string") && (retorno != "")) {
                return retorno;
            }

            break;
        case "_query":
            // -------------------------------------------------
            // QUERY - Si se ha recibido una búsqueda se ejecuta
            // -------------------------------------------------
            if (uriObjeto.busqueda != "") {
                var retorno = ejecutarBusqueda();
            }

            // Si devuelve un string finalizar
            if ((typeof(retorno) == "string") && (retorno != "")) {
                return retorno;
            }

            break;
        default:
            // ---------------------------------------
            // Buscar registros de la tabla de destino
            // ---------------------------------------
            // Si hay identificador se lee el registro con ese ID, en caso contrario se leen todos los registros
            if (uriObjeto.identificador != undefined) {
                if (uriObjeto.identificador.search(',') == -1) { // Cuando solo recibimos un identificador creamos directamente la lista con ese registro
                    lista.load("ID", obtenerPartesClave(uriObjeto.identificador));
                } else { // Si recibimos varios identificadores leemos el registro de cada identificador y los vamos cargando en la lista
                    identificadores = uriObjeto.identificador.split(',');
                    var registro = new VRegister(theRoot);
                    registro.setTable(uriObjeto.tabla);
                    for (var index = 0; index < identificadores.length; index++) {
                        if (registro.readRegister("ID", obtenerPartesClave(identificadores[index]), VRegister.SearchThis)) {
                            lista.append(registro);
                        }
                    }
                }
                if (lista.size() === 0) {
                    setError("404", "Registros no encontrados", uriObjeto);
					//uriObjeto.errores.push("Registros no encontrados");
                }

            } else {
                // Si no se recibió identificador NO cargamos la tabla entera acá.
                // La lista base la arma listaFiltrarOrdenarPaginar a partir del filtro más selectivo
                // que tenga índice (igual que una búsqueda del vClient), y solo si no hay ninguno
                // se carga la tabla completa. Así cada filtro se resuelve con una lectura de índice
                // en vez de recorrer todos los registros en el servidor.
                uriObjeto.lista_pendiente = true;
            }
    }
}


/**
 * ----------------------------------------------------------------------------------------------------
 * servirImagen [Sirve el binario de un campo imagen de un registro]
 *
 * URL esperada: /v1/_image/{tabla}/{id}/{campo}
 * uriObjeto.identificador = tabla, uriObjeto.relaciones = id, uriObjeto.recursosrel = campo
 * (reutiliza el parseo de path ya existente en requestToObjeto, no hace falta re-parsear la URL)
 *
 * @returns {String} "__IMAGE_SERVED__" si pudo servir la imagen, o un JSON de error
 * ----------------------------------------------------------------------------------------------------
 **/
function servirImagen() {
    var registroId = uriObjeto.relaciones;
    var campoId = (uriObjeto.recursosrel || "").toUpperCase();

    if (uriObjeto.tabla == "" || !registroId || campoId == "") {
        theResponse.setStatus(400);
        return JSON.stringify({"error": "URL inválida. Formato esperado: /_image/{tabla}/{id}/{campo}"});
    }

    // Verificamos que el API Key tenga permiso para acceder a este campo
    if (uriObjeto.seg_campos.indexOf(campoId) === -1) {
        theResponse.setStatus(403);
        return JSON.stringify({"error": "No tiene permisos para acceder a este campo"});
    }

    var registro = new VRegister(theRoot);
    registro.setTable(uriObjeto.tabla);
    if (!registro.readRegister("ID", obtenerPartesClave(registroId), VRegister.SearchThis)) {
        theResponse.setStatus(404);
        return JSON.stringify({"error": "Registro no encontrado"});
    }

    var campoNumero = registro.tableInfo().findField(campoId);
    if (campoNumero === -1) {
        theResponse.setStatus(404);
        return JSON.stringify({"error": "Campo no encontrado"});
    }

    var campoTipoObjeto = registro.tableInfo().fieldObjectType(campoNumero);
    if (campoTipoObjeto !== VTableInfo.ObjectTypePicture) {
        theResponse.setStatus(400);
        return JSON.stringify({"error": "El campo no es de tipo imagen"});
    }

    var imagen = registro.fieldToImage(campoId);
    if (!imagen) {
        theResponse.setStatus(404);
        return JSON.stringify({"error": "Imagen no encontrada o vacía"});
    }

    var byteArray = new VByteArray();
    byteArray = imagen.saveToData("PNG", 0);

    theResponse.setContentType("image/png");
    theResponse.setHeader("Cache-Control", "public, max-age=86400"); // Cache por 24 horas
    theResponse.setHeader("Content-Length", byteArray.length);
    theResponse.setRawBody(byteArray);

    return "__IMAGE_SERVED__";
}


/**
 * ----------------------------------------------------------------------------------------------------
 *
 * metodoPost [Ejecución del método POST solicitado]
 * POST sin identificador → crear. POST con identificador → delega en metodoPut (backward compat).
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function metodoPost() {
    // -------------------------------------------------------------------
    // Podemos hacer POST en process, pasando el body al proceso
    // -------------------------------------------------------------------
    if (uriObjeto.recurso === "_process") {
        if (uriObjeto.proceso !== "") {
            var retorno = ejecutarProceso();
        }
        // Si devuelve un string finalizar
        if ((typeof(retorno) === "string") && (retorno !== "")) {
            return retorno;
        } else {
            return;
        }
    }

    // Si hay identificador delegamos en metodoPut (backward compat con POST /TABLA/ID)
    if (uriObjeto.identificador != undefined) {
        return metodoPut();
    }

    // -----------------------------------------
    // Preparar la lista con la tabla de destino
    // -----------------------------------------
    var tablaInfo = tablaObjeto(uriObjeto.tabla);
    var numPostError = 0;
    var respuesta = "";

    // -----------------------------------------
    // Verificamos si los datos enviados en el body
    // tienen permiso para ser insertados
    // -----------------------------------------
    // Contempla alta en lote con envoltorio {"registros":[...]} o con array directo [{...},{...}]: valida los campos de CADA registro.
    var oJsonBody = uriObjeto.body;
    var registrosAValidar = Array.isArray(oJsonBody) ? oJsonBody
        : (oJsonBody && typeof oJsonBody.registros != "undefined") ? oJsonBody.registros
        : [oJsonBody];
    for (var rv = 0; rv < registrosAValidar.length; rv++) {
        var regBody = registrosAValidar[rv];
        for (var key in regBody) {
            if (key.toLowerCase() == "registros") continue;
            if (uriObjeto.seg_campos.indexOf(key.toUpperCase()) == -1) {
                respuesta = "No tiene permitido asignar valor al campo " + key;
                setError("403", respuesta, uriObjeto);
                return {'return': respuesta};
            }
        }
    }

    // Validamos tipos de datos de cada registro del body
    for (var rv = 0; rv < registrosAValidar.length; rv++) {
        if (!validarBody(registrosAValidar[rv], tablaInfo, uriObjeto)) {
            return {'return': uriObjeto.status_text};
        }
    }

    // ------------------
    // Altas de registros
    // ------------------

    // Control de transacción
    var hayTrans = theRoot.existTrans();
    if (hayTrans == false) {
        var newTrans = theRoot.beginTrans("API REST. Alta de registro en la tabla " + uriObjeto.tabla);
    }
    // Si hay transacción activa se ejecuta la generación de permisos del diccionario
    if (hayTrans || newTrans) { // Procesamos los registros que recibimos en el body
        var body = uriObjeto.body;
        // Lote como array directo [{...},{...}], lote con envoltorio {"registros":[...]}, o alta individual
        var registrosArray = Array.isArray(body) ? body
            : (typeof body.registros != "undefined") ? body.registros
            : undefined;

        if (typeof registrosArray == "undefined") {
            // ------------------------------
            // Alta de un registro individual
            // ------------------------------

            // Creamos un nuevo registro de la tabla
            var registroNuevo = new VRegister(theRoot);
            registroNuevo.setTable(uriObjeto.tabla);

            // Asignamos los valores a los campos en orden de declaración de la tabla
            asignarCamposOrdenados(registroNuevo, body, tablaInfo);

            // Validamos que las claves foráneas (punteros) existan antes de dar de alta
            if (validarPunterosExisten(tablaInfo, body, uriObjeto) === false) {
                numPostError++;
            } else {
                // Damos de alta el registro y lo añadimos a la lista de retorno
                registroNuevo.addRegister();

                if (registroNuevo.isOK() === true) {
                    lista.append(registroNuevo);
                } else {
                    setError("409", "Se ha producido el error " + registroNuevo.errorNumber() + " - " + registroNuevo.errorMessage(), uriObjeto);
                    numPostError++;
                }
            }
        } else {
            // -----------------------------
            // Alta de un grupo de registros
            // -----------------------------
            if (uriObjeto.max_reg > 0 && registrosArray.length > uriObjeto.max_reg) {
                setError("409", "Supera el máximo de registros por lote permitidos (" + uriObjeto.max_reg + ")", uriObjeto);
                numPostError++;
                registrosArray = [];
            }
            for (var numRegistro = 0; numRegistro < registrosArray.length; numRegistro++) { // Creamos un nuevo registro de la tabla por cada registro JSON recibido
                var registroJSON = registrosArray[numRegistro];
                var registroNuevo = new VRegister(theRoot);
                registroNuevo.setTable(uriObjeto.tabla);

                // Asignamos los valores a los campos en orden de declaración de la tabla
                asignarCamposOrdenados(registroNuevo, registroJSON, tablaInfo);

                // Validamos que las claves foráneas (punteros) existan antes de dar de alta
                if (validarPunterosExisten(tablaInfo, registroJSON, uriObjeto) === false) {
                    numPostError++;
                } else {
                    // Damos de alta el registro y lo añadimos a la lista de retorno
                    registroNuevo.addRegister();

                    if (registroNuevo.isOK() === true) {
                        lista.append(registroNuevo);
                    } else {
                        setError("409", "Se ha producido el error " + registroNuevo.errorNumber() + " - " + registroNuevo.errorMessage(), uriObjeto);
                        numPostError++;
                    }
                }
            }
        }
    }

    // Finalizar transacción
    if (hayTrans || newTrans) {
        if (numPostError === 0) {
            theRoot.commitTrans();
        } else {
            theRoot.rollbackTrans();
        }
    }
}


/**
 * ----------------------------------------------------------------------------------------------------
 * metodoPut [Ejecución de los métodos PUT y PATCH (modificación parcial de registros)]
 *
 * Ambos usan semántica PATCH: solo se modifican los campos enviados en el body.
 * También es invocado por metodoPost cuando recibe identificador (backward compat).
 * ----------------------------------------------------------------------------------------------------
 **/
function metodoPut() {
    // PUT y PATCH requieren identificador en la URL
    if (uriObjeto.identificador == undefined) {
        setError("405", "PUT/PATCH requieren un identificador en la URL (/v1/TABLA/ID)", uriObjeto);
        return {'return': 'Identificador requerido'};
    }

    var tablaInfo = tablaObjeto(uriObjeto.tabla);
    var numPostError = 0;
    var respuesta = "";

    // Verificamos si los datos enviados en el body tienen permiso para ser modificados
    var body = uriObjeto.body;
    for (var key in body) {
        if (uriObjeto.seg_campos.indexOf(key.toUpperCase()) == -1) {
            respuesta = "No tiene permitido asignar valor al campo " + key;
            setError("403", respuesta, uriObjeto);
            return {'return': respuesta};
        }
    }

    // Validamos tipos de datos del body
    if (!validarBody(body, tablaInfo, uriObjeto)) {
        return {'return': uriObjeto.status_text};
    }

    // ---------------------------
    // Carga de registros a modificar
    // ---------------------------
    var identificadores = uriObjeto.identificador.split(',');
    if (identificadores.length == 1) { // Cuando solo recibimos un identificador creamos directamente la lista con ese registro
        lista.load("ID", obtenerPartesClave(identificadores[0]));
    } else { // Si recibimos varios identificadores leemos el registro de cada identificador y los vamos cargando en la lista
        var registro = new VRegister(theRoot);
        registro.setTable(uriObjeto.tabla);
        for (var index = 0; index < identificadores.length; index++) {
            if (registro.readRegister("ID", obtenerPartesClave(identificadores[index]), VRegister.SearchThis)) {
                lista.append(registro);
            }
        }
    }

    if (lista.size() !== identificadores.length) {
        respuesta = "No se han encontrado todos los registros a modificar";
        setError("404", respuesta, uriObjeto);
        return {'return': respuesta};
    }

    if ((lista.size() > uriObjeto.max_reg) && (uriObjeto.max_reg > 0)) {
        respuesta = "Supera el máximo de registros por lotes permitidos para este metodo";
        setError("409", respuesta, uriObjeto);
        return {'return': respuesta};
    }

    // Procesamos los registros encontrados modificando sus campos con los valores recibidos en el body
    if (lista.size()) { // Control de transacción
        var hayTrans = theRoot.existTrans();
        if (hayTrans === false) {
            var newTrans = theRoot.beginTrans("API REST. Modificación de registros en la tabla " + uriObjeto.tabla);
        }
        // Si hay transacción activa se ejecuta la generación de permisos del diccionario
        if (hayTrans || newTrans) { // Recorremos los registros de la lista
            for (var numRegistro = 0; numRegistro < lista.size(); numRegistro++) {
                var registro = lista.readLockingAt(numRegistro);
                if (registro) { // Procesamos el body modificando los campos con sus valores
                    // Asignamos los campos en orden de declaración de la tabla (evita el clobber
                    // de contenidos iniciales según el orden del JSON del cliente)
                    asignarCamposOrdenados(registro, body, tablaInfo);

                    // Validamos que las claves foráneas (punteros) existan antes de modificar
                    if (validarPunterosExisten(tablaInfo, body, uriObjeto) === false) {
                        numPostError++;
                        continue;
                    }

                    // Modificamos el registro
                    registro.modifyRegister();

                    if (registro.isOK() === false) {
                        setError("409", "Se ha producido el error " + registro.errorNumber() + " - " + registro.errorMessage(), uriObjeto);
                        numPostError++;
                    }
                }
            }
        }

        // Finalizar transacción
        if (hayTrans || newTrans) {
            if (numPostError === 0) {
                theRoot.commitTrans();
            } else {
                theRoot.rollbackTrans();
            }
        }
    }
}


/**
 * ----------------------------------------------------------------------------------------------------
 * metodoDelete [Ejecución del método DELETE solicitado]
 * 
 * @return {Object} requestParsed Objeto JSON con todas las variables y arrays de las partes
 * ----------------------------------------------------------------------------------------------------
 **/
function metodoDelete() { // Si hay identificador se lee el registro con ese ID
    // DELETE sin identificador: antes esto rompía más abajo con "Cannot read property 'length' of undefined"
    // (identificador puede llegar undefined, no solo ""), devolvemos un error claro en cambio.
    if ((uriObjeto.identificador == undefined) || (uriObjeto.identificador == "")) {
        setError("410", "Debe indicar el ID del registro a eliminar", uriObjeto);
        return {'return': "Debe indicar el ID del registro a eliminar"};
    }

    var identificadores = uriObjeto.identificador.split(',');
    if (identificadores.length == 1) { // Cuando solo recibimos un identificador creamos directamente la lista con ese registro
        lista.load("ID", obtenerPartesClave(identificadores[0]));
    } else { // Si recibimos varios identificadores leemos el registro de cada identificador y los vamos cargando en la lista
        var registro = new VRegister(theRoot);
        registro.setTable(uriObjeto.tabla);
        for (var index = 0; index < identificadores.length; index++) {
            if (registro.readRegister("ID", obtenerPartesClave(identificadores[index]), VRegister.SearchThis))
                lista.append(registro);

        }
    }

    // Se ejecuta el delete si se han obtenido registros de la lista en caso contrario se retorna un mensaje de error
    var numRegistros = lista.size();
    var numDeletesOk = 0;
    var numDeletesError = 0;
    var respuesta = "";

    // Verificar que existen todos los registros a eliminar (((indicar cuales no se encontraron)))
    if ((numRegistros !== identificadores.length)) {
        respuesta = "No se han encontrado todos los registros a eliminar";
        setError("404", respuesta, uriObjeto);
		//uriObjeto.errores.push("No se han encontrado todos los registros a eliminar");
        return {'return': respuesta};
    }

    // Control de transacción
    var hayTrans = theRoot.existTrans();
    if (hayTrans == false) {
        var newTrans = theRoot.beginTrans("API REST. Eliminación de " + numRegistros + " registro(s) de la tabla " + uriObjeto.tabla);
    }
    // Si hay transacción activa se ejecuta la generación de permisos del diccionario
    if (hayTrans || newTrans) { // Eliminamos los registros de 1 en 1 para poder retornar errores
        for (var numRegistro = 0; numRegistro < numRegistros; numRegistro++) {
            var registro = lista.readLockingAt(numRegistro);
            registro.deleteRegister();
            if (registro.isOK() === true) {
                numDeletesOk++;
            } else {
                respuesta = "No se ha podido eliminar el registro " + registro.fieldToString("ID") + ", se deshace la transacción";
                setError("409", respuesta, uriObjeto);
				//uriObjeto.errores.push("No se ha podido eliminar el registro " + registro.fieldToString("ID") + ", se deshace la transacción");
                numDeletesError++;
            }
        }
    }

    // Finalizar transacción
    if (hayTrans || newTrans) {
        if (numDeletesError === 0) {
            respuesta = "Eliminado(s) con éxito";
            setError("200", respuesta, uriObjeto);			
            theRoot.commitTrans();
        } else {
            theRoot.rollbackTrans();
        }
    }

    // Retornamos la lista obtenida
    return {'return': respuesta}
}

/**
 * ----------------------------------------------------------------------------------------------------
 * ejecutarProceso [Ejecuta un proceso]
 *
 * @returns {String} retorno Texto con el restulado de la ejecución del proceso
 * ----------------------------------------------------------------------------------------------------
 **/
function ejecutarProceso() { // Verificamos que la ejecución del proceso está autorizada, en caso contrario devolvemos error
    var seg_procesos = uriObjeto.seg_procesos;
    if (seg_procesos.indexOf(uriObjeto.proceso) == -1) {
        setError("409", "No es posible ejecutar el proceso", uriObjeto);
		//uriObjeto.errores.push("No es posible ejecutar el proceso");
        return "No es posible ejecutar el proceso " + uriObjeto.proceso;
    }

    // Creamos el objeto para ejecutar el proceso
    var proceso = new VProcess(theRoot);
    proceso.setProcess(uriObjeto.proceso);

    // Leemos los parámetros recibidos y alimentamos las variables de la búsqueda
    params = uriObjeto.param;
    if (params.length) { // Procesamos los parámetros recibidos
        for (var index = 0; index < params.length; index++) {
            var paramSplit = params[index].split('=');
            var paramId = paramSplit[0].substring(1, paramSplit[0].length - 1).toUpperCase();
            var paramValor = paramSplit[1];

            // Analizamos si la variable es de tipo fecha
            // Asignamos los parámetros recibidos a las variables de búsqueda
            proceso.setVar(paramId, paramValor);
        }
    }
    // Pasar el body al proceso si hay un post
    if (uriObjeto.metodo === "POST") {
        if ((uriObjeto.body !== undefined) && (JSON.stringify(uriObjeto.body) !== "")) {
            proceso.setVar("BODY", JSON.stringify(uriObjeto.body));
        }
    }

    // Ejecutamos el proceso
    var retorno = "";

    if (proceso.exec(VProcess.RunInServer)) { // Si hay una tabla declarada como salida del proceso se crea la lista para obtener el retorno en caso contrario se asume el retorno de un objeto JSON
        if (uriObjeto.tabla != "") {
            // Si el proceso devuelve una lista se asigna directamente
            // Si el proceso devuelve una ficha se asigna a la lista tras limpiarla
            if (proceso.objectInfo().outputType() == VObjectInfo.IOList) {
                lista.append(proceso.result());
            } else {
                lista.clear();
                lista.append(proceso.result());
            }

            // Si hay validación del Token y devuelve un error lo indicamos
            if (proceso.varToString("ERROR_CODE") !== "") {
                setError(proceso.varToString("ERROR_CODE"), proceso.varToString("ERROR"), uriObjeto);
				//uriObjeto.errores.push(proceso.varToString("ERROR_CODE") + " " + proceso.varToString("ERROR"));
            }
        } else {
            // Si el proceso no tiene tabla de destino se lee el valor de la variable retorno y se devuelve como retorno del proceso

            // Si hay validación del Token y devuelve un error lo indicamos
            if (proceso.varToString("ERROR_CODE") !== "") {
                setError(proceso.varToString("ERROR_CODE"), proceso.varToString("ERROR"), uriObjeto);
				//uriObjeto.errores.push(proceso.varToString("ERROR_CODE") + " " + proceso.varToString("ERROR"));
            }
            return "" + proceso.varToString("RETORNO");
        }
    }
}

/**
 * ----------------------------------------------------------------------------------------------------
 * 
 * ejecutarBusqueda [Devuelve la lista obtenida tras ejecutar la búsqueda solicitada]
 * 
 * ----------------------------------------------------------------------------------------------------
 **/
function ejecutarBusqueda() { // Verificamos que la ejecución de la búsqueda está autorizada, en caso contrario devolvemos error
    var seg_busquedas = uriObjeto.seg_busquedas;
    if (seg_busquedas.indexOf(uriObjeto.busqueda) == -1) {
        setError("409", "No es posible ejecutar la búsqueda", uriObjeto);
		//uriObjeto.errores.push("No es posible ejecutar la búsqueda");
        return "No es posible ejecutar la búsqueda " + uriObjeto.busqueda;
    }

    // Creamos el objeto para ejecutar la búsqueda
    var busqueda = new VQuery(theRoot);
    busqueda.setQuery(uriObjeto.busqueda);

    // Leemos los parámetros recibidos y alimentamos las variables de la búsqueda
    params = uriObjeto.param;
    if (params.length) { // Procesamos los parámetros recibidos
        for (var index = 0; index < params.length; index++) {
            var paramSplit = params[index].split('=');
            var paramId = paramSplit[0].substring(1, paramSplit[0].length - 1).toUpperCase();
            var paramValor = paramSplit[1];

            // Asignamos los parámetros recibidos a las variables de búsqueda
            busqueda.setVar(paramId, paramValor);
        }
    }

    // Ejecutamos la búsqueda
    if (busqueda.exec()) {
        lista.append(busqueda.result());
    }
}


/**
 * ----------------------------------------------------------------------------------------------------
 *
 * listaFiltrarOrdenarPaginar [Devuelve la lista tras procesar el filtrado, ordenación y paginación
 *
 * Los filtros se resuelven como una búsqueda del vClient: primero los que tienen índice
 * (filter[INDICE], where/filterQuery eq/in sobre campo indexado, rangos sobre índice ordenado),
 * cada uno con una lectura de índice, y recién al final se recorren registros solo para las
 * condiciones sin índice, sobre la lista ya reducida. La tabla completa se carga únicamente
 * si no llegó ningún filtro indexable.
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function listaFiltrarOrdenarPaginar() {
    var tablaIdRef = uriObjeto.tabla;
    var tablaInfo = lista.tableInfo();

    // ------------------------------------------
    // FILTER - Filtrar la lista mediante índices
    // ------------------------------------------
    var filtrados = uriObjeto.filter;
    var condicionesRangoFilter = [];
    if (filtrados.length) {
        // Separar filtros exactos de filtros de rango (gte, lte, gt, lt, between)
        var filtradosExactos = [];
        for (var index = 0; index < filtrados.length; index++) {
            var entrada = filtrados[index];
            var partes  = entrada.match(/\[([^\]]+)\]/g);
            if (partes && partes.length >= 2) {
                var idxInd = partes[0].substring(1, partes[0].length - 1).toUpperCase();
                var idxOp  = partes[1].substring(1, partes[1].length - 1).toLowerCase();
                var idxVal = entrada.substring(entrada.indexOf('=') + 1);
                // El rango se expresa sobre un índice: lo pasamos a condición sobre el campo del índice
                var campoIdx = obtenerCampoDeIndice(tablaIdRef, idxInd);
                if (campoIdx && (idxOp === "between" || idxOp === "gte" || idxOp === "gt" || idxOp === "lte" || idxOp === "lt")) {
                    condicionesRangoFilter.push("[" + campoIdx.toUpperCase() + "][" + idxOp + "]=" + idxVal);
                }
            } else {
                filtradosExactos.push(entrada);
            }
        }

        // Procesar filtros exactos: cada uno es una carga por índice y se combinan en memoria
        // (append / remove / cross trabajan sobre números de registro, no leen fichas)
        if (filtradosExactos.length > 0) {
            var listaFiltrados = new VRegisterList(theRoot);
            var listaBusqueda = new VRegisterList(theRoot);
            listaFiltrados.setTable(tablaIdRef);
            listaBusqueda.setTable(tablaIdRef);

            for (var index = 0; index < filtradosExactos.length; index++) {
                var claves = [];
                var filtradoIndice;
                if (filtradosExactos[index].search("=") != -1) {
                    var filtradoSplit  = filtradosExactos[index].split('=');
                    filtradoIndice = filtradoSplit[0].substring(1, filtradoSplit[0].length - 1).toUpperCase();
                    var filtradoClaves = filtradoSplit[1];
                    if (filtradoClaves != "") claves = filtradoClaves.split(",");
                } else {
                    filtradoIndice = filtradosExactos[index].substring(1, filtradosExactos[index].length - 1).toUpperCase();
                }
                var filtradoSumar = false;
                if (filtradoIndice.search("{ADD}") != -1) { filtradoSumar = true; filtradoIndice = filtradoIndice.replace("{ADD}", ""); }
                var filtradoQuitar = false;
                if (filtradoIndice.search("{DELETE}") != -1) { filtradoQuitar = true; filtradoIndice = filtradoIndice.replace("{DELETE}", ""); }
                listaBusqueda.clear();
                listaBusqueda.load(filtradoIndice, claves);
                if ((index === 0) && (filtradoQuitar === true)) {
                    // Un {DELETE} como primer filtro necesita un universo del que quitar
                    // (antes se tomaba la lista a quitar como base y el resultado quedaba vacío)
                    asegurarListaBase();
                    listaFiltrados.append(lista);
                    listaFiltrados.remove(listaBusqueda);
                }
                else if ((filtradoSumar === true) || (index === 0)) { listaFiltrados.append(listaBusqueda); }
                else if (filtradoQuitar === true) { listaFiltrados.remove(listaBusqueda); }
                else { listaFiltrados.cross(listaBusqueda); }
            }
            aplicarConjuntoALista(listaFiltrados);
        }
    }

    // ------------------------------------------------------------------------
    // WHERE / FILTERQUERY / rangos de filter - condiciones por campo
    // where[CAMPO][operador]=valor
    // Operadores: eq, ne, like, starts, gt, gte, lt, lte, between, in, nin, empty
    // Fechas: where[FECHA][gte]=2024-01-01&where[FECHA][lte]=2024-12-31
    // filterQuery[CAMPO]=valor  →  equivale a where[CAMPO][eq]=valor
    // ------------------------------------------------------------------------
    var entradasWhere = [];
    if (uriObjeto.filter_query && uriObjeto.filter_query.length > 0) {
        for (var fq = 0; fq < uriObjeto.filter_query.length; fq++) {
            var entradaFq = uriObjeto.filter_query[fq];
            var eqPos   = entradaFq.indexOf('=');
            if (eqPos === -1) continue;
            entradasWhere.push(entradaFq.substring(0, eqPos) + "[eq]=" + entradaFq.substring(eqPos + 1));
        }
    }
    if (uriObjeto.where && uriObjeto.where.length > 0) {
        entradasWhere = entradasWhere.concat(uriObjeto.where);
    }
    entradasWhere = entradasWhere.concat(condicionesRangoFilter);

    if (entradasWhere.length > 0 && !listaYaVacia()) {
        var condiciones = parsearCondicionesWhere(entradasWhere, tablaInfo);
        var mapaIndices = obtenerMapaIndicesPorCampo(tablaIdRef);

        // 1) eq / in sobre campo con índice → carga por clave (como "cargar lista" del vClient)
        condiciones = aplicarCondicionesClavePorIndice(condiciones, mapaIndices, tablaIdRef, aplicarConjuntoALista, listaYaVacia);

        // 2) rangos sobre campo numérico/fecha con índice ordenado → búsqueda binaria en el índice.
        //    Si ya hay una lista base chica es más barato evaluar esos registros que recorrer el índice.
        if (!listaYaVacia()) {
            var baseChica = (uriObjeto.lista_pendiente !== true) && (lista.size() <= UMBRAL_LISTA_CHICA);
            if (!baseChica) {
                condiciones = aplicarCondicionesRangoPorIndice(condiciones, mapaIndices, tablaIdRef, aplicarConjuntoALista, listaYaVacia);
            }
        }

        // 3) Lo que no se pudo resolver por índice se evalúa registro a registro sobre la lista ya reducida
        if (condiciones.length > 0 && !listaYaVacia()) {
            asegurarListaBase();
            filtrarListaPorCondiciones(lista, condiciones, tablaIdRef);
        }
    }

    // -----------------------
    // SORT - Ordenar la lista
    // -----------------------
    var orden = uriObjeto.sort;
    var ordenadaPorIndice = false;

    // Si no llegó ningún filtro, la base es la tabla completa: si el orden pedido tiene índice
    // la cargamos por ese índice (ya viene ordenada) y nos ahorramos el sort, que lee todas las fichas.
    if (uriObjeto.lista_pendiente === true) {
        if (orden.length) {
            ordenadaPorIndice = cargarBaseOrdenadaPorIndice(orden[0], tablaIdRef);
        }
        asegurarListaBase();
    }

    if (orden.length && !ordenadaPorIndice && lista.size() > 1) { // Solo procesamos el primer parámetro sort recibido, obtenemos sus campos
        var ordenCampos = orden[0].split(',');

        // Invertimos el orden de clasificación de los campos ya que de momento solo nos permite ordenar por un campo (Pendiente resolución incidencia)
        ordenCampos.reverse();
        for (var index = 0; index < ordenCampos.length; index++) { // Preparamos el campo por el que vamos a ordenar
            var campoId = ordenCampos[index].toUpperCase();

            // Controlamos si el orden es descendente
            var ordenDescendente = false;
            if (campoId.search("-") != -1) {
                ordenDescendente = true;
                campoId = campoId.replace("-", "");
            }

            // Ordenamos por el campo
            lista.sort(campoId);
            if (ordenDescendente) {
                lista.invert();
            }
        }
    }

    // -----------------------
    // PAGE - Paginar la lista
    // -----------------------
    // No se copia la página a otra lista (eso leía cada ficha dos veces): se guardan los límites
    // y listaToObjeto recorre solo ese tramo.

    // Nos quedamos con el nº total de registros antes de la paginación
    uriObjeto.total_count = lista.size();
    uriObjeto.pagina_desde = 0;
    uriObjeto.pagina_hasta = lista.size();

    var paginaNumero = 0;
    var paginaSize = 1000;
    var paginacion = uriObjeto.page;

    if (paginacion.length) { // Leer las claves y valores de la paginación
        for (var index = 0; index < paginacion.length; index++) {
            var paginacionSplit = paginacion[index].split('=');
            var paginacionClave = paginacionSplit[0].substring(1, paginacionSplit[0].length - 1).toLowerCase();
            var paginacionValor = parseInt(paginacionSplit[1], 10);

            switch (paginacionClave) {
                case "number": paginaNumero = paginacionValor;
                    break;

                case "size": paginaSize = paginacionValor;
                    break;
            }
        }

        // Verificar los valores y asumir los valores por defecto si es necesario
        if (!(paginaNumero >= 1)) {
            paginaNumero = 1;
        }
        if (!(paginaSize >= 1)) {
            paginaSize = 1000;
        }
        if (paginaSize > PAGINA_MAXIMA) {
            paginaSize = PAGINA_MAXIMA;
        }

        // Control del número de páginas y de la primera y última página
        var ultimaPagina = Math.ceil(lista.size() / paginaSize);
        if (ultimaPagina < 1) {
            ultimaPagina = 1;
        }
        if (paginaNumero > ultimaPagina) {
            uriObjeto.pagina_hasta = 0;
        } else {
            uriObjeto.pagina_desde = (paginaNumero - 1) * paginaSize;
            uriObjeto.pagina_hasta = Math.min(paginaNumero * paginaSize, lista.size());
        }
    }

    // Nos quedamos con el nº registros a retornar
    uriObjeto.count = uriObjeto.pagina_hasta - uriObjeto.pagina_desde;
}

/**
 * aplicarConjuntoALista [Aplica a la lista de trabajo un conjunto de registros obtenido por índice]
 * Si todavía no hay lista base, el conjunto pasa a ser la base; si ya la hay, se cruza.
 **/
function aplicarConjuntoALista(conjunto) {
    if (uriObjeto.lista_pendiente === true) {
        lista.append(conjunto);
        uriObjeto.lista_pendiente = false;
    } else {
        lista.cross(conjunto);
    }
}

/**
 * asegurarListaBase [Carga la tabla completa solo si ningún filtro indexable armó la lista base]
 **/
function asegurarListaBase() {
    if (uriObjeto.lista_pendiente === true) {
        lista.load("ID", []);
        uriObjeto.lista_pendiente = false;
    }
}

/**
 * listaYaVacia [true si ya hay lista base y quedó vacía: no tiene sentido seguir leyendo índices]
 **/
function listaYaVacia() {
    return (uriObjeto.lista_pendiente !== true) && (lista.size() === 0);
}

/**
 * cargarBaseOrdenadaPorIndice [Carga la tabla completa usando el índice del campo de orden]
 *
 * Solo aplica a un sort de un único campo propio con índice de clave única o "acepta repetidas"
 * de una sola parte. Se compara contra la carga por "ID" (solo números de registro, no lee fichas)
 * para no perder registros que el índice no contenga; si no coinciden se usa la carga por "ID".
 *
 * @param {String} ordenParam Valor del parámetro sort (ej: "NOM" o "-FEC")
 * @param {String} tablaIdRef IdRef de la tabla
 * @return {Boolean} true si la lista quedó cargada y ordenada por índice
 **/
function cargarBaseOrdenadaPorIndice(ordenParam, tablaIdRef) {
    if (ordenParam.indexOf(",") !== -1 || ordenParam.indexOf(".") !== -1) return false;
    var campoOrden = ordenParam.toUpperCase();
    var descendente = false;
    if (campoOrden.charAt(0) === "-") {
        descendente = true;
        campoOrden = campoOrden.substring(1);
    }
    var indiceOrden = obtenerMapaIndicesPorCampo(tablaIdRef)[campoOrden];
    if (!indiceOrden) return false;

    var universo = new VRegisterList(theRoot);
    universo.setTable(tablaIdRef);
    universo.load("ID", []);

    lista.clear();
    lista.load(indiceOrden, []);
    if (lista.size() !== universo.size()) {
        lista.clear();
        lista.append(universo);
        uriObjeto.lista_pendiente = false;
        return false;
    }
    if (descendente) {
        lista.invert();
    }
    uriObjeto.lista_pendiente = false;
    return true;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * listaToObjeto [Devuelve un objeto JavaScript de una lista de registros]
 *
 * @returns {Objeto} Objeto JSON con la la información de la lista de registros
 *
 * 1.02 - 31/10/2016 - Revisada la función 
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function listaToObjeto() { // Preparamos las variables de trabajo
    var tablaInfo = lista.tableInfo();
    var tablaId = lista.tableInfo().id().toString();
    var tablaIdLower = tablaId.toLowerCase();
    var campos = uriObjeto.seg_campos;
    var listaObjeto = {};

    if (uriObjeto.debug != undefined) {
        listaObjeto.debug = uriObjeto.debug;
    }

    listaObjeto.count = uriObjeto.count;
    listaObjeto.total_count = uriObjeto.total_count;
    listaObjeto[tablaIdLower] = [];

    // Construimos la URL base del servidor, usada solo si se pidió image_as_url=true
    var hostUrl = "";
    if (uriObjeto.image_as_url === true) {
        var protocol = "https://"; // Por defecto asumimos https
        var host = theRequest.header("Host");
        var uriPathInfoCompleta = theRequest.unparsedUri();
        var pathPartsCompleta = uriPathInfoCompleta.split('/');
        var versionIndexCompleta = pathPartsCompleta.indexOf(version);
        var basePathCompleta = pathPartsCompleta.slice(0, versionIndexCompleta + 1).join('/');
        hostUrl = protocol + host + basePathCompleta;
    }

    // Tramo de la lista a devolver (lo fija la paginación; si no pasó por ella, toda la lista)
    var registroDesde = (uriObjeto.pagina_desde !== undefined) ? uriObjeto.pagina_desde : 0;
    var registroHasta = (uriObjeto.pagina_hasta !== undefined) ? Math.min(uriObjeto.pagina_hasta, lista.size()) : lista.size();

    // Tipo, tipo de objeto y nombre de salida de cada campo: se resuelven una vez y no por cada registro
    var camposTipo = [];
    var camposTipoObjeto = [];
    var camposSalida = [];
    for (var numCampo = 0; numCampo < campos.length; numCampo++) {
        var numCampoTabla = tablaInfo.findField(campos[numCampo]);
        var tipoCampo = tablaInfo.fieldType(numCampoTabla);
        camposTipo.push(tipoCampo);
        camposTipoObjeto.push(tipoCampo === VTableInfo.FieldTypeObject ? tablaInfo.fieldObjectType(numCampoTabla) : undefined);
        camposSalida.push(campos[numCampo].toLowerCase());
    }

    // Si la lista tiene registros se procesan
    if (registroHasta > registroDesde) { // Recorremos la lista leyendo los registros y añadiendo los datos al objeto JavaScript a retornar
        for (var numRegistro = registroDesde; numRegistro < registroHasta; numRegistro++) { // Leemos el registro a procesar
            var registro = lista.readAt(numRegistro);
            if (!registro) continue;
            var registroObjeto = {};

            // Se recorren todos los campos a retornar procesando sus valores
            for (var numCampo = 0; numCampo < campos.length; numCampo++) {
                registroObjeto[camposSalida[numCampo]] = valorCampoJSON(registro, campos[numCampo], camposTipo[numCampo], uriObjeto.image_as_url, hostUrl, camposTipoObjeto[numCampo]);
            }

            // Añadimos el objeto registro al la lista de objetos.
            listaObjeto[tablaIdLower].push(registroObjeto);
        }
    }

    // Retornamos el objeto generado
    return listaObjeto;
}

