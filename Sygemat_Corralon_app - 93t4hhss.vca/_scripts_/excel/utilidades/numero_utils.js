/**
 * numero_utils.js
 * Funciones de utilidad para el formateo de números.
 *
 * Uso:
 *   #include "(CurrentProject)/excel/utilidades/numero_utils.js"
 */

var numero_utils = {

    /**
     * Formatea un número con separadores de decimales y de miles configurables.
     *
     * @param {number} numero      - Número a formatear.
     * @param {number} decimales   - Cantidad de decimales a mostrar.
     * @param {string} sepDecimal  - Separador decimal (por defecto ".").
     * @param {string} sepMiles    - Separador de miles (por defecto ",").
     * @returns {string} Número formateado como cadena.
     *
     * @example
     *   numero_utils.formatear(1234567.89, 2, ',', '.')  →  "1.234.567,89"
     */
    formatear: function(numero, decimales, sepDecimal, sepMiles) {
        if (isNaN(numero) || numero === null) return "";

        var valorFormateado = parseFloat(numero).toFixed(~~decimales);
        sepMiles = typeof sepMiles === "string" ? sepMiles : ",";

        var partes  = valorFormateado.split(".");
        var entero  = partes[0];
        var decimal = partes[1] ? (sepDecimal || ".") + partes[1] : "";

        return entero.replace(/(\d)(?=(?:\d{3})+$)/g, "$1" + sepMiles) + decimal;
    }

};
