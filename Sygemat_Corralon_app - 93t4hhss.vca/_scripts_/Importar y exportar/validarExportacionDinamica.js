#include "(CurrentProject)/Importar y exportar/utils.js"

// Obtenemos la rejilla activa
var rejilla = getActiveListControl();

if (rejilla != null) {
	// Obtenemos rl objectInfo de la rejilla
	var rejillaInfo = rejilla.objectInfo();
	// Solo se exporta si es una rejilla
	if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
		
		//Obtenemos el alias del proyecto y el nombre de la tabla
		//asignamos el idRef para trabajarlo.
		theRoot.setVar("ID_REF", rejillaInfo.inputTable().idRef());		
		
	} else{
		alert("Esta funcionalidad es válida sólo para rejillas.");
	}		
} else{
	alert("Esta funcionalidad es válida sólo para rejillas.");
}