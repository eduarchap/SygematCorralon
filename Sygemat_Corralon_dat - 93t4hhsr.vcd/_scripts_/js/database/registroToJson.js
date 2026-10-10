#include "(CurrentProject)/js/api_rest_v1/api_rest_funciones_v1.js"
#include "(CurrentProject)/js/database/camposDiscoTabla.js"

/**
 * ----------------------------------------------------------------------------------------------------
 * registroToJson [Devuelve un objeto JSON de un registro]
 *
 * @returns {Objeto} Objeto JSON con la la información del registro
 *
 * 1.00 - 04/12/2017 - Primera versión
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function registroToJson(registro) {
	
	// Preparamos las variables de trabajo
	var tablaInfo    = registro.tableInfo();
	var tablaIdRef   = tablaInfo.idRef();
	var campos       = camposDiscoTabla(tablaIdRef);
	var registroJson = {};

	// Se recorren todos los campos a retornar procesando sus valores
	for (var numCampo = 0; numCampo < campos.length; numCampo++) {
		var campoId           = campos[numCampo];
		var campoNumero       = registro.tableInfo().findField(campoId);
		var campoTipo         = registro.tableInfo().fieldType(campoNumero);
		registroJson[campoId] = valorCampoJSON(registro, campoId, campoTipo);
	}
			
	// Retornamos el objeto generado
	return registroJson;
}
