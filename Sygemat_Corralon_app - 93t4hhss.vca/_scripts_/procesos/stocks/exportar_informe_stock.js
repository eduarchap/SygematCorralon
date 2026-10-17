/**
 * exportar_informe_stock.js
 * Genera un informe Excel profesional del estado del stock con estilos completos.
 *
 * El informe muestra:
 *   - Encabezado con título y fecha (fusionado)
 *   - Tabla con datos: ALMACEN, ARTICULO, STOCK
 *   - Subtotales por almacén (con color diferenciado)
 *   - Total general con fondo destacado
 *   - Bordes y colores en todas las celdas
 *   - Formato de números y alineaciones
 *
 * Usa xlsx-js-style para aplicar estilos complejos (colores, bordes, fuentes, etc.)
 *
 * Variables de entrada:
 *   PAR_RUTA_DIRECTORIO  {string}  Ruta del directorio donde se guardará el fichero.
 *
 * Tablas usadas:
 *   course_sheetjs_dat/STOCK_ARTICULOS
 *   course_sheetjs_dat/ALMACENES
 *   course_sheetjs_dat/ARTICULOS
 */

#include "(CurrentProject)/excel/lib/xlsx-js-style/xlsx.bundle.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_estilos_utils.js"

var directorio = theRoot.varToString("PAR_RUTA_DIRECTORIO");
var ruta       = directorio + "/informe_stock.xlsx";

log("directorio = " + directorio);
log("ruta       = " + ruta);

if (directorio === "") {
    alert("Falta el directorio de salida.", "Error");
} else {

    // --- Cargar datos ---
    var listaStock = new VRegisterList(theRoot);
    listaStock.setTable("course_sheetjs_dat/STOCK_ARTICULOS");

    if (!listaStock.load("ID", [])) {
        alert("No se pudieron cargar los datos de stock.", "Error");
    } else {

        listaStock.sort(["ALMACENES", "ARTICULOS"]);
        log("registros de stock: " + listaStock.size());

        // --- Mapas de caché ---
        var cacheAlmacenes = {};
        var cacheArticulos = {};

        function obtenerNombreAlmacen(idAlmacen) {
            if (!cacheAlmacenes[idAlmacen]) {
                var lista = new VRegisterList(theRoot);
                lista.setTable("course_sheetjs_dat/ALMACENES");
                lista.load("ID", [idAlmacen]);
                cacheAlmacenes[idAlmacen] = (lista.size() > 0) ? lista.readAt(0).fieldToString("NAME") : "Almacén " + idAlmacen;
            }
            return cacheAlmacenes[idAlmacen];
        }

        function obtenerNombreArticulo(idArticulo) {
            if (!cacheArticulos[idArticulo]) {
                var lista = new VRegisterList(theRoot);
                lista.setTable("course_sheetjs_dat/ARTICULOS");
                lista.load("ID", [idArticulo]);
                cacheArticulos[idArticulo] = (lista.size() > 0) ? lista.readAt(0).fieldToString("NAME") : "Artículo " + idArticulo;
            }
            return cacheArticulos[idArticulo];
        }

        // --- Construir estructura de datos ---
        var hoy = new Date();
        var fechaFormato = hoy.getDate() + "/" + (hoy.getMonth() + 1) + "/" + hoy.getFullYear();
        var horaFormato = hoy.getHours() + ":" + (hoy.getMinutes() < 10 ? "0" : "") + hoy.getMinutes();

        var filas = [];

        // Fila 0: Título principal (se fusionará)
        filas.push([
            { valor: "INFORME DE STOCK", tipo: "texto", estilo: {
                negrita: true,
                tamanoFuente: 18,
                colorFuente: "FFFFFF",
                colorFondo: "1F4E78",   // Azul oscuro
                alineacionH: "centro",
                alineacionV: "centro",
                borde: "normal",
                colorBorde: "1F4E78"
            }},
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} }
        ]);

        // Fila 1: Fecha y hora
        filas.push([
            { valor: "Generado: " + fechaFormato + " a las " + horaFormato, tipo: "texto", estilo: {
                cursiva: true,
                tamanoFuente: 10,
                colorFuente: "595959",
                colorFondo: "D9E1F2",
                alineacionH: "izquierda",
                borde: "normal",
                colorBorde: "A4A4A4"
            }},
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} }
        ]);

        // Fila 2: Vacía (separador)
        filas.push([
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} }
        ]);

        // Fila 3: Encabezados de tabla
        var estiloEncabezado = {
            negrita: true,
            tamanoFuente: 11,
            colorFuente: "FFFFFF",
            colorFondo: "70AD47",   // Verde
            alineacionH: "centro",
            alineacionV: "centro",
            borde: "normal",
            colorBorde: "4A7C2C"
        };

        filas.push([
            { valor: "ALMACEN", tipo: "texto", estilo: estiloEncabezado },
            { valor: "ARTICULO", tipo: "texto", estilo: estiloEncabezado },
            { valor: "STOCK", tipo: "texto", estilo: estiloEncabezado }
        ]);

        // Filas de datos
        var totalStock = 0;
        var almacenActual = -1;
        var subtotalAlmacen = 0;
        var nombreAlmacenActual = "";

        var estiloDataPar = {
            alineacionH: "izquierda",
            borde: "normal",
            colorBorde: "E2EFDA"
        };

        var estiloDataImpar = {
            alineacionH: "izquierda",
            colorFondo: "F2F2F2",
            borde: "normal",
            colorBorde: "E2EFDA"
        };

        var estiloDataNumero = {
            alineacionH: "derecha",
            formato: "#,##0",
            borde: "normal",
            colorBorde: "E2EFDA"
        };

        var estiloDataNumeroImpar = {
            alineacionH: "derecha",
            colorFondo: "F2F2F2",
            formato: "#,##0",
            borde: "normal",
            colorBorde: "E2EFDA"
        };

        var estiloSubtotal = {
            negrita: true,
            colorFondo: "E2EFDA",
            alineacionH: "derecha",
            formato: "#,##0",
            borde: "normal",
            colorBorde: "70AD47"
        };

        var numFilaData = 0;

        for (var i = 0; i < listaStock.size(); i++) {
            var reg = listaStock.readAt(i);
            var idAlmacen = reg.fieldToInt("ALMACENES");
            var idArticulo = reg.fieldToInt("ARTICULOS");
            var stock = reg.fieldToInt("NSTOCK");

            // --- Si cambia de almacén, mostrar subtotal ---
            if (almacenActual !== -1 && almacenActual !== idAlmacen) {
                var estiloSubtotalAlmacen = JSON.parse(JSON.stringify(estiloSubtotal));
                estiloSubtotalAlmacen.colorFondo = "C6E0B4";

                filas.push([
                    { valor: "Subtotal: " + nombreAlmacenActual, tipo: "texto", estilo: {
                        negrita: true,
                        colorFondo: "C6E0B4",
                        alineacionH: "derecha",
                        borde: "normal",
                        colorBorde: "70AD47"
                    }},
                    { valor: "", tipo: "texto", estilo: {} },
                    { valor: subtotalAlmacen, tipo: "numero", estilo: estiloSubtotalAlmacen }
                ]);

                // Fila vacía para separar almacenes
                filas.push([
                    { valor: "", tipo: "texto", estilo: {} },
                    { valor: "", tipo: "texto", estilo: {} },
                    { valor: "", tipo: "texto", estilo: {} }
                ]);

                numFilaData = 0;
            }

            // Elegir estilo par/impar
            var estiloFila = (numFilaData % 2 === 0) ? estiloDataPar : estiloDataImpar;
            var estiloNumeroDatos = (numFilaData % 2 === 0) ? estiloDataNumero : estiloDataNumeroImpar;

            filas.push([
                { valor: obtenerNombreAlmacen(idAlmacen), tipo: "texto", estilo: estiloFila },
                { valor: obtenerNombreArticulo(idArticulo), tipo: "texto", estilo: estiloFila },
                { valor: stock, tipo: "numero", estilo: estiloNumeroDatos }
            ]);

            totalStock += stock;
            subtotalAlmacen += stock;
            almacenActual = idAlmacen;
            nombreAlmacenActual = obtenerNombreAlmacen(idAlmacen);
            numFilaData++;
        }

        // --- Subtotal del último almacén ---
        if (almacenActual !== -1) {
            filas.push([
                { valor: "Subtotal: " + nombreAlmacenActual, tipo: "texto", estilo: {
                    negrita: true,
                    colorFondo: "C6E0B4",
                    alineacionH: "derecha",
                    borde: "normal",
                    colorBorde: "70AD47"
                }},
                { valor: "", tipo: "texto", estilo: {} },
                { valor: subtotalAlmacen, tipo: "numero", estilo: {
                    negrita: true,
                    colorFondo: "C6E0B4",
                    alineacionH: "derecha",
                    formato: "#,##0",
                    borde: "normal",
                    colorBorde: "70AD47"
                }}
            ]);
        }

        // Fila vacía
        filas.push([
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "", tipo: "texto", estilo: {} }
        ]);

        // --- Total general ---
        var estiloTotal = {
            negrita: true,
            tamanoFuente: 12,
            colorFuente: "FFFFFF",
            colorFondo: "FFC000",   // Naranja/Oro
            alineacionH: "derecha",
            formato: "#,##0",
            borde: "grueso",
            colorBorde: "FF8C00"
        };

        filas.push([
            { valor: "", tipo: "texto", estilo: {} },
            { valor: "TOTAL GENERAL", tipo: "texto", estilo: {
                negrita: true,
                tamanoFuente: 12,
                colorFuente: "FFFFFF",
                colorFondo: "FFC000",
                alineacionH: "derecha",
                borde: "grueso",
                colorBorde: "FF8C00"
            }},
            { valor: totalStock, tipo: "numero", estilo: estiloTotal }
        ]);

        log("filas construidas: " + filas.length);

        // --- Configurar columnas ---
        var columnas = [
            { ancho: 25 },   // ALMACEN
            { ancho: 35 },   // ARTICULO
            { ancho: 12 }    // STOCK
        ];

        // --- Configurar fusiones ---
        var fusiones = [
            { desde: [0, 0], hasta: [2, 0] },   // Título fusionado A1:C1
            { desde: [0, 1], hasta: [2, 1] }    // Fecha fusionada A2:C2
        ];

        // --- Construir JSON para exportación ---
        var datosExcel = {
            titulo: "Informe Stock",
            asunto: "Estado actual del inventario por almacén",
            autor:  "Sistema de Control de Stock",
            hojas: [{
                nombre: "Stock",
                filas: filas,
                columnas: columnas,
                fusiones: fusiones
            }]
        };

        // log("datosExcel construido");

        var workbook = jsonAWorkbookConEstilos(datosExcel);
        // log("workbook configurado");

        var binario = workbookABinario(workbook);
        // log("binario.length = " + binario.length);

        var ok = escribirBinarioEnFichero(ruta, binario);
        // log("escribirBinarioEnFichero → " + ok);

        // mostrarLog();

        if (ok) {
            alert("Informe generado:\n" + ruta);
        }
    }
}
