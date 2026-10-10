/**
 * ----------------------------------------------------------------------------------------------------
 * camposDiscoTabla [Devuelve los campos de un tabla que tienen persistencia en disco]
 *
 * @returns {Array} Array con los identificadores de campos de una tabla
 *
 * 1.00 - 04/12/2017 - Primera versión
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function camposDiscoTabla(tablaIdRef) {
	
	// Se preparan las variables de trabajo
	var camposId = [];

	// Obtenemos el tableInfo de la tabla recibida
	var proyectoInfo = theApp.projectInfo(tablaIdRef.split("/")[0]);
	var tablaInfo    = proyectoInfo.tableInfo(tablaIdRef.split("/")[1]);
	if (tablaInfo) {	
		// Leemos los campos de la tabla
		var numCampos = tablaInfo.fieldCount();
		for (var numCampo = 0; numCampo < numCampos; numCampo++) {
			// Si tiene persistencia en disco se añade al array de retorno
			if (tablaInfo.fieldBufferLen(numCampo) > 0) {
				camposId.push(tablaInfo.fieldId(numCampo));
			}
		}
	}
	
	// Retornamos la lista de campos obtenidos
	return camposId;
}