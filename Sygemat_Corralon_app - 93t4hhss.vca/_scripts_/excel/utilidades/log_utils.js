/**
 * log_utils.js
 * Utilidad de log ligera para depuración en procesos Velneo.
 *
 * Acumula mensajes durante la ejecución y los muestra en un único
 * alert al final, evitando interrumpir el flujo con diálogos intermedios.
 *
 * Uso típico:
 *   #include "(CurrentProject)/excel/utilidades/log_utils.js"
 *
 *   log("Inicio del proceso");
 *   log("binario.length = " + binario.length);
 *   logError("Fallo al abrir fichero");
 *   mostrarLog();   // muestra todo al final
 *
 * Para activar/desactivar sin tocar el código:
 *   LOG_ACTIVO = false;
 */

var LOG_ACTIVO  = true;
var _log_lineas = [];

/**
 * Registra un mensaje informativo.
 * @param {string} msg
 */
function log(msg) {
    if (LOG_ACTIVO) {
        _log_lineas.push("[INFO]  " + msg);
    }
}

/**
 * Registra un mensaje de error.
 * @param {string} msg
 */
function logError(msg) {
    if (LOG_ACTIVO) {
        _log_lineas.push("[ERROR] " + msg);
    }
}

/**
 * Muestra todos los mensajes acumulados en un único alert y limpia el buffer.
 */
function mostrarLog() {
    if (LOG_ACTIVO && _log_lineas.length > 0) {
        alert(_log_lineas.join("\n"), "Log de depuración");
        _log_lineas = [];
    }
}
