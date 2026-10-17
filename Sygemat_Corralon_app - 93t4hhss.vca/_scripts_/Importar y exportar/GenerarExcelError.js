// ---- Generar CSV dinámico desde cualquier array de objetos ----
function arrayToCSV(arr, orderedHeaders) {
    if (!arr || arr.length === 0) return "";

    var headers;
    if (orderedHeaders && orderedHeaders.length > 0) {
        headers = orderedHeaders;
    } else {
        // Extraer headers dinámicamente de todos los objetos
        headers = [];
        var headerSet = {};
        for (var i = 0; i < arr.length; i++) {
            for (var key in arr[i]) {
                if (arr[i].hasOwnProperty(key) && !headerSet[key]) {
                    headers.push(key);
                    headerSet[key] = true;
                }
            }
        }
    }

    var lines = [];
    lines.push(headers.join(";"));

    for (var i = 0; i < arr.length; i++) {
        var row = [];
        for (var h = 0; h < headers.length; h++) {
            var val = arr[i][headers[h]];
            if (val === null || val === undefined) val = "";
            val = String(val);
            if (val.indexOf(";") !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            row.push(val);
        }
        lines.push(row.join(";"));
    }

    return lines.join("\n");
}

// ---- Main ----
var arrayResumen  = JSON.parse( theRoot.varToString("REPORTE_RESUMEN") || "[]" );
var columnasStr   = theRoot.varToString("REPORTE_COLUMNAS");
var columnasOrden = columnasStr ? columnasStr.split(",") : null;
var csvContent    = arrayToCSV( arrayResumen, columnasOrden );

theRoot.setVar("REPORTE_CSV", csvContent);
alert("CSV Resumen: " + csvContent );