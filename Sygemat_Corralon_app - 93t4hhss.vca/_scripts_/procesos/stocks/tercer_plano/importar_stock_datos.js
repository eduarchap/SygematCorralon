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

importClass("VRegister");
importClass("VRegisterList");

// --- Leer binario ---
var binario = deserializarBinario(theRoot.varToString("PAR_XLSX"));

if (binario !== null) {

    var workbook = parsearWorkbook(binario);
    var filas    = hojaAJson(workbook, 0);

    var errores   = [];
    var correctos = 0;

    // Listas de apoyo para validaciones (solo lectura)
    // VRegister no tiene método load(); para buscar por clave se usa VRegisterList.
    var listaValidAlmacen = new VRegisterList(theRoot);
    listaValidAlmacen.setTable("course_sheetjs_dat/ALMACENES");

    var listaValidArticulo = new VRegisterList(theRoot);
    listaValidArticulo.setTable("course_sheetjs_dat/ARTICULOS");

    // Lista para buscar en STOCK_ARTICULOS
    var listaStock = new VRegisterList(theRoot);
    listaStock.setTable("course_sheetjs_dat/STOCK_ARTICULOS");

    // Registro para crear nuevos registros en STOCK_ARTICULOS
    var regNuevo = new VRegister(theRoot);
    regNuevo.setTable("course_sheetjs_dat/STOCK_ARTICULOS");

    // --- Abrir transacción para todas las escrituras ---
    var hayTrans    = theRoot.existTrans();
    var nuevaTrans  = false;

    if (!hayTrans) {
        nuevaTrans = theRoot.beginTrans("Importar stock desde Excel");
    }

    bucle_filas: for (var i = 0; i < filas.length; i++) {
        var fila    = filas[i];
        var numFila = i + 2; // +2: fila 1 son cabeceras, arrays empiezan en 0

        // --- Validar ID_ALMACEN ---
        if (fila.ID_ALMACEN === "" || fila.ID_ALMACEN === undefined) {
            errores.push("Fila " + numFila + ": ID_ALMACEN está vacío");
            continue;
        }
        var idAlmacen = parseInt(fila.ID_ALMACEN);
        if (isNaN(idAlmacen)) {
            errores.push("Fila " + numFila + ": ID_ALMACEN no es un número válido");
            continue;
        }
        listaValidAlmacen.load("ID", [idAlmacen]);
        if (listaValidAlmacen.size() === 0) {
            errores.push("Fila " + numFila + ": el almacén con ID " + idAlmacen + " no existe");
            continue;
        }

        // --- Validar ID_ARTICULO ---
        if (fila.ID_ARTICULO === "" || fila.ID_ARTICULO === undefined) {
            errores.push("Fila " + numFila + ": ID_ARTICULO está vacío");
            continue;
        }
        var idArticulo = parseInt(fila.ID_ARTICULO);
        if (isNaN(idArticulo)) {
            errores.push("Fila " + numFila + ": ID_ARTICULO no es un número válido");
            continue;
        }
        listaValidArticulo.load("ID", [idArticulo]);
        if (listaValidArticulo.size() === 0) {
            errores.push("Fila " + numFila + ": el artículo con ID " + idArticulo + " no existe");
            continue;
        }

        // --- Validar STOCK ---
        if (fila.STOCK === "" || fila.STOCK === undefined) {
            errores.push("Fila " + numFila + " (artículo " + idArticulo + "): STOCK está vacío");
            continue;
        }
        var stock = parseFloat(fila.STOCK);
        if (isNaN(stock)) {
            errores.push("Fila " + numFila + " (artículo " + idArticulo + "): STOCK no es un número válido");
            continue;
        }
        if (stock < 0) {
            errores.push("Fila " + numFila + " (artículo " + idArticulo + "): STOCK no puede ser negativo");
            continue;
        }

        // --- Buscar registro existente en STOCK_ARTICULOS ---
        var encontrado = false;

        if (listaStock.load("ALMACENES", [idAlmacen])) {
            for (var j = 0; j < listaStock.size(); j++) {
                if (listaStock.readAt(j).fieldToInt("ARTICULOS") === idArticulo) {
                    // Registro encontrado → modificar NSTOCK
                    var regModificar = listaStock.readLockingAt(j);
                    regModificar.setField("NSTOCK", stock);
                    regModificar.modifyRegister();

                    if (!regModificar.isOK()) {
                        errores.push("Fila " + numFila + " (artículo " + idArticulo + "): error al modificar — " + regModificar.errorMessage());
                        continue bucle_filas;
                    }

                    encontrado = true;
                    break;
                }
            }
        }

        // --- Crear registro si no existe ---
        if (!encontrado) {
            regNuevo.setField("ALMACENES", idAlmacen);
            regNuevo.setField("ARTICULOS", idArticulo);
            regNuevo.setField("NSTOCK",    stock);
            regNuevo.addRegister();

            if (!regNuevo.isOK()) {
                errores.push("Fila " + numFila + " (artículo " + idArticulo + "): error al crear — " + regNuevo.errorMessage());
                continue;
            }
        }

        correctos++;
    }

    // --- Cerrar transacción ---
    if (nuevaTrans) {
        theRoot.commitTrans();
    }

    // --- Informe de resultado ---
    var msg = correctos + " registro(s) de stock actualizados correctamente.";

    if (errores.length > 0) {
        msg += "\n\n" + errores.length + " error(es) encontrado(s):\n" + errores.join("\n");
    }

    alert(msg);
}
