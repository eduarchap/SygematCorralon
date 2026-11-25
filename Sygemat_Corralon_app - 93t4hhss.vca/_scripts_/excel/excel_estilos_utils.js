/**
 * excel_estilos_utils.js
 * Capa de abstracción sobre xlsx-js-style para crear ficheros Excel con estilos.
 *
 * IMPORTANTE: Requiere xlsx-js-style (NO xlsx.full.min.js).
 * Ambas librerías definen el objeto XLSX y no pueden usarse a la vez.
 *
 * Uso:
 *   #include "(CurrentProject)/excel/lib/xlsx-js-style/xlsx.bundle.js"
 *   #include "(CurrentProject)/excel/excel_estilos_utils.js"
 *
 * ---------------------------------------------------------------------------
 * CONTRATO JSON (PAR_CJSON esperado por json_a_xlsx_con_estilos.js):
 * ---------------------------------------------------------------------------
 * {
 *   "titulo":  "Título del fichero",
 *   "asunto":  "Asunto (opcional)",
 *   "autor":   "Nombre del autor (opcional)",
 *   "hojas": [
 *     {
 *       "nombre": "Nombre de la hoja",
 *
 *       "columnas": [                       ← opcional
 *         { "ancho": 20, "oculta": false },
 *         { "ancho": 15 }
 *       ],
 *
 *       "filas": [                          ← array de filas, cada fila es un array de celdas
 *         [
 *           {
 *             "valor":  "Texto de celda",
 *             "tipo":   "texto",            ← "texto" | "numero" | "formula" | "booleano"
 *             "estilo": {                   ← opcional. Todas las propiedades son opcionales.
 *               "negrita":       true,
 *               "cursiva":       false,
 *               "tamanoFuente":  12,
 *               "colorFuente":   "FFFFFF",  ← hex RGB sin "#"
 *               "colorFondo":    "6F6F6F",  ← hex RGB sin "#"
 *               "alineacionH":   "centro",  ← "izquierda" | "centro" | "derecha"
 *               "alineacionV":   "centro",  ← "arriba"    | "centro" | "abajo"
 *               "formato":       "#,##0.00",← formato numérico de Excel
 *               "borde":         "normal",  ← "normal" | "grueso" | null
 *               "colorBorde":    "D9D9D9"   ← hex RGB sin "#" (solo si borde != null)
 *             }
 *           }
 *         ]
 *       ],
 *
 *       "fusiones": [                       ← opcional. Celdas fusionadas.
 *         {
 *           "desde": [columna, fila],       ← ej: [0, 0] = celda A1
 *           "hasta": [columna, fila]        ← ej: [2, 0] = celda C1
 *         }
 *       ]
 *     }
 *   ]
 * }
 */


/**
 * Crea un workbook de xlsx-js-style con estilos a partir de una estructura de datos.
 *
 * @param {Object} datosExcel - Estructura JSON descrita en el contrato anterior.
 * @returns {Object} Workbook listo para exportar con workbookABinario().
 */
function jsonAWorkbookConEstilos(datosExcel) {
    var wb = XLSX.utils.book_new();

    wb.Props = {
        Title:   datosExcel.titulo || "",
        Subject: datosExcel.asunto || "",
        Author:  datosExcel.autor  || ""
    };

    for (var i = 0; i < datosExcel.hojas.length; i++) {
        var hoja = datosExcel.hojas[i];
        var ws   = XLSX.utils.aoa_to_sheet([[]]);

        _aplicarColumnas(ws, hoja.columnas);
        _aplicarFilas(ws, hoja.filas);
        _aplicarFusiones(ws, hoja.fusiones);

        XLSX.utils.book_append_sheet(wb, ws, hoja.nombre);
    }

    return wb;
}

/**
 * Serializa un workbook a un array de bytes listo para guardar en disco.
 * (Idéntica a la de excel_utils.js pero para xlsx-js-style.)
 *
 * @param {Object} workbook - Workbook de xlsx-js-style.
 * @returns {Array} Array de bytes del fichero .xlsx.
 */
function workbookABinario(workbook) {
    return XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
}


// ---------------------------------------------------------------------------
// Funciones privadas (prefijo _ = uso interno, no llamar desde fuera)
// ---------------------------------------------------------------------------

function _aplicarColumnas(ws, columnas) {
    if (!columnas || columnas.length === 0) return;

    ws["!cols"] = [];
    for (var i = 0; i < columnas.length; i++) {
        ws["!cols"].push({
            wch:    columnas[i].ancho  || 10,
            hidden: columnas[i].oculta || false
        });
    }
}

function _aplicarFilas(ws, filas) {
    if (!filas || filas.length === 0) return;

    for (var indiceFila = 0; indiceFila < filas.length; indiceFila++) {
        var fila = filas[indiceFila];
        for (var indiceColumna = 0; indiceColumna < fila.length; indiceColumna++) {
            var celda      = fila[indiceColumna];
            var datosCelda = _construirCelda(celda);
            XLSX.utils.sheet_add_aoa(ws, [[datosCelda]], {
                origin: { c: indiceColumna, r: indiceFila }
            });
        }
    }
}

function _aplicarFusiones(ws, fusiones) {
    if (!fusiones || fusiones.length === 0) return;

    ws["!merges"] = [];
    for (var i = 0; i < fusiones.length; i++) {
        ws["!merges"].push({
            s: { c: fusiones[i].desde[0], r: fusiones[i].desde[1] },
            e: { c: fusiones[i].hasta[0], r: fusiones[i].hasta[1] }
        });
    }
}

function _construirCelda(celda) {
    var estilo = _traducirEstilo(celda.estilo || null);

    if (celda.tipo === "formula") {
        return { f: celda.valor, t: "n", s: estilo };
    }

    var mapTipo = { "texto": "s", "numero": "n", "booleano": "b" };
    return {
        v: celda.valor,
        t: mapTipo[celda.tipo] || "s",
        s: estilo
    };
}

function _traducirEstilo(estilo) {
    if (!estilo) return {};

    var xlsxEstilo      = {};
    var fuente          = {};
    var alineacion      = {};
    var tieneFuente     = false;
    var tieneAlineacion = false;

    // Fuente
    if (estilo.negrita)      { fuente.bold   = true;                         tieneFuente = true; }
    if (estilo.cursiva)      { fuente.italic = true;                         tieneFuente = true; }
    if (estilo.tamanoFuente) { fuente.sz     = estilo.tamanoFuente;          tieneFuente = true; }
    if (estilo.colorFuente)  { fuente.color  = { rgb: estilo.colorFuente };  tieneFuente = true; }
    if (tieneFuente) xlsxEstilo.font = fuente;

    // Relleno
    if (estilo.colorFondo) {
        xlsxEstilo.fill = {
            patternType: "solid",
            fgColor: { rgb: estilo.colorFondo }
        };
    }

    // Alineación
    var mapH = { "izquierda": "left", "centro": "center", "derecha": "right" };
    var mapV = { "arriba": "top",     "centro": "center", "abajo":  "bottom" };
    if (estilo.alineacionH) { alineacion.horizontal = mapH[estilo.alineacionH] || estilo.alineacionH; tieneAlineacion = true; }
    if (estilo.alineacionV) { alineacion.vertical   = mapV[estilo.alineacionV] || estilo.alineacionV; tieneAlineacion = true; }
    if (tieneAlineacion) xlsxEstilo.alignment = alineacion;

    // Formato numérico
    if (estilo.formato) xlsxEstilo.numFmt = estilo.formato;

    // Borde
    if (estilo.borde) {
        var colorBorde = estilo.colorBorde || "D9D9D9";
        var grosor     = (estilo.borde === "grueso") ? "medium" : "thin";
        var lado       = { style: grosor, color: { rgb: colorBorde } };
        xlsxEstilo.border = { top: lado, bottom: lado, left: lado, right: lado };
    }

    return xlsxEstilo;
}
