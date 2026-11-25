/**
 * excel_utils.js
 * Capa de abstracción sobre SheetJS.
 * Agrupa las operaciones más comunes de lectura y escritura de ficheros Excel.
 *
 * Requiere que xlsx.full.min.js esté incluido antes que este fichero.
 *
 * Uso:
 *   #include "(CurrentProject)/excel/lib/xlsx.full.min.js"
 *   #include "(CurrentProject)/excel/excel_utils.js"
 */


/**
 * Parsea una cadena binaria y devuelve un workbook de SheetJS.
 *
 * @param {string} binario - Contenido del fichero .xlsx como cadena binaria.
 * @returns {Object} Workbook de SheetJS.
 */
function parsearWorkbook(binario) {
    return XLSX.read(binario, { type: "binary" });
}


/**
 * Convierte una hoja de un workbook en un array de objetos JSON.
 * Cada objeto representa una fila, con las cabeceras como claves.
 *
 * @param {Object} workbook    - Workbook de SheetJS.
 * @param {number} [indice=0]  - Índice de la hoja a leer (0 = primera hoja).
 * @returns {Array} Array de objetos con los datos de la hoja.
 */
function hojaAJson(workbook, indice) {
    var indiceHoja  = indice || 0;
    var nombreHoja  = workbook.SheetNames[indiceHoja];
    var hoja        = workbook.Sheets[nombreHoja];

    return XLSX.utils.sheet_to_json(hoja, { defval: "" });
}


/**
 * Crea un workbook de SheetJS a partir de una estructura de datos.
 *
 * El parámetro datosExcel debe tener la siguiente forma:
 * {
 *   titulo:  "Título del Excel",
 *   asunto:  "Asunto (opcional)",
 *   autor:   "Nombre del autor (opcional)",
 *   hojas: [
 *     {
 *       nombre: "Nombre de la hoja",
 *       datos:  [
 *         ["Cabecera 1", "Cabecera 2", "Cabecera 3"],
 *         ["Valor 1",    "Valor 2",    "Valor 3"]
 *       ]
 *     }
 *   ]
 * }
 *
 * @param {Object} datosExcel - Estructura con los datos del fichero a crear.
 * @returns {Object} Workbook de SheetJS listo para exportar.
 */
function jsonAWorkbook(datosExcel) {
    var wb = XLSX.utils.book_new();

    wb.Props = {
        Title:   datosExcel.titulo  || "",
        Subject: datosExcel.asunto  || "",
        Author:  datosExcel.autor   || ""
    };

    for (var i = 0; i < datosExcel.hojas.length; i++) {
        var hoja = datosExcel.hojas[i];
        var ws   = XLSX.utils.aoa_to_sheet(hoja.datos);
        wb.SheetNames.push(hoja.nombre);
        wb.Sheets[hoja.nombre] = ws;
    }

    return wb;
}


/**
 * Serializa un workbook de SheetJS a un array de bytes listo para guardar en disco.
 *
 * @param {Object} workbook - Workbook de SheetJS.
 * @returns {Array} Array de bytes del fichero .xlsx.
 */
function workbookABinario(workbook) {
    return XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
}
