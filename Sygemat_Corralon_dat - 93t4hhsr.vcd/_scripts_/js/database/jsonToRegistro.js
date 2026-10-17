/**
 * ----------------------------------------------------------------------------------------------------
 * jsonToRegistro [Actualiza un registro con los valores de un objeto JSON]
 *
 * @returns {Boolean} True indica que se han realizado las modificaciones correctamente
 *
 * 1.00 - 04/12/2017 - Primera versión
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function jsonToRegistro(registro, datosJson) {
	
	// Control de transacción
	var retorno   = false;
	var tablaInfo = registro.tableInfo();
	var hayTrans  = theRoot.existTrans();

	if (hayTrans === false) {
		var newTrans = theRoot.beginTrans("Recuperar datos del registro de " + tablaInfo.name());
	}
	
	// Si hay transacción o se ha podido crear
	if (hayTrans || newTrans) {
	
		// Preparar datos
		var registroJson = JSON.parse(datosJson);
				
		// Recorremos los campos asignando valores
		for (var campoId in registroJson) {
			registro.setField(campoId, registroJson[campoId]);
		}

		// Modificar el registro
		retorno = registro.modifyRegister();
	}

	// Finalizar transacción
	if (newTrans) {
		theRoot.commitTrans();
	};
			
	// Retornamos el objeto generado
	return retorno;
}
