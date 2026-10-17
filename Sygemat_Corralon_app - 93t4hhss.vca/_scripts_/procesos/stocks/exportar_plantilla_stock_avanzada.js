/**
 * exportar_plantilla_stock_avanzada.js
 * Genera una plantilla Excel de control de stock más amigable para el operario.
 *
 * Muestra los nombres en lugar de los IDs, ocultando las columnas técnicas:
 *
 *   Visible  → NOMBRE_ALMACEN  (pre-relleno, solo lectura visual)
 *   Visible  → NOMBRE_ARTICULO (pre-relleno, solo lectura visual)
 *   Visible  → STOCK           (vacío — el operario anota las unidades)
 *   Oculta   → ID_ALMACEN      (pre-relleno, necesario para la importación)
 *   Oculta   → ID_ARTICULO     (pre-relleno, necesario para la importación)
 *
 * El proceso importar_stock.js puede leer este fichero sin modificaciones
 * porque los encabezados ID_ALMACEN e ID_ARTICULO siguen presentes.
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
            // Orden de columnas: visibles primero, ocultas al final
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

            var ok = escribirBinarioEnFichero(ruta, binario);
            // log("escribirBinarioEnFichero → " + ok);

            // mostrarLog();

            // if (ok) {
            //     alert("Plantilla avanzada generada para «" + nombreAlmacen + "»:\n" + ruta);
            // }
        }
    }
}
