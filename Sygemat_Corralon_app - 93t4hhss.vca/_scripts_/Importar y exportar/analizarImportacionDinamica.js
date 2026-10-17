#include "(CurrentProject)/Importar y exportar/utils.js"

importClass("VDir");
importClass("VTextFile");
importClass("VFile");
importClass("VProcess");

// Obtenemos la rejilla activa
var rejilla = getActiveListControl();

if (rejilla != null) {
	// Obtenemos rl objectInfo de la rejilla
	var rejillaInfo = rejilla.objectInfo();
	// Solo se exporta si es una rejilla
	if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
		
		//Obtenemos el alias del proyecto y el nombre de la tabla
		var idRefTabla = rejillaInfo.inputTable().idRef();
		// Seleccionamos la plantilla de exportacion deseada
		// en base al idRef de la tabla sobre la cual se esta ejecutando
		var seleccionPlantilla = new VProcess( theRoot );
		seleccionPlantilla.setProcess("sygemat_corralon_app/SEL_PLA_IMP");
		seleccionPlantilla.setVar("ID_REF" , idRefTabla );		
		seleccionPlantilla.exec();
	} else{
		alert("Esta funcionalidad es válida sólo para rejillas.");
	}		
} else{
	alert("Esta funcionalidad es válida sólo para rejillas.");
}