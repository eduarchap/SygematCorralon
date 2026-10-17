/**
 * importar_almacenes.js
 * Lee la plantilla de almacenes rellenada y crea o actualiza registros.
 *
 * Lógica:
 *   - Si ID está vacío → crea nuevo almacén (Velneo asigna ID automático)
 *   - Si ID existe → modifica el NAME
 *   - NAME nunca puede estar vacío
 *
 * Columnas esperadas:
 *   ID    — identificador (vacío para crear nuevo)
 *   NAME  — nombre del almacén (obligatorio)
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta del fichero .xlsx a importar.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/ALMACENES  → campos: ID, NAME
 */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"

var ruta    = theRoot.varToString("PAR_RUTA_FICHERO_EXCEL");
var binario = leerFicheroComoBinario(ruta);

if (binario !== null) {

    var workbook = parsearWorkbook(binario);
    var filas    = hojaAJson(workbook, 0);

    var errores   = [];
    var correctos = 0;
    var creados   = 0;

    var lista = new VRegisterList(theRoot);
    lista.setTable("course_sheetjs_dat/ALMACENES");

    var regNuevo = new VRegister(theRoot);
    regNuevo.setTable("course_sheetjs_dat/ALMACENES");

    // --- Abrir transacción ---
    var hayTrans    = theRoot.existTrans();
    var nuevaTrans  = false;

    if (!hayTrans) {
        nuevaTrans = theRoot.beginTrans("Importar almacenes desde Excel");
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

        // --- Caso 1: Crear nuevo almacén (ID vacío) ---
        if (fila.ID === "" || fila.ID === undefined) {

            regNuevo.setField("NAME", nombre);
            regNuevo.addRegister();

            if (!regNuevo.isOK()) {
                errores.push("Fila " + numFila + ": error al crear almacén «" + nombre + "» — " + regNuevo.errorMessage());
                continue;
            }

            creados++;
            correctos++;
            log("Nuevo almacén creado: " + nombre);

        } else {
            // --- Caso 2: Modificar almacén existente (ID existe) ---

            var idAlmacen = parseInt(fila.ID);
            if (isNaN(idAlmacen)) {
                errores.push("Fila " + numFila + ": ID no es un número válido");
                continue;
            }

            // Buscar el almacén existente
            lista.load("ID", [idAlmacen]);

            if (lista.size() === 0) {
                errores.push("Fila " + numFila + ": el almacén con ID " + idAlmacen + " no existe");
                continue;
            }

            var regModificar = lista.readLockingAt(0);
            regModificar.setField("NAME", nombre);
            regModificar.modifyRegister();

            if (!regModificar.isOK()) {
                errores.push("Fila " + numFila + " (ID " + idAlmacen + "): error al modificar — " + regModificar.errorMessage());
                continue bucle_filas;
            }

            correctos++;
            log("Almacén actualizado: ID=" + idAlmacen + ", NAME=" + nombre);
        }
    }

    // --- Cerrar transacción ---
    if (nuevaTrans) {
        theRoot.commitTrans();
    }

    // --- Informe de resultado ---
    var msg = correctos + " almacén(ces) procesados correctamente";

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
