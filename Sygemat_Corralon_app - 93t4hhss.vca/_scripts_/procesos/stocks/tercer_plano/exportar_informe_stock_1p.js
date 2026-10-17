/**
 * exportar_informe_stock_1p.js
 * PRIMER PLANO — Recibe el binario generado por exportar_informe_stock_3p.js
 * y lo escribe en disco, mostrando el resultado al usuario.
 *
 * Debe llamarse justo después del proceso de tercer plano.
 *
 * Variables de entrada (establecidas por el proceso 3p):
 *   RET_XLSX         {string}  Binario del fichero .xlsx serializado.
 *   RET_RUTA         {string}  Ruta completa del fichero a guardar.
 *   RET_TOTAL_STOCK  {string}  Total general de unidades para mostrar al usuario.
 */

#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"

var cadena      = theRoot.varToString("PAR_XLSX");
var totalStock  = theRoot.varToInt("PAR_TOTAL_STOCK");

log("cadena.length = " + cadena.length);
log("totalStock    = " + totalStock);

var directorio = theRoot.varToString("PAR_RUTA_DIRECTORIO");
var ruta       = directorio + "/informe_stock.xlsx";

log("directorio = " + directorio);
log("ruta       = " + ruta);

if (directorio === "") {
    alert("Falta el directorio de salida.", "Error");
} else {

	if (cadena === "") {
		alert("No hay datos generados para guardar.\nEjecuta primero el proceso de generación.", "Error");
	} else {

		var binario = deserializarBinario(cadena);
		var ok      = escribirBinarioEnFichero(ruta, binario);
		// log("escribirBinarioEnFichero → " + ok);

		// mostrarLog();

		if (ok) {
			alert("Informe generado:\n" + ruta);
		}
	}
}