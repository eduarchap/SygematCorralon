/**
 * exportar_plantilla_stock.js
 * Genera una plantilla Excel de control de stock para un almacén concreto.
 *
 * El operario recibe el fichero con:
 *   - ID_ALMACEN : pre-relleno con el almacén seleccionado
 *   - ID_ARTICULO: pre-relleno con el ID de cada artículo
 *   - STOCK      : vacío — el operario anota las unidades contadas
 *
 * Variables de entrada:
 *   PAR_RUTA_DIRECTORIO  {string}  Ruta del directorio donde se guardará el fichero.
 *   PAR_ID_ALMACEN       {string}  ID del almacén a inventariar.
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
        var ruta          = directorio + "/plantilla_stock_" + idAlmacen + ".xlsx";

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
                ["ID_ALMACEN", "ID_ARTICULO", "STOCK"]
            ];

            for (var i = 0; i < lista.size(); i++) {
                var reg = lista.readAt(i);
                filas.push([
                    idAlmacen,             // ID_ALMACEN  — pre-relleno
                    reg.fieldToInt("ID"),  // ID_ARTICULO — pre-relleno
                    ""                     // STOCK       — el operario lo rellena
                ]);
            }

            // --- Exportar ---
            var datosExcel = {
                titulo: "Plantilla stock — " + nombreAlmacen,
                asunto: "Rellena la columna STOCK. No modifiques ID_ALMACEN ni ID_ARTICULO.",
                autor:  "",
                hojas: [{
                    nombre: "Stock",
                    datos:  filas
                }]
            };

            var workbook = jsonAWorkbook(datosExcel);
            // log("workbook.SheetNames = " + workbook.SheetNames.join(", "));

            var binario = workbookABinario(workbook);
            // log("binario.length = " + binario.length);

            var ok = escribirBinarioEnFichero(ruta, binario);
            // log("escribirBinarioEnFichero → " + ok);

            // mostrarLog();

            // if (ok) {
            //    alert("Plantilla generada para «" + nombreAlmacen + "»:\n" + ruta);
            // }
        }
    }
}
