/**
 * fichero_utils.js
 * Funciones de utilidad para leer y escribir ficheros usando la API VFile de Velneo.
 * También incluye funciones de serialización para pasar binarios entre procesos Velneo.
 *
 * Uso:
 *   #include "(CurrentProject)/excel/utilidades/fichero_utils.js"
 */

importClass("VFile");

/**
 * Lee un fichero y devuelve su contenido como cadena binaria.
 *
 * @param {string} ruta - Ruta absoluta del fichero a leer.
 * @returns {string|null} Cadena binaria con el contenido del fichero, o null si hubo error.
 */
function leerFicheroComoBinario(ruta) {
    var fichero = new VFile(ruta);

    if (!fichero.open(VFile.OpenModeReadOnly)) {
        alert("No se pudo abrir el fichero:\n" + ruta, "Error");
        return null;
    }

    var binario      = "";
    var bytesLeidos  = fichero.readBuffer();

    while (bytesLeidos !== 0) {
        for (var i = 0; i < bytesLeidos; i++) {
            binario += String.fromCharCode(fichero.bufferAt(i));
        }
        bytesLeidos = fichero.readBuffer();
    }

    fichero.close();
    return binario;
}

/**
 * Escribe un array de bytes en un fichero (lo crea o sobreescribe si ya existe).
 *
 * @param {string} ruta   - Ruta absoluta del fichero a escribir.
 * @param {Array}  datos  - Array de bytes (Uint8Array o similar) a escribir.
 * @returns {boolean} true si se escribió correctamente, false si hubo error.
 */
function escribirBinarioEnFichero(ruta, datos) {
    var fichero = new VFile(ruta);

    if (!fichero.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
        alert("No se pudo crear el fichero:\n" + ruta, "Error");
        return false;
    }

    // XLSX.write({type:'binary'}) devuelve una cadena binaria.
    // charCodeAt(i) extrae el valor numérico de cada byte (0-255) para setBufferAt.
    fichero.setBufferSize(datos.length);
    for (var i = 0; i < datos.length; i++) {
        fichero.setBufferAt(i, datos.charCodeAt(i));
    }
    fichero.writeBuffer(datos.length);
    fichero.close();

    return true;
}


// ---------------------------------------------------------------------------
// Serialización para pasar binarios entre procesos Velneo
// ---------------------------------------------------------------------------
// Velneo solo permite pasar strings entre procesos mediante setVar/varToString.
// En el motor JS de Velneo, XLSX.write() ya devuelve una cadena binaria,
// por lo que la serialización es transparente (la cadena se pasa tal cual).
//
// Proceso generador:  theRoot.setVar("RET_XLSX", serializarBinario(binario));
// Proceso guardador:  escribirBinarioEnFichero(ruta, deserializarBinario(cadena));
// ---------------------------------------------------------------------------

/**
 * Prepara el binario generado por XLSX.write() para pasarlo entre procesos Velneo.
 * En este motor, el binario ya es una cadena, así que se devuelve tal cual.
 *
 * @param {string} binario - Cadena binaria generada por XLSX.write().
 * @returns {string} La misma cadena, lista para guardar en una variable Velneo.
 */
function serializarBinario(binario) {
    return binario;
}

/**
 * Recupera el binario a partir de una variable Velneo para pasarlo a escribirBinarioEnFichero().
 *
 * @param {string} cadena - Cadena obtenida de una variable Velneo.
 * @returns {string} La misma cadena, lista para escribirBinarioEnFichero().
 */
function deserializarBinario(cadena) {
    return cadena;
}
