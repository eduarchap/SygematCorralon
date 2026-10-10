/**
 * fecha_utils.js
 * Funciones de utilidad para el manejo de fechas.
 *
 * Uso:
 *   #include "(CurrentProject)/excel/utilidades/fecha_utils.js"
 */

var fecha_utils = {

    /**
     * Comprueba si un valor es una fecha válida.
     *
     * @param {*} fecha - Valor a comprobar.
     * @returns {boolean}
     */
    esValida: function(fecha) {
        return fecha instanceof Date && !isNaN(fecha);
    },

    /**
     * Convierte un número de serie de Excel a un objeto Date de JavaScript.
     * Útil al leer celdas de tipo fecha con SheetJS.
     *
     * @param {number} codigoFecha - Número de serie de Excel (ej: 45678).
     * @returns {Date}
     */
    desdeCodigoExcel: function(codigoFecha) {
        var partes = XLSX.SSF.parse_date_code(codigoFecha);
        return new Date(partes.y, partes.m - 1, partes.d);
    },

    /**
     * Formatea una fecha como cadena en formato DD/MM/AAAA.
     *
     * @param {Date} fecha
     * @returns {string}
     */
    aDDMMAAAA: function(fecha) {
        if (!this.esValida(fecha)) return "";
        var dia  = String(fecha.getDate()).padStart(2, "0");
        var mes  = String(fecha.getMonth() + 1).padStart(2, "0");
        var anio = fecha.getFullYear();
        return dia + "/" + mes + "/" + anio;
    }

};
