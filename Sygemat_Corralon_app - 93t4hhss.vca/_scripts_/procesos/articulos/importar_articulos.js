/**
 * importar_articulos.js
 * Lee la plantilla de artículos rellenada y crea o actualiza registros.
 *
 * Lógica:
 *   - Si ID está vacío → crea nuevo artículo (Velneo asigna ID automático)
 *   - Si ID existe → modifica el NAME
 *   - NAME nunca puede estar vacío
 *
 * Columnas esperadas:
 *   ID    — identificador (vacío para crear nuevo)
 *   NAME  — nombre del artículo (obligatorio)
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta del fichero .xlsx a importar.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/ARTICULOS  → campos: ID, NAME
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

var binario    = theRoot.varToString("PAR_XLSX");

if (binario !== null) {

    var workbook = parsearWorkbook(binario);
    var filas    = hojaAJson(workbook, 0);

    var errores   = [];
    var correctos = 0;
    var creados   = 0;

    var lista = new VRegisterList(theRoot);
    lista.setTable("course_sheetjs_dat/ARTICULOS");

    var regNuevo = new VRegister(theRoot);
    regNuevo.setTable("course_sheetjs_dat/ARTICULOS");

    // --- Abrir transacción ---
    var hayTrans    = theRoot.existTrans();
    var nuevaTrans  = false;

    if (!hayTrans) {
        nuevaTrans = theRoot.beginTrans("Importar artículos desde Excel");
    }

    bucle_filas: for (var i = 0; i < filas.length; i++) {
        var fila    = filas[i];
        var numFila = i + 2; // +2: fila 1 son cabeceras, arrays empiezan en 0

        // --- Ignorar filas completamente vacías ---
        if ((fila.ID === "" || fila.ID === undefined) && (fila.NAME === "" || fila.NAME === undefined)) {
            continue;
        }

        // --- Validar NAME (obligatorio) ---
        if (fila.NAME === "" || fila.NAME === undefined) {
            errores.push("Fila " + numFila + ": NAME está vacío");
            continue;
        }

        var nombre = fila.NAME;

        // --- Caso 1: Crear nuevo artículo (ID vacío) ---
        if (fila.ID === "" || fila.ID === undefined) {

            regNuevo.setField("NAME", nombre);
            regNuevo.addRegister();

            if (!regNuevo.isOK()) {
                errores.push("Fila " + numFila + ": error al crear artículo «" + nombre + "» — " + regNuevo.errorMessage());
                continue;
            }

            creados++;
            correctos++;
            // log("Nuevo artículo creado: " + nombre);

        } else {
            // --- Caso 2: Modificar artículo existente (ID existe) ---

            var idArticulo = parseInt(fila.ID);
            if (isNaN(idArticulo)) {
                errores.push("Fila " + numFila + ": ID no es un número válido");
                continue;
            }

            // Buscar el artículo existente
            lista.load("ID", [idArticulo]);

            if (lista.size() === 0) {
                errores.push("Fila " + numFila + ": el artículo con ID " + idArticulo + " no existe");
                continue;
            }

            var regModificar = lista.readLockingAt(0);
            regModificar.setField("NAME", nombre);
            regModificar.modifyRegister();

            if (!regModificar.isOK()) {
                errores.push("Fila " + numFila + " (ID " + idArticulo + "): error al modificar — " + regModificar.errorMessage());
                continue bucle_filas;
            }

            correctos++;
            // log("Artículo actualizado: ID=" + idArticulo + ", NAME=" + nombre);
        }
    }

    // --- Cerrar transacción ---
    if (nuevaTrans) {
        theRoot.commitTrans();
    }

    // --- Informe de resultado ---
    var msg = correctos + " artículo(s) procesado(s) correctamente";

    if (creados > 0) {
        msg += " (" + creados + " nuevos, " + (correctos - creados) + " modificados)";
    }

    if (errores.length > 0) {
        msg += "\n\n" + errores.length + " error(es) encontrado(s):\n" + errores.join("\n");
    }

    alert(msg);

} else {
    alert("No se pudo leer el fichero Excel.", "Error");
}
