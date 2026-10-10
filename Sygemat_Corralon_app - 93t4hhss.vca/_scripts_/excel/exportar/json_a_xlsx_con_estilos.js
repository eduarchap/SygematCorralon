/**
 * json_a_xlsx_con_estilos.js
 * Proceso de exportación: crea un fichero Excel con estilos a partir de datos en JSON.
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta absoluta donde se guardará el fichero .xlsx.
 *   PAR_CJSON               {string}  JSON con la estructura y estilos del Excel a crear.
 *
 * Consulta excel_estilos_utils.js para ver el contrato completo del JSON esperado.
 */

#include "(CurrentProject)/excel/lib/xlsx-js-style/xlsx.bundle.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_estilos_utils.js"


var ruta        = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var datosExcel  = JSON.parse(theRoot.varToString("PAR_CJSON"));

var workbook = jsonAWorkbookConEstilos(datosExcel);
var binario  = workbookABinario(workbook);

escribirBinarioEnFichero(ruta, binario);
