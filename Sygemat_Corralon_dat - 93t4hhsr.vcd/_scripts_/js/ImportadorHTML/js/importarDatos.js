var payload = JSON.parse(theRoot.varToString("DAT"));
var cabecera = payload[0];
var datos = payload[1].datos;
var tablaIdRef = cabecera.tablaIdRef;
var indiceId = cabecera.indiceId;
var indicePartes = cabecera.indicePartes;

var registro = new VRegister(theRoot);
registro.setTable(tablaIdRef);

// Traza completa del registro (todos los campos que se han intentado grabar, tal cual llegan ya
// convertidos a JSON sea cual sea el formato de origen -- CSV, XLSX, JSON o XML). Permite
// localizar la fila en el fichero de origen buscando esos valores, sin depender de asumir cómo
// cuenta filas ese formato concreto (cabecera, filas vacías, etc.).
function construirTrazaRegistro(filaJSON) {
    var partes = [];
    for (var campoId in filaJSON) {
        partes.push(campoId + "=" + filaJSON[campoId]);
    };
    return " [" + partes.join(", ") + "]";
};

var altas = 0;
var modificaciones = 0;
var errores = 0;
var mensajesError = [];

var hayTransPrevia = theRoot.existTrans();
if (!hayTransPrevia) {
    var nuevaTrans = theRoot.beginTrans("Importación de datos - " + tablaIdRef);
};

for (var i = 0; i < datos.length; i++) {
    var filaJSON = datos[i];
    try {
        var existe = false;
        if (indiceId && indicePartes && indicePartes.length) {
            var claves = [];
            for (var p = 0; p < indicePartes.length; p++) {
                claves.push(filaJSON[indicePartes[p]]);
            };
            existe = registro.readRegister(indiceId, claves, VRegister.SearchThis);
        };
        if (existe) {
            for (var campoId in filaJSON) {
                registro.setField(campoId, filaJSON[campoId]);
            };
            if (registro.modifyRegister()) {
                modificaciones = modificaciones + 1;
            } else {
                errores = errores + 1;
                mensajesError.push("error " + registro.errorNumber() + " -- " + registro.errorMessage() + construirTrazaRegistro(filaJSON));
            };
        } else {
            var nuevoRegistro = new VRegister(theRoot);
            nuevoRegistro.setTable(tablaIdRef);
            for (var campoIdNuevo in filaJSON) {
                nuevoRegistro.setField(campoIdNuevo, filaJSON[campoIdNuevo]);
            };
            if (nuevoRegistro.addRegister()) {
                altas = altas + 1;
            } else {
                errores = errores + 1;
                mensajesError.push("error " + nuevoRegistro.errorNumber() + " -- " + nuevoRegistro.errorMessage() + construirTrazaRegistro(filaJSON));
            };
        };
    } catch (e) {
        errores = errores + 1;
        mensajesError.push("error -- " + e + construirTrazaRegistro(filaJSON));
    };
};

if (nuevaTrans) {
    theRoot.commitTrans();
};

theRoot.setVar("DAT", JSON.stringify({ altas: altas, modificaciones: modificaciones, errores: errores, mensajesError: mensajesError }));
