#include "(CurrentProject)/vTools/properties.js"
#include "(CurrentProject)/vTools/utils.js"


function guardarListaVirtual() {
	// Obtenemos el control activo que tenga una lista
	var control = getActiveListControl();
	if (control && control.objectInfo().inputType() == VObjectInfo.IOList) {
		// Obtenemos la lista del control
		var lista = new VRegisterList(control.root());
		control.getList(lista);
		var property = control.objectInfo().idRef().replace(".", "_").replace("/", "_")+"_v7v";
		var directorioPorDefecto = properties.get(property, theApp.homePath()+"/"+control.objectInfo().name()+".v7v");
		var sendaFichero=theMainWindow.fileDialogGetSaveFileName(tr("93t4hhss.vca/PRG_NOM_FIL"), directorioPorDefecto, tr("93t4hhss.vca/LST_VRT") + ' (*.v7v)', 0, 0);
		if (sendaFichero != "") {
			var grabadoOk = lista.saveToFile(sendaFichero);
			if (!grabadoOk) 
				alert(tr("93t4hhss.vca/ERR_SAV"))
			else
				return sendaFichero;
		}
	} else
		alert(tr("sygemat_corralon_app/LST_NEC"));
}


function recuperarListaVirtual() {
	// Obtenemos el control activo que tenga una lista
	var control = getActiveListControl();
	if (control && control.objectInfo().inputType() == VObjectInfo.IOList) {
		// Obtenemos la lista del control
		var lista = new VRegisterList(control.root());
		control.getList(lista);
		// Guardamos el idRef de la lista del control actual para hacer la comprobaćión después
		var idRefListaActual = lista.tableInfo().idRef();
		var property = control.objectInfo().idRef().replace(".", "_").replace("/", "_")+"_v7v";
		var directorioPorDefecto = properties.get(property, theApp.homePath()+"/"+control.objectInfo().name()+".v7v");
		var sendaFichero=theMainWindow.fileDialogGetOpenFileName(tr("93t4hhss.vca/PRG_NOM_FIL"), directorioPorDefecto, tr("93t4hhss.vca/LST_VRT") + ' (*.v7v)', 0, 0);
		if (sendaFichero != "") {
			var cargadoOk = lista.loadFromFile(sendaFichero);
			if (!cargadoOk) 
				alert(tr("93t4hhss.vca/err_car"))
			else {
				if (idRefListaActual != lista.tableInfo().idRef())
					alert(tr("93t4hhss.vca/ERR_CAR_LST_VRT") + " " + lista.tableInfo().name())
				else {
					control.setList(lista);
					return sendaFichero;
				}
			}
		}
	} else
		alert(tr("sygemat_corralon_app/LST_NEC"));
	
}