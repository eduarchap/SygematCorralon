#include "(CurrentProject)/vTools/listas/export/export_rejilla.js"
#include "(CurrentProject)/vTools/properties.js"
#include "(CurrentProject)/vTools/utils.js"

importClass("VDir");
importClass("VTextFile");
importClass("VFile");

// ------------------------------------------------
// Exportar contenido de una rejilla a Html
// ------------------------------------------------
ExportarRejilla.prototype.toHtml = function (sendaFichero) {
	try {
		// Guardar fichero
		var fichero = new VTextFile(sendaFichero);
 
		// Se abre el fichero en modo escritura, crea si no existe o limpia si existe
		if ( fichero.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
			fichero.setCodec("UTF-8");
			// Se guarda los datos generados junto con la cabecera y el pie adecuado
			fichero.write("<html><head><meta charset='utf-8'></head><body><table>" + this.getDatos() + "</table></body></html>");
			// Se cierra el fichero
			fichero.close();
		}
		// Todo ha ido bien: Devuelve True
		return true;
	} catch(err) {
		alert(err);
		return false;
	}
}

// ------------------------------------------------
// Exportar contenido de una rejilla a html
// ------------------------------------------------
var rejilla = getActiveListControl();
if (rejilla!=null) {
	// Obtenemos la información de la rejilla
	var rejillaInfo = rejilla.objectInfo();
	// Solo se exporta si es una rejilla
	if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
		// Obtenemos el último directorio usado de las propiedades del usuario
		// Definimos la propiedad y la normalizamos
		var property = rejillaInfo.idRef().replace(".", "_").replace("/", "_")+"_html";
		var directorioPorDefecto = properties.get(property, theApp.homePath()+"/"+rejillaInfo.name());
		// Solicitamos en que fichero guardar la exportación
		//var directorioPorDefecto = properties
		var sendaFichero=theMainWindow.fileDialogGetSaveFileName(tr("93t4hhss.vca/PRG_NOM_FIL"), directorioPorDefecto, 'Ficheros html (*.html);;Todos (*.*)', 'Ficheros html (*.html)', 0);	
		if (sendaFichero!="") {
			try {
				theApp.setOverrideCursor(VApp.WaitCursor);
				// El separador de filas incluye el terminador de td porque en la última columna no se añade el separador de campos
				exportarRejilla = new ExportarRejilla(rejilla, "<td>", "</td>\r\n", "<tr>", "</td></tr>\r\n");
				var result=exportarRejilla.toHtml(sendaFichero);
				// Guardamos en propiedades el último directorio usado
				properties.set(property, sendaFichero);
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