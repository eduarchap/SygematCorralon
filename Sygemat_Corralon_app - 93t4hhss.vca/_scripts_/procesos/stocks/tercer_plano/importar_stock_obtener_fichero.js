/**
 * importar_stock.js
 * Lee la plantilla de control de stock rellenada por el operario
 * y actualiza (o crea) el registro correspondiente en STOCK_ARTICULOS.
 *
 * Columnas esperadas en el Excel (generado por exportar_plantilla_stock.js):
 *   ID_ALMACEN  — ID del almacén (debe existir en la tabla ALMACENES)
 *   ID_ARTICULO — ID del artículo (debe existir en la tabla ARTICULOS)
 *   STOCK       — unidades contadas (número >= 0)
 *
 * Por cada fila válida:
 *   - Si ya existe un registro en STOCK_ARTICULOS para ese artículo y almacén → modifica NSTOCK.
 *   - Si no existe → crea un registro nuevo.
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta del fichero .xlsx a importar.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/ARTICULOS       → índice: ID (clave única)
 *   course_sheetjs_dat/ALMACENES       → índice: ID (clave única)
 *   course_sheetjs_dat/STOCK_ARTICULOS → índices: ALMACENES, ARTICULOS
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

// --- Leer y convertir el fichero ---
var ruta    = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var binario = leerFicheroComoBinario(ruta);

if (binario !== null) {
	// --- Devolver XLSX para procesar en tercer plano ---
	theRoot.setVar("RET_XLSX",        serializarBinario(binario));

}
