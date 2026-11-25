/**
 * exportar_plantilla_stock_avanzada_3p.js
 * TERCER PLANO — Genera en memoria la plantilla Excel avanzada de stock y
 * devuelve el binario en una variable para que el proceso de primer plano
 * lo guarde en disco.
 *
 * Variables de entrada:
 *   PAR_RUTA_DIRECTORIO  {string}  Ruta del directorio donde se guardará el fichero.
 *   PAR_ID_ALMACEN       {string}  ID del almacén a inventariar.
 *
 * Variables de salida:
 *   RET_XLSX             {string}  Binario del fichero .xlsx serializado.
 *   RET_RUTA             {string}  Ruta completa del fichero a guardar.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/ALMACENES  → campos: ID, NAME
 *   course_sheetjs_dat/ARTICULOS  → campos: ID, NAME
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

var directorio = theRoot.varToString("PAR_RUTA_DIRECTORIO");
var idAlmacen  = parseInt(theRoot.varToString("PAR_ID_ALMACEN"));

// log("directorio = " + directorio);
// log("idAlmacen  = " + idAlmacen);

if (directorio === "" || isNaN(idAlmacen)) {
    alert("Faltan parámetros obligatorios (directorio o ID de almacén).", "Error");
} else {

    // --- Validar almacén ---
    var listaAlmacen = new VRegisterList(theRoot);
    listaAlmacen.setTable("course_sheetjs_dat/ALMACENES");
    listaAlmacen.load("ID", [idAlmacen]);

    if (listaAlmacen.size() === 0) {
        alert("El almacén con ID " + idAlmacen + " no existe.", "Error");
    } else {

        var nombreAlmacen = listaAlmacen.readAt(0).fieldToString("NAME");
        var ruta          = directorio + "/plantilla_stock_avanzada_" + idAlmacen + ".xlsx";

        // log("almacén = " + nombreAlmacen);
        // log("ruta    = " + ruta);

        // --- Cargar artículos ---
        var lista = new VRegisterList(theRoot);
        lista.setTable("course_sheetjs_dat/ARTICULOS");

        if (!lista.load("ID", [])) {
            alert("No se pudieron cargar los artículos.", "Error");
        } else {

            lista.sort(["NAME"]);
            // log("artículos cargados: " + lista.size());

            // --- Construir filas ---
            var filas = [
                ["NOMBRE_ALMACEN", "NOMBRE_ARTICULO", "STOCK", "ID_ALMACEN", "ID_ARTICULO"]
            ];

            for (var i = 0; i < lista.size(); i++) {
                var reg = lista.readAt(i);
                filas.push([
                    nombreAlmacen,              // NOMBRE_ALMACEN — visible, pre-relleno
                    reg.fieldToString("NAME"),  // NOMBRE_ARTICULO — visible, pre-relleno
                    "",                         // STOCK           — el operario lo rellena
                    idAlmacen,                  // ID_ALMACEN      — oculto, para importación
                    reg.fieldToInt("ID")        // ID_ARTICULO     — oculto, para importación
                ]);
            }

            // --- Construir workbook ---
            var datosExcel = {
                titulo: "Plantilla stock — " + nombreAlmacen,
                asunto: "Rellena la columna STOCK. No modifiques las demás columnas.",
                autor:  "",
                hojas: [{
                    nombre: "Stock",
                    datos:  filas
                }]
            };

            var workbook = jsonAWorkbook(datosExcel);

            // --- Ocultar columnas de IDs (índices 3 y 4) ---
            var hoja = workbook.Sheets["Stock"];
            hoja["!cols"] = [
                { wch: 25 },        // NOMBRE_ALMACEN  — visible
                { wch: 35 },        // NOMBRE_ARTICULO — visible
                { wch: 12 },        // STOCK           — visible
                { hidden: true },   // ID_ALMACEN      — oculta
                { hidden: true }    // ID_ARTICULO     — oculta
            ];

            // log("workbook.SheetNames = " + workbook.SheetNames.join(", "));

            var binario = workbookABinario(workbook);
            // log("binario.length = " + binario.length);

            // --- Devolver resultado al proceso de primer plano ---
            theRoot.setVar("RET_XLSX", serializarBinario(binario));
            theRoot.setVar("RET_RUTA", ruta);
            // log("RET_XLSX y RET_RUTA establecidos");

            // mostrarLog();
        }
    }
}
