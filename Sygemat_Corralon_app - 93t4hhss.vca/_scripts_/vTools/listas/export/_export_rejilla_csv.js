#include "(CurrentProject)/vTools/listas/export/export_rejilla.js"
#include "(CurrentProject)/vTools/properties.js"
#include "(CurrentProject)/vTools/utils.js"

importClass("VDir");
importClass("VTextFile");
importClass("VFile");

// ------------------------------------------------
// Exportar contenido de una rejilla a CSV
// ------------------------------------------------
ExportarRejilla.prototype.toCsv = function (sendaFicheroCsv) {
	try {
		// Guardar fichero
		var ficheroCsv = new VTextFile(sendaFicheroCsv);
 
		// Se abre el fichero en modo escritura, crea si no existe o limpia si existe
		if ( ficheroCsv.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
			// Se guarda el script generado usando los datos extraídos de la rejilla
			ficheroCsv.write(this.getDatos());
			// Se cierra el fichero
			ficheroCsv.close();
		}
		// Todo ha ido bien: Devuelve True
		return true;
	} catch(err) {
		alert(err);
		return false;
	}
}

// ------------------------------------------------
// Exportar contenido de una rejilla a CSV
// ------------------------------------------------

function exportar_rejilla_a_csv(separador) {
	// Obtenemos la rejilla activa
	var rejilla = getActiveListControl();
	if (rejilla!=null) {
		// Obtenemos la información de la rejilla
		var rejillaInfo = rejilla.objectInfo();
		// Solo se exporta si es una rejilla
		if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
			// Obtenemos el último directorio usado de las propiedades del usuario
			// Definimos la propiedad y la normalizamos
			var property = rejillaInfo.idRef().replace(".", "_").replace("/", "_")+"_csv";
			var directorioPorDefecto = properties.get(property, theApp.homePath()+"/"+rejillaInfo.name());
			// Solicitamos en que fichero guardar la exportación
			//var directorioPorDefecto = properties
			var sendaFicheroCsv=theMainWindow.fileDialogGetSaveFileName(tr("93t4hhss.vca/PRG_NOM_FIL"), directorioPorDefecto, 'Ficheros csv (*.csv);;Todos (*.*)', 'Ficheros csv (*.csv)', 0);
			if (sendaFicheroCsv!="") {
				try {
					theApp.setOverrideCursor(VApp.WaitCursor);
					separador = separador || ";";
					exportarRejilla = new ExportarRejilla(rejilla, "", separador, "", "\r\n");
					exportarRejilla.normalizarDato=true; // Queremos que si encuentra un ; en el dato, rodee el dato con comillas dobles
					var result=exportarRejilla.toCsv(sendaFicheroCsv);
					// Guardamos en propiedades el último directorio usado
					properties.set(property, sendaFicheroCsv);
				} finally {
					theApp.restoreOverrideCursor();
				}
				if (result)
					alert("Exportación terminada satisfactoriamente");
				else
					alert("Se ha producido algún error durante la exportación");
			}
		} else
			alert("Esta funcionalidad es válida sólo para rejillas.");
	} else 
		alert("Esta funcionalidad es válida sólo para rejillas.");
}