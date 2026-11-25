/**
 * ----------------------------------------------------------------------------------------------------
 * setVariablesLocales [Devuelve una cadena con los valores de todas las variables locales en formato XML
 *
 * @returns {String} Cadena con los valores de todas las variables locales en formato XML
 *
 * 1.00 - 04/12/2017 - Primera versión
 *
 * ----------------------------------------------------------------------------------------------------
 **/
function setVariablesLocales() {
	
	// Obtenemos la información del objeto
	var objetoInfo   = theRoot.dataView().objectInfo();
	var numVariables = objetoInfo.subObjectCount(VObjectInfo.TypeVariable);
	var retorno      = "";
	
	// Se recorren todas las variables locales generando la cadena XML de retorno con sus valores
	for (var numVariable = 0; numVariable < numVariables; numVariable++) {
		var variable      = objetoInfo.subObjectInfo(VObjectInfo.TypeVariable, numVariable);
		var variableId    = variable.id();
		var variableValor = theRoot.varToString(variableId);
		retorno          += "<" + variableId + ">" + variableValor + "</" + variableId + ">";
	}
			
	// Retornamos el objeto generado
	return retorno;
}
