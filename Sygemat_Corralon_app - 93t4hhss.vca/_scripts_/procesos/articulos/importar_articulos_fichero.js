/**
 * importar_articulos.js
 * Lee la plantilla de artículos rellenada y lo pasa a variable.
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta del fichero .xlsx a importar.
 *
  */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

// --- Leer y convertir el fichero ---
var ruta    = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var binario = leerFicheroComoBinario(ruta);

if (binario !== null) {
	// --- Devolver XLSX para procesar en tercer plano ---
	theRoot.setVar("RET_XLSX",        serializarBinario(binario));

}
