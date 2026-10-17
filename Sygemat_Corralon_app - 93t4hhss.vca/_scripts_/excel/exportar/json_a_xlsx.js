/**
 * json_a_xlsx.js
 * Proceso de exportación: crea un fichero Excel a partir de datos en JSON.
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta absoluta donde se guardará el fichero .xlsx.
 *   PAR_CJSON               {string}  JSON con la estructura del Excel a crear.
 *
 * Estructura esperada en PAR_CJSON:
 * {
 *   "titulo":  "Título del Excel",
 *   "asunto":  "Asunto (opcional)",
 *   "autor":   "Nombre del autor (opcional)",
 *   "hojas": [
 *     {
 *       "nombre": "Nombre de la hoja",
 *       "datos":  [
 *         ["Cabecera 1", "Cabecera 2", "Cabecera 3"],
 *         ["Valor 1",    "Valor 2",    "Valor 3"]
 *       ]
 *     }
 *   ]
 * }
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"


var ruta        = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var datosExcel  = JSON.parse(theRoot.varToString("PAR_CJSON"));

var workbook = jsonAWorkbook(datosExcel);
var binario  = workbookABinario(workbook);

escribirBinarioEnFichero(ruta, binario);
