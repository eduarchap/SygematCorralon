/**
 * xlsx_a_json.js
 * Proceso de importación: lee un fichero Excel y devuelve su contenido como JSON.
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta absoluta del fichero .xlsx a importar.
 *   PAR_INDICE_HOJA         {number}  (Opcional) Índice de la hoja a leer. Por defecto 0 (primera hoja).
 *
 * Variables de salida:
 *   RET_CJSON               {string}  JSON con el array de filas leídas.
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"


var ruta        = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var indiceHoja  = parseInt(theRoot.varToString("PAR_INDICE_HOJA")) || 0;

var binario = leerFicheroComoBinario(ruta);

if (binario !== null) {
    var workbook = parsearWorkbook(binario);
    var filas    = hojaAJson(workbook, indiceHoja);
    theRoot.setVar("RET_CJSON", JSON.stringify(filas));
}
