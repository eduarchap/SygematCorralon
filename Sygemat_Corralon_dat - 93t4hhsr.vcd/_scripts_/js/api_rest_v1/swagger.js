#include "(CurrentProject)/js/api_rest_v1/api_rest_funciones_v1.js"

/**
 * ====================================================================================================
 *
 * SWAGGER - Documentación dinámica y estándar del API REST v1
 *
 * 1.03 - 25/09/2017 - Las variables privadas no se incluyen como parámetros
 * 1.03 - 25/09/2017 - Revisado estilo de llaves
 * 1.04 - 27-04-2021 - Nueva interfaz Swagger
 * 1.04 - 27-04-2021 - Solicitud de api_name para mostrar los recursos y api_key para autentificación
 * 1.04 - 27-04-2021 - Información del API y tags dinámicos desde la tabla del API
 *
 * ====================================================================================================
 **/
 
//'use strict';


/**
 * ----------------------------------------------------------------------------------------------------
 * @file Generación dinámica de fichero swagger del proyecto de Velneo
 * @author Velneo
 * ----------------------------------------------------------------------------------------------------
 **/
theResponse.setContentType( "application/json; charset=utf-8" );

// Cabeceras para permitir llamadas CORS
theResponse.setHeader("Access-Control-Allow-Methods","POST, GET, OPTIONS, PUT, DELETE");
theResponse.setHeader("Access-Control-Allow-Origin","*");
theResponse.setHeader("Access-Control-Allow-Headers","Content-Type, api_key, Authorization");

theResponse.setBody(JSON.stringify(general()));

function general() {
	
	var swagger = {};
	swagger.swagger = "2.0";
	var uriPathInfo = theRequest.uri();

	// Información
	var info = {};
		
	info.version = theApp.mainProjectInfo().version() + "." + theApp.mainProjectInfo().history();
	info.title = "API " + theApp.mainProjectInfo().name();
	
	// Información. Leemos la iformación del API
	var apikeyDsc = getInfoApi(paramFromRequest("api_name"));
	
		if (apikeyDsc=="") {
			info.description = "Definición del API de la aplicación " + theApp.mainProjectInfo().name() + "\r\n" + "Este API está protegido por API Key, para dar permisos de acceso a los distintos recursos se deben rellenar los valores en las tablas de configuración de la aplicación Velneo.";
		} else {
			info.description = apikeyDsc;	
		}
		
	// Información.Contacto
	var contacto = {};
	contacto.name = "Desarrollado por Velneo";
	contacto.url = "http://www.velneo.es";
	info.contact = contacto;
	
	// Información.Licencia
	var license = {};
	license.name = "Apache 2.0";
	license.url = "http://www.apache.org/licenses/LICENSE-2.0.html";
	info.license = license;
	
	swagger.info = info;
	swagger.host = theRequest.header("Host");
	
	// El path del API es el mismo que este proceso pero con el número de versión
	var nombreProceso = theRoot.objectInfo().id().toLowerCase();
	swagger.basePath = uriPathInfo.replace("/"+nombreProceso, "/v1"); 
	
	var Project = theApp.mainProjectInfo();
	
	// Paths
	var paths = {};
	var tags = [];
	var definitions = {};
	var parameters = {};
	
	// Seguridad. Primero hay que conocer el nombre del API a mostrar
	var seguridad = getSeguridadSwagger(paramFromRequest("api_name"));
	
	// Recorremos todas las tablas
	for( var nIndex=0; nIndex < Project.allTableCount(); nIndex++ ) {	
		
		var registroSeg = {};	
		
		var tableInfo = Project.allTableInfo( nIndex );
		
		// Buscamos si tiene registro de seguridad
		for( var x=0; x < seguridad.length; x++) {
			if (seguridad[x].tab_id_ref == tableInfo.idRef()) {
				registroSeg = seguridad[x];
				break;
			}
		}
		
		// Si el registro de seguridad coincide con la tabla
		if (registroSeg.tab_id_ref == tableInfo.idRef()) {
			// Métodos para el path con el nombre de la tabla
			var pathTabla = {};
			if (registroSeg.metodos.indexOf("POST") != -1) {
				pathTabla["post"] = operationPostTable(tableInfo);
			}
			
			if (registroSeg.metodos.indexOf("GET") != -1) {
				pathTabla["get"] = operationGetRegistrosTable(tableInfo);
			}
			
			paths["/"+tableInfo.id().toLowerCase()] = pathTabla;	
			
			// Métodos para el path con un solo elemento de la tabla
			var pathTablaElemento = {};
			
			if (registroSeg.metodos.indexOf("GET") != -1) {
				pathTablaElemento["get"] = operationGetTable(tableInfo);
			}
			
			if (registroSeg.metodos.indexOf("POST") != -1) {
				pathTablaElemento["post"] = operationPostModTable(tableInfo);
			}
			
			if (registroSeg.metodos.indexOf("DELETE") != -1) {
				pathTablaElemento["delete"] = operationDeleteTable(tableInfo);
			}
			
			paths["/"+tableInfo.id().toLowerCase()+"/{id}"] = pathTablaElemento;

			// Procesos
			// Buscamos los procesos que tengan como destino esta tabla y no tengan origen
			var procesosTabla = getObjetosTipo(VObjectInfo.TypeProcess, tableInfo.id(), VObjectInfo.IONone);
			for (var index = 0; index < procesosTabla.length; index++) {
				// Verificamos la seguridad de los procesos
				if (registroSeg.procesos.indexOf(procesosTabla[index].idRef()) != -1) {	
					var pathTablaProceso = {};						
					if( registroSeg.metodos.indexOf("GET") != -1 ){					
						pathTablaProceso["get"] = operationGetProceso(procesosTabla[index]);
					}
					if( registroSeg.metodos.indexOf("POST") != -1 ){
						pathTablaProceso["post"] = operationPostProceso(procesosTabla[index]);
					}
					paths["/_process/"+procesosTabla[index].id().toLowerCase()] = pathTablaProceso;
						
					
				}
			}

			if (registroSeg.metodos.indexOf("GET") != -1) {
				// Búsquedas
				// Buscamos las búsquedas que tengan como destino esta tabla
				var busquedasTabla = getObjetosTipo(VObjectInfo.TypeQuery, tableInfo.id(), VObjectInfo.IONone);
				for (var index = 0; index < busquedasTabla.length; index++) {
					// Verificamos la seguridad de las búsquedas
					if (registroSeg.busquedas.indexOf(busquedasTabla[index].idRef()) != -1) {
						var pathTablaBusqueda = {};
						pathTablaBusqueda["get"] = operationGetBusqueda(busquedasTabla[index]);
						paths["/_query/"+busquedasTabla[index].id().toLowerCase()] = pathTablaBusqueda;
					}
				}
			}
			
			// Creamos los tags para agrupar las operaciones por tabla
			var tag = {};
			tag.name = tableInfo.name() + " - " + tableInfo.id().toLowerCase();
			tag.description = "" ;
			
			tags.push(tag);
			
			// Definiciones de todas las tablas
			var definition = {};
			var properties = {};		
			var definicionResultado = {};
			
			// Definimos el número de elementos a devolver
			var definicionCount = {};
			definicionCount.type = "integer";
			definicionCount.format = "int64";
			definicionCount.description = "Elementos en la lista";
			
			// Definimos el registro con sus campos
			var definicionElemento = {};
			
			for( var field = 0; field < tableInfo.fieldCount(); field++ ) {		
				if (registroSeg.campos.indexOf(tableInfo.fieldId(field)) != -1) {
					properties[tableInfo.fieldId(field).toLowerCase()] = campoToProperty(tableInfo, field);
				}
			}
			
			definicionElemento.properties = properties;
			definicionElemento.type = "object";

			// Definimos como será el objeto que devuelva el array de elementos de la tabla
			var definicionElementos = {};
			definicionElementos.type = "array";
			definicionElementos.items = {"$ref": "#/definitions/"+tableInfo.id().toLowerCase()};
		
			definicionResultado.count = definicionCount;
			definicionResultado[tableInfo.id().toLowerCase()] = definicionElementos;
			
			definition.type = "object";
			definition.properties = definicionResultado;
		
			// Devolvemos la definición del registro y la definición de la lista
			definitions[tableInfo.id().toLowerCase()] = definicionElemento;
			definitions["lista-"+ tableInfo.id().toLowerCase()] = definition;
			
			// Añadimos los parámetros particulares de cada tabla
			parameters = parametrosTabla(tableInfo, parameters);
			
		}
	}
	
	// Procesos sin Tabla
	
	// Buscamos si tiene registro de seguridad sin tabla
	var registroSegSinTabla = {};
	for( var x=0; x < seguridad.length; x++) {
		if (seguridad[x].tab_id_ref == "/") {
			registroSegSinTabla = seguridad[x];
			break;
		}
	}
	
	// Buscamos los procesos que no tengan destino
	if (registroSegSinTabla.procesos) {
		var procesosSinTabla = getObjetosTipoSinTabla(VObjectInfo.TypeProcess, "", VObjectInfo.IONone);
		for (var index = 0; index < procesosSinTabla.length; index++) {
			// Verificamos la seguridad de los procesos
			if (registroSegSinTabla.procesos.indexOf(procesosSinTabla[index].idRef()) != -1) {	
				var pathProceso = {};
				if( registroSegSinTabla.metodos.indexOf("GET") != -1 ){					
					pathProceso["get"] = operationGetProcesoSinTabla(procesosSinTabla[index]);										
				}
				if( registroSegSinTabla.metodos.indexOf("POST") != -1 ){
					pathProceso["post"] = operationPostProcesoSinTabla(procesosSinTabla[index]);										
				}
				paths["/_process/"+procesosSinTabla[index].id().toLowerCase()] = pathProceso;
			}
		}
	}
	
	// Definimos el objeto sinbody para usos varios
	var definicionObjetoEntrada = {};
	definicionObjetoEntrada.properties = {};
	definicionObjetoEntrada.type = "object";			
			
	// Agregamos la definicion
	definitions["sinbody"] = definicionObjetoEntrada;
	
	// Declaramos los tipos de seguridad
	var apikey = {};
	apikey.type = "apiKey";
	apikey.name = "api_key";
	apikey["in"] = "query";
	
	var securityDefinitions = {};
	securityDefinitions.api_key = apikey;
	swagger.securityDefinitions = securityDefinitions;
	
	swagger.security = [{"api_key": []}];
	
	swagger.tags = tags;
	swagger.paths = paths;
	
	// Parámetros globales
	swagger.parameters = parametros(parameters);
	
	// Definitions
	swagger.definitions = definitions;
	
	return swagger;	
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de borrar un registro de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationDeleteTable(tableInfo) {
	
	var nombreRegistro       = tableInfo.singleName().toLowerCase();
	var nombreRegistroPlural = tableInfo.name();
	
	var operation = {};
	
	operation.summary     = "Permite borrar " + nombreRegistroPlural;
	operation.description = "Se especifica como borrar el elemento " + nombreRegistro;
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + tableInfo.id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "ID invalido"; 
	responses["400"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];
	parameters.push({"$ref": "#/parameters/idParam"});
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener un registro de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationGetTable(tableInfo) {
	
	var nombreRegistro       = tableInfo.singleName().toLowerCase();
	var nombreRegistroPlural = tableInfo.name();
	
	var operation = {};
	
	operation.summary     = "Permite obtener " + nombreRegistroPlural;
	operation.description = "Se especifica como obtener el elemento " + nombreRegistro;
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + tableInfo.id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	respuesta.schema      = {"$ref": "#/definitions/lista-"+tableInfo.id().toLowerCase()};
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	parameters.push({"$ref": "#/parameters/idParam"});
	parameters.push({"$ref": "#/parameters/fieldsParam"});
	parameters.push({"$ref": "#/parameters/pgnParam"});
	parameters.push({"$ref": "#/parameters/pgsParam"});
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener un registro de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationGetRegistrosTable(tableInfo) {
	
	var nombreRegistro       = tableInfo.singleName().toLowerCase();
	var nombreRegistroPlural = tableInfo.name();
	
	var operation = {};
	
	operation.summary     = "Permite obtener lista de " + nombreRegistroPlural;
	operation.description = "Se especifica como obtener todos los elementos " + nombreRegistro;
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + tableInfo.id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	respuesta.schema      = {"$ref": "#/definitions/lista-"+tableInfo.id().toLowerCase()};
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	parameters.push({"$ref": "#/parameters/sortParam"});
	parameters.push({"$ref": "#/parameters/pgnParam"});
	parameters.push({"$ref": "#/parameters/pgsParam"});
	parameters.push({"$ref": "#/parameters/fieldsParam"});
	
	var nIndices = tableInfo.indexCount();
	for( var nIndex = 0; nIndex < nIndices; nIndex++ ) {		
		parameters.push({"$ref": "#/parameters/"+tableInfo.id().toLowerCase()+"-"+tableInfo.indexId(nIndex).toLowerCase()});
	}
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de añadir un registro de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationPostTable(tableInfo) {
	
	var nombreRegistro       = tableInfo.singleName().toLowerCase();
	var nombreRegistroPlural = tableInfo.name();
	
	var operation = {};
	
	operation.summary     = "Permite añadir " + nombreRegistroPlural;
	operation.description = "Se especifica como dar de alta el elemento " + nombreRegistro;
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + tableInfo.id().toLowerCase()];
	
	// Parámetros
	var parameters        = [];
	var parametro         = {};
	parametro.name        = "body";
	parametro["in"]       = "body"; // el parámetro in es palabra reservada
	parametro.description = "Objeto " + nombreRegistro + " que se quiere dar de alta";
	parametro.required    = true;
	parametro.schema      = {"$ref": "#/definitions/"+tableInfo.id().toLowerCase()};

	parameters.push(parametro);
	operation.parameters = parameters;
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Añadido con éxito"; 
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de modificar un registro de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationPostModTable(tableInfo) {
	
	var nombreRegistro       = tableInfo.singleName().toLowerCase();
	var nombreRegistroPlural = tableInfo.name();
	
	var operation = {};
	
	operation.summary     = "Permite modificar " + nombreRegistroPlural;
	operation.description = "Se especifica como modificar el elemento " + nombreRegistro;
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + tableInfo.id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Modificado con éxito"; 
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters        = [];
	var parametro         = {};
	parametro.name        = "body";
	parametro["in"]       = "body"; // el parámetro in es palabra reservada
	parametro.description = "Objeto " + nombreRegistro + " que se quiere modificar";
	parametro.required    = true;
	parametro.schema      = {"$ref": "#/definitions/"+tableInfo.id().toLowerCase()};
	parameters.push(parametro);
	
	parameters.push({"$ref": "#/parameters/idParam"});
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener la operación de un proceso con destino]
 *
 * @param {[VTableInfo]} procesoInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationGetProceso(procesoInfo) {
	
	var nombreRegistro       = procesoInfo.outputTable().singleName().toLowerCase();
	var nombreRegistroPlural = procesoInfo.outputTable().name();
	
	var operation = {};
	
	operation.summary     = procesoInfo.name();
	operation.description = procesoInfo.name();
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + procesoInfo.outputTable().id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	respuesta.schema      = {"$ref": "#/definitions/lista-"+procesoInfo.outputTable().id().toLowerCase()};
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	for( var  variable = 0; variable < procesoInfo.subObjectCount(VObjectInfo.TypeVariable); variable++ ) {		
		// Las variables privadas no se incluyen
		var variableInfo = procesoInfo.subObjectInfo(VObjectInfo.TypeVariable, variable);
		if (variableInfo.isPrivate() == false) {
			parameters.push(variableToProperty(variableInfo));
		}
	}

	parameters.push({"$ref": "#/parameters/fieldsParam"});
	parameters.push({"$ref": "#/parameters/pgnParam"});
	parameters.push({"$ref": "#/parameters/pgsParam"});
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener la operación de un proceso con destino]
 *
 * @param {[VTableInfo]} procesoInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationPostProceso(procesoInfo) {
	
	var nombreRegistro       = procesoInfo.outputTable().singleName().toLowerCase();
	var nombreRegistroPlural = procesoInfo.outputTable().name();
	
	var operation = {};
	
	operation.summary     = procesoInfo.name();
	operation.description = procesoInfo.name();
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + procesoInfo.outputTable().id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	respuesta.schema      = {"$ref": "#/definitions/lista-"+procesoInfo.outputTable().id().toLowerCase()};
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	for( var  variable = 0; variable < procesoInfo.subObjectCount(VObjectInfo.TypeVariable); variable++ ) {		
		// Las variables privadas no se incluyen
		var variableInfo = procesoInfo.subObjectInfo(VObjectInfo.TypeVariable, variable);
		if (variableInfo.isPrivate() == false) {
			parameters.push(variableToProperty(variableInfo));
		}
	}
	
	var parametro         = {};
	parametro.name        = "body";
	parametro["in"]       = "body"; // el parámetro in es palabra reservada
	parametro.description = "Objeto que se quiere enviar";
	parametro.required    = true;
	parametro.schema      = {"$ref": "#/definitions/sinbody"};	
	
	parameters.push(parametro);	

	parameters.push({"$ref": "#/parameters/fieldsParam"});
	parameters.push({"$ref": "#/parameters/pgnParam"});
	parameters.push({"$ref": "#/parameters/pgsParam"});
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener un proceso sin tabla]
 *
 * @param {[VObjectInfo]} procesoInfo [Requerida el proceso del que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationGetProcesoSinTabla(procesoInfo) {
	
	var operation = {};
	
	operation.summary     = procesoInfo.name();
	operation.description = procesoInfo.name();
	operation.produces    = ["application/json"];
	operation.tags        = ["sintabla"];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	for( var  variable = 0; variable < procesoInfo.subObjectCount(VObjectInfo.TypeVariable); variable++ ) {
		// Las variables privadas no se incluyen
		var variableInfo = procesoInfo.subObjectInfo(VObjectInfo.TypeVariable, variable);
		if (variableInfo.isPrivate() == false) {
			parameters.push(variableToProperty(variableInfo));
		}
	}
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener un proceso sin tabla]
 *
 * @param {[VObjectInfo]} procesoInfo [Requerida el proceso del que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationPostProcesoSinTabla(procesoInfo) {
	
	var operation = {};
	
	operation.summary     = procesoInfo.name();
	operation.description = procesoInfo.name();
	operation.produces    = ["application/json"];
	operation.tags        = ["sintabla"];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	for( var  variable = 0; variable < procesoInfo.subObjectCount(VObjectInfo.TypeVariable); variable++ ) {
		// Las variables privadas no se incluyen
		var variableInfo = procesoInfo.subObjectInfo(VObjectInfo.TypeVariable, variable);
		if (variableInfo.isPrivate() == false) {
			parameters.push(variableToProperty(variableInfo));
		}
	}
	
	var parametro         = {};
	parametro.name        = "body";
	parametro["in"]       = "body"; // el parámetro in es palabra reservada
	parametro.description = "Objeto que se quiere enviar";
	parametro.required    = true;
	parametro.schema      = {"$ref": "#/definitions/sinbody"};	
	
	parameters.push(parametro);	
	
	operation.parameters = parameters;
	
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Define la opción de obtener un registro de una tabla]
 *
 * @param {[VTableInfo]} busquedaInfo [Requerida tabla de la que se generará la documentación]
 * ----------------------------------------------------------------------------------------------------
 **/
function operationGetBusqueda(busquedaInfo) {
	
	var nombreRegistro       = busquedaInfo.outputTable().singleName().toLowerCase();
	var nombreRegistroPlural = busquedaInfo.outputTable().name();
	
	var operation = {};
	
	operation.summary     = busquedaInfo.name();
	operation.description = busquedaInfo.name();
	operation.produces    = ["application/json"];
	operation.tags        = [nombreRegistroPlural + " - " + busquedaInfo.outputTable().id().toLowerCase()];
	
	// Respuestas
	var responses         = {};
	var respuesta         = {};
	respuesta.description = "Obtenido con éxito"; 
	respuesta.schema      = {"$ref": "#/definitions/lista-"+busquedaInfo.outputTable().id().toLowerCase()};
	responses["200"]      = respuesta;
	operation.responses   = responses;
	
	// Parámetros
	var parameters = [];

	for( var  variable = 0; variable < busquedaInfo.subObjectCount(VObjectInfo.TypeVariable); variable++ ) {		
		var variableInfo = busquedaInfo.subObjectInfo(VObjectInfo.TypeVariable, variable);
		parameters.push(variableToProperty(variableInfo));
	}

	parameters.push({"$ref": "#/parameters/fieldsParam"});
	parameters.push({"$ref": "#/parameters/pgnParam"});
	parameters.push({"$ref": "#/parameters/pgsParam"});
	
	operation.parameters = parameters;
	
	return operation;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Devuelve los parámetros que se pueden usar cuando se muestra una lista]
 * ----------------------------------------------------------------------------------------------------
 **/
function parametros(parameters) {
	
	var parametroSort         = {};
	parametroSort.name        = "sort";
	parametroSort["in"]       = "query"; // el parámetro in es palabra reservada
	parametroSort.description = "Campos por los que ordenar la lista resultante, incluir '-', para invertir por dicho campo";
	parametroSort.required    = false;
	parametroSort.type        = "array";
	parametroSort.items       = {"type": "string"};
	
	var parametroInclude         = {};
	parametroInclude.name        = "include";
	parametroInclude["in"]       = "query"; // el parámetro in es palabra reservada
	parametroInclude.description = "Solicitar datos de un campo maestro del registro";
	parametroInclude.required    = false;
	parametroInclude.type        = "array";
	parametroInclude.items       = {"type": "string"};
	
	var parametroFields         = {};
	parametroFields.name        = "fields";
	parametroFields["in"]       = "query"; // el parámetro in es palabra reservada
	parametroFields.description = "Campos a mostrar en el resultado, separados por comas";
	parametroFields.required    = false;
	parametroFields.type        = "array";
	parametroFields.items       = {"type": "string"};
	
	var parametroPageNumber         = {};
	parametroPageNumber.name        = "page[number]";
	parametroPageNumber["in"]       = "query"; // el parámetro in es palabra reservada
	parametroPageNumber.description = "Número de página a mostrar";
	parametroPageNumber.required    = false;
	parametroPageNumber.type        = "integer";
	parametroPageNumber.format      = "int64";
	
	var parametroPageSize         = {};
	parametroPageSize.name        = "page[size]";
	parametroPageSize["in"]       = "query"; // el parámetro in es palabra reservada
	parametroPageSize.description = "Número de elementos por página";
	parametroPageSize.required    = false;
	parametroPageSize.type        = "integer";
	parametroPageSize.format      = "int64";
	
	var parametroId         = {};
	parametroId.name        = "id";
	parametroId["in"]       = "path"; // el parámetro in es palabra reservada
	parametroId.description = "Id del registro";
	parametroId.required    = true;
	parametroId.type        = "array";
	parametroId.items       = {"type": "integer","format":"int64"};
	
	// Parámetros
	parameters.pgnParam       = parametroPageNumber;
	parameters.pgsParam       = parametroPageSize;
	parameters.fieldsParam    = parametroFields;
	parameters.sortParam      = parametroSort;
	parameters.idParam        = parametroId;
	
	return parameters;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Devuelve los parámetros particulares de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerida tabla]
 * ----------------------------------------------------------------------------------------------------
 **/
function parametrosTabla(tableInfo, parameters) {

	var proyecto        = theApp.mainProjectInfo();
	var tableObjectInfo = getObjeto( VObjectInfo.TypeTable, tableInfo.idRef() );

	// Añadimos los parámetros de filter por cada índice
	var nIndices = tableObjectInfo.subObjectCount(VObjectInfo.TypeIndex);

	for( var nIndex = 0; nIndex < nIndices; nIndex++ ) {
		var indexInfo = tableObjectInfo.subObjectInfo(VObjectInfo.TypeIndex, nIndex);
		
		var parametro         = {};
		parametro.name        = "filter["+indexInfo.id().toLowerCase()+"]";
		parametro["in"]       = "query"; // el parámetro in es palabra reservada
		parametro.description = indexInfo.name();
		
		//parametro.allowEmptyValue = true; // TODO: PArece que no está operativo en swagger 2.0 https://github.com/OAI/OpenAPI-Specification/issues/229
		
		var nPartes = indexInfo.subObjectCount(VObjectInfo.TypeIndexPart);
		
		if (nPartes>1) {
			parametro.type = "array";
			parametro.items = {"type": "string"};
		} else {
			parametro.type = "string";	
		}

		parameters[tableInfo.id().toLowerCase()+"-"+indexInfo.id().toLowerCase()] = parametro;
	}
	
	return parameters;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Devuelve los valores adecuadados para definir un campo de una tabla]
 *
 * @param {[VTableInfo]} tableInfo [Requerido tabla]
 * @param {[int]} nCampo [Requerid número de campo en la tabla]
 * ----------------------------------------------------------------------------------------------------
 **/
function campoToProperty(tableInfo, nCampo) {
	
	var campo = {};

	campo.description = tableInfo.fieldName( nCampo );
	
	switch( tableInfo.fieldType( nCampo )) {
		
			case VTableInfo.FieldTypeFormulaDateTime:
			case VTableInfo.FieldTypeDateTime: {
				campo.type =  "string";
				campo.format =  "date-time";
				break;
			}
			case VTableInfo.FieldTypeAlpha256:
			case VTableInfo.FieldTypeAlpha128:
			case VTableInfo.FieldTypeAlpha64:
			case VTableInfo.FieldTypeAlpha40:
			case VTableInfo.FieldTypeAlphaLatin1:
			case VTableInfo.FieldTypeAlphaUtf16:
			case VTableInfo.FieldTypeFormulaAlfa:
				campo.type = "string"; 
			break;
			case VTableInfo.FieldTypeTime: {
				campo.type =  "string";
				campo.format =  "date-time";
				break;
			}
			case VTableInfo.FieldTypeFormulaDate:
			case VTableInfo.FieldTypeDate: {
				campo.type =  "string";
				campo.format = "date";
				break;
			}
			case VTableInfo.FieldTypeObject: {
				campo.type =  "string";
				campo.format =  "byte";
				break;
			}
			case VTableInfo.FieldTypeBool:
				campo.type = "boolean";
			break;
			case VTableInfo.FieldTypeFormulaNumeric:
			case VTableInfo.FieldTypeNumeric: {
				if(tableInfo.fieldDecimals(nCampo)>0) {
					campo.type = "number";
					campo.format = "double";
				} else {
					campo.type = "integer";
					campo.format = "int64";
				}

				break;
			}
			default:
				campo.type = "string";
		}
	
	return campo;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * [Devuelve los valores adecuadados para definir una variable]
 *
 * @param {[VObjectInfo]} variableInfo [Requerida]
 * ----------------------------------------------------------------------------------------------------
 **/
function variableToProperty(variableInfo) {
	
	var variable = {};

	variable.name        = "param["+variableInfo.id().toLowerCase()+"]";
	variable["in"]       = "query"; // el parámetro in es palabra reservada
	variable.description = variableInfo.name();
	//TODO: Controlar los distintos tipos de variable
	variable.type = "string";
	
	return variable;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * getObjetosTipo [Devuelve los vObjetos, por tipo y tabla destino]
 *
 * @param {[nSubType]} tipo [Requerido Tipo de los objetos que vamos a buscar]
 * @param {[int]} idTablaDestino [id de la tabla destino de los objetos que vamos a buscar]
 * @param {[Number]} tipoEntrada [Requerida tipo de entrada de los objetos que vamos a buscar]
 * ----------------------------------------------------------------------------------------------------
 **/
function getObjetosTipo( tipo, idTablaDestino, tipoEntrada ) {
	
	var objetos = [];
	var proyecto = theApp.mainProjectInfo();
	
	for( var nIndex=0; nIndex < proyecto.allObjectCount(tipo); nIndex++ ) {	
		var objectInfo = proyecto.allObjectInfo( tipo, nIndex );
		
		if (objectInfo.inputType() == tipoEntrada) {
			if (objectInfo.outputTable().id() == idTablaDestino) {
				if (objectInfo.isPrivate() == false) {
					objetos.push(objectInfo);
				}
			}
		}
	}
	
	return objetos;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * getObjetosTipoSinTabla [Devuelve los vObjetos, por tipo y tabla destino]
 *
 * @param {[nSubType]} tipo [Requerido Tipo de los objetos que vamos a buscar]
 * @param {[Number]} tipoEntrada [Requerido tipo de entrada de los objetos que vamos a buscar]
 * ----------------------------------------------------------------------------------------------------
 **/
function getObjetosTipoSinTabla( tipo, tipoEntrada )
{
	var objetos = [];
	var proyecto = theApp.mainProjectInfo();
	
	for( var nIndex=0; nIndex < proyecto.allObjectCount(tipo); nIndex++ ) {	
		var objectInfo = proyecto.allObjectInfo( tipo, nIndex );
		
		if (objectInfo.outputType() == VObjectInfo.IONone) {
			if (objectInfo.inputType() == tipoEntrada) {
				if (objectInfo.isPrivate() == false) {
					objetos.push(objectInfo);
				}
			}
		}
	}
	
	return objetos;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * objetoIdRef [Devuelve el idRef del identificador de un objeto]
 * 
 * @param {[String]} objetoTipo [Requerido Tipo de objeto] 
 * @param {[String]} objetoIdRef [Requerido Identificador del objeto]
 * ----------------------------------------------------------------------------------------------------
 **/
function getObjeto(objetoTipo, objetoIdRef) {
	
    // Se lee el proyecto principal
    var proyecto = theApp.mainProjectInfo();
	
    // Se repasan todos los objetos buscando la recibida en el parámetro
    for (var numObjeto = 0; numObjeto < proyecto.allObjectCount(objetoTipo); numObjeto++) {
        if (proyecto.allObjectInfo(objetoTipo, numObjeto).idRef() == objetoIdRef) {
            return proyecto.allObjectInfo(objetoTipo, numObjeto);
        }
    }

    // Si no se ha encontrado se devuelve null
    return null;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * paramFromRequest [Devuelve un parámetro del request]
 * 
 * @param {[String]} param [Requerido parámetro que se buscará]
 * @return {String} valor del parámetro pasado como parametro
 * ----------------------------------------------------------------------------------------------------
 **/
function paramFromRequest(param) {
	
	// Extraemos los parámetros del request
	var uriParametros = decodeURIComponent(theRequest.unparsedUri()).split('?')[1];
	
	// Creamos la variable donde devolveremos el valor del parámetro
	var valueParam = "";
	
	// Extraemos el parámetro
	if (uriParametros != undefined) {
		var uriParametrosSplit = uriParametros.split('&');
		for (var index = 0; index < uriParametrosSplit.length; index++) {
			var parametro      = uriParametrosSplit[index];
			var parametroLower = parametro.toLowerCase();
			
			if (parametroLower.search(param) != -1)  {
				valueParam = parametro.replace(param + "=", "");
			}
		}
	}
	
	// Devolvemos el valor del parámetro
	return valueParam;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * getSeguridadSwagger [Devuelve un objeto con la configuración de seguridad de un Apikey por su nombre]
 * 
 * @param {String} apiKey [Requerido api_name que se buscará]
 * @return {Object} seguridad [Objeto con la configuración de serguridad]
 * ----------------------------------------------------------------------------------------------------
 **/
function getSeguridadSwagger(apiKey) {
	
	// Preparar las variables de trabajo
	var seguridad = [];

	// Leemos el registro del API Key para obtener su código (ID)	
	var registroApiKey = new VRegister(theRoot);
	registroApiKey.setTable("sygemat_corralon_dat/API_KEY_W");
	registroApiKey.readRegister("NOM", [apiKey], VRegister.SearchThis);
	var apikeyId = registroApiKey.fieldToInt("ID");
	
	if (apikeyId != 0) {
		// Leemos el registro de la seguridad para el API Key por su nombre
		var registrosSeg = new VRegisterList(theRoot);
		registrosSeg.setTable("sygemat_corralon_dat/API_SEG_W");	
	
		registrosSeg.load("API_KEY",[apikeyId]);
		
		for( var x=0; x < registrosSeg.size(); x++) {
			var registroSeg = registrosSeg.readAt(x);
			var registroConfigSeguridad = {};
			var metodosConfigSeguridad = [];
			
			if( registroSeg.fieldToBool("SIN_TAB") == false ){
				registroConfigSeguridad.tab_id_ref = registroSeg.fieldToString("TAB_ID_REF");
			}else{
				registroConfigSeguridad.tab_id_ref = "/";
			}
			
			if (registroSeg.fieldToBool("MET_GET") == true) { metodosConfigSeguridad.push("GET"); }
			if (registroSeg.fieldToBool("MET_PUT") == true) { metodosConfigSeguridad.push("PUT"); }
			if (registroSeg.fieldToBool("MET_POS") == true) { metodosConfigSeguridad.push("POST"); }
			if (registroSeg.fieldToBool("MET_DEL") == true) { metodosConfigSeguridad.push("DELETE"); }
			registroConfigSeguridad.metodos = metodosConfigSeguridad;
			
			// Leemos los campos admitidos, si no están marcados todos esos son los admitidos en caso de estar marcados todos pasan a ser los excluidos
			var camposRegistroSeg = registroSeg.fieldToString("CAM").split(",");
			if (registroSeg.fieldToBool("CAM_TOD") == true) {
				registroConfigSeguridad.campos = camposTabla(registroConfigSeguridad.tab_id_ref, camposRegistroSeg);
			} else if (camposRegistroSeg.length > 0) {
				registroConfigSeguridad.campos = camposRegistroSeg;
			}
			
			// Leemos los procesos admitidos, si no están marcados todos esos son los admitidos en caso de estar marcados todos pasan a ser los excluidos
			var procesosRegistroSeg = registroSeg.fieldToString("PRO").split(",");
			if (registroSeg.fieldToBool("PRO_TOD") == true) {
				registroConfigSeguridad.procesos = objetosTipoTablaDestino(VObjectInfo.TypeProcess, registroConfigSeguridad.tab_id_ref, procesosRegistroSeg);
			} else {
				if (procesosRegistroSeg.length > 0) { registroConfigSeguridad.procesos = procesosRegistroSeg; }
			}
				
			// TODO: En el caso de la seguridad sin tabla no da la opción de todos los procesos
				
			// Leemos las búsquedas admitidas, si no están marcadas todas esas son las admitidas en caso de estar marcadas todas pasan a ser las excluidas
			busquedasRegistroSeg = registroSeg.fieldToString("BUS").split(",");
			if (registroSeg.fieldToBool("BUS_TOD") == true) {
				registroConfigSeguridad.busquedas = objetosTipoTablaDestino(VObjectInfo.TypeQuery, registroConfigSeguridad.tab_id_ref, busquedasRegistroSeg);
			} else {
				if (busquedasRegistroSeg.length > 0) { registroConfigSeguridad.busquedas = busquedasRegistroSeg; }
			}
				
			seguridad.push(registroConfigSeguridad);
		}
	}
	
	return seguridad;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * getInfoApi [Devuelve la información de un Apikey por su nombre]
 * 
 * @param {String} apiKey [Requerido api_name que se buscará]
 * @return {String} apikeyDsc [String con la información del API]
 * ----------------------------------------------------------------------------------------------------
 **/
function getInfoApi(apiKey) {
	
	// Preparar las variables de trabajo
	var apikeyDsc = "";

	// Leemos el registro del API Key para obtener su descripción (DSC)	
	var registroApiKey = new VRegister(theRoot);
	registroApiKey.setTable("sygemat_corralon_dat/API_KEY_W");
	registroApiKey.readRegister("NOM", [apiKey], VRegister.SearchThis);
	var apikeyDsc = registroApiKey.fieldToString("DSC");
	
	return apikeyDsc;
}