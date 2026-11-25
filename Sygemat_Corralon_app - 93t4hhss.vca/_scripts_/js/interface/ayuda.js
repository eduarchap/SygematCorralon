// Abrir ayuda
importClass("VProcess");

var abrirAyuda = function() {
	var proceso = new VProcess(theRoot);
	proceso.setProcess("sygemat_corralon_app/AYU_W");
	proceso.setVar("ID", theRoot.dataView().objectInfo().idRef());
	proceso.exec();
}