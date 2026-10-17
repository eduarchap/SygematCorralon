#include "(CurrentProject)/vTools/utils.js"

/**
 * Retorna información ampliada sobre los campos de la tabla
 *
 * @description Obtiene información ampliada de los campos de la tabla
 * @version 2013-03-04
 * @param {VTableInfo} Tabla de la que queremos obtener la información
 * @returns {Array} Cada elemento representa a su vez un array con la siguiente información del campo: ID, Nombre y Tipo
 */
function getFieldsInformation(table /* VTableInfo*/) {
	salida = new Array();
	
	// Obtenemos el objectInfo del tableInfo para obtener algunas propiedades
	oiTable = getObjectInfo(VObjectInfo.TypeTable, table.id());
	if (oiTable) {
		for (var i=0; i<table.fieldCount(); i++) {
			var field={};
			field["nCampo"] = i;
			field["id"] = table.fieldId(i);
			field["name"] = table.fieldName(i);
			field["type"] = table.fieldType(i);
			field["bindType"] = table.fieldBindType(i);
			field["objectType"] = table.fieldObjectType(i);
			field["private"] = oiTable.subObjectInfo(VObjectInfo.TypeField, table.fieldId(i)).isPrivate();
			salida.push(field);
		}
	}
	return salida;
}