/**
 * exportar_plantilla_articulos.js
 * Exporta la lista de artículos a un fichero Excel editable.
 *
 * Permite a los usuarios:
 *   - Ver todos los artículos existentes
 *   - Modificar nombres
 *   - Añadir nuevos artículos (con ID vacío para auto-generar)
 *
 * Estructura de la plantilla:
 *   ID       — identificador único (no modificar si existe)
 *   NAME     — nombre del artículo (editable)
 *
 * Variables de entrada:
 *   PAR_RUTA_DIRECTORIO  {string}  Ruta del directorio donde se guardará el fichero.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/ARTICULOS  → campos: ID, NAME
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

var directorio = theRoot.varToString("PAR_RUTA_DIRECTORIO");
var ruta       = directorio + "/plantilla_articulos.xlsx";

// log("directorio = " + directorio);
// log("ruta       = " + ruta);

if (directorio === "") {
    alert("Falta el directorio de salida.", "Error");
} else {

    var lista = new VRegisterList(theRoot);
    lista.setTable("course_sheetjs_dat/ARTICULOS");

    if (!lista.load("ID", [])) {
        alert("No se pudieron cargar los artículos.", "Error");
    } else {

        lista.sort(["NAME"]);
        // log("artículos cargados: " + lista.size());

        // --- Construir filas ---
        var filas = [
            ["ID", "NAME"]   // Cabeceras
        ];

        for (var i = 0; i < lista.size(); i++) {
            var reg = lista.readAt(i);
            filas.push([
                reg.fieldToInt("ID"),
                reg.fieldToString("NAME")
            ]);
        }

        // --- Agregar filas vacías para nuevos artículos ---
        for (var i = 0; i < 10; i++) {
            filas.push(["", ""]);
        }

        // log("filas construidas: " + filas.length);

        // --- Exportar ---
        var datosExcel = {
            titulo: "Plantilla Artículos",
            asunto: "Edita los nombres o añade nuevos artículos. Deja ID vacío para crear nuevo.",
            autor:  "",
            hojas: [{
                nombre: "Articulos",
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

        if (ok) {
            alert("Plantilla de artículos generada:\n" + ruta);
        }
    }
}
