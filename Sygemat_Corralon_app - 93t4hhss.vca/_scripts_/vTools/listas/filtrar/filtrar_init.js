#include "(CurrentProject)/vTools/utils.js"

// Obtenemos el control activo que tenga una lista
var control = getActiveListControl();
if (control && control.objectInfo().inputType() == VObjectInfo.IOList) {
	// Obtenemos la lista del control
	var lista = new VRegisterList(control.root());
	// Obtenemos el control activo que tenga una lista
	control.getList(lista);
	var listaTexto = lista.saveToData();
	listaTexto = listaTexto.toBase64();
	listaTexto = listaTexto.toLatin1String();
	var dlg = new VDataViewDialog( theRoot );
	dlg.setDataView(VObjectInfo.TypeForm, "93t4hhss.vca/FLT");
	dlg.setVar("LISTA", listaTexto);
	dlg.setVar("POS_LISTA", control.currentSelect());
	if (dlg.exec()) {
		var oTexto = dlg.varToString("LISTA");
		var listaTextoDestino = new VByteArray();
		listaTextoDestino.setText(oTexto);
		listaTextoDestino.fromBase64(listaTextoDestino);
		if (lista.loadFromData(listaTextoDestino)) {
			var otraVista = dlg.varToBool("CMP_ABRIR_OTRA_VISTA");
			if (otraVista)
				// Si ha marcado usar otra vista, abrimos otra vista del mismo tipo que la lista de origen
				theMainWindow.addDataView(control.objectInfo().type(), control.objectInfo().idRef(), lista)
			else
				control.setList(lista);
		}
	}
} else {
	alert(tr("93t4hhss.vca/LST_NEC"));
}