/**
 * exportar_plantilla_stock_avanzada_1p.js
 * PRIMER PLANO — Recibe el binario generado por exportar_plantilla_stock_avanzada_3p.js
 * y lo escribe en disco, mostrando el resultado al usuario.
 *
 * Debe llamarse justo después del proceso de tercer plano.
 *
 * Variables de entrada (establecidas por el proceso 3p):
 *   RET_XLSX  {string}  Binario del fichero .xlsx serializado.
 *   RET_RUTA  {string}  Ruta completa del fichero a guardar.
 */

#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"

var ruta   = theRoot.varToString("RET_RUTA");
var cadena = theRoot.varToString("RET_XLSX");

log("ruta         = " + ruta);
log("cadena.length = " + cadena.length);

if (ruta === "" || cadena === "") {
    alert("No hay datos generados para guardar.\nEjecuta primero el proceso de generación.", "Error");
} else {

    var binario = deserializarBinario(cadena);
    var ok      = escribirBinarioEnFichero(ruta, binario);
    // log("escribirBinarioEnFichero → " + ok);

    // mostrarLog();

    // if (ok) {
    //     alert("Plantilla avanzada generada:\n" + ruta);
    // }
}
