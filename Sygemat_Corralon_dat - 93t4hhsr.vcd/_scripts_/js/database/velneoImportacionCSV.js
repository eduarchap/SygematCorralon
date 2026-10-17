/**
 * Importación de registros en una tabla a partir de CSV separado por ;
 */

importClass("VDir");
importClass("VFile");
importClass("VTextFile");

// --------------------------------------------------------------------------------
// Devuelve el idRef de una tabla a partir de su Id
// --------------------------------------------------------------------------------
var tablaIdRef = function (tablaId)
{
    var proyecto = theApp.mainProjectInfo();

    for (var numTabla = 0; numTabla < proyecto.allTableCount(); numTabla++) {
        if (proyecto.allTableInfo(numTabla).id() == tablaId) {
            return proyecto.allTableInfo(numTabla).idRef();
        }
    }

    return null;
};

// --------------------------------------------------------------------------------
// Detecta campos numéricos y de fecha desde el esquema de la tabla en Velneo
// --------------------------------------------------------------------------------
function obtenerCamposPorTipo(idRef)
{
    var numericos = [];
    var fechas    = [];
    var proyecto  = theApp.mainProjectInfo();

    for (var t = 0; t < proyecto.allTableCount(); t++) {
        var tablaInf = proyecto.allTableInfo(t);
        if (tablaInf.idRef() == idRef) {
            var numCampos = tablaInf.fieldCount();
            for (var f = 0; f < numCampos; f++) {
                var tipo = tablaInf.fieldType(f);
                if (tipo === VTableInfo.FieldTypeNumeric ||
                    tipo === VTableInfo.FieldTypeFormulaNumeric) {
                    numericos.push(tablaInf.fieldId(f).toUpperCase());
                } else if (tipo === VTableInfo.FieldTypeDate     ||
                           tipo === VTableInfo.FieldTypeDateTime  ||
                           tipo === VTableInfo.FieldTypeFormulaDate ||
                           tipo === VTableInfo.FieldTypeFormulaDateTime) {
                    fechas.push(tablaInf.fieldId(f).toUpperCase());
                }
            }
            break;
        }
    }

    return { numericos: numericos, fechas: fechas };
}

// --------------------------------------------------------------------------------
// Limpieza general de texto
// --------------------------------------------------------------------------------
function limpiarTexto(valor)
{
    if (valor === null || valor === undefined) return "";

    return valor
        .toString()
        .trim()
        .replace(/[\n\r]/g, " ")
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ");
}

// --------------------------------------------------------------------------------
// Deja solo números
// Ej: 30-51663117-8 → 30516631178
// --------------------------------------------------------------------------------
function limpiarSoloNumeros(valor)
{
    if (valor === null || valor === undefined) return "";

    return valor
        .toString()
        .trim()
        .replace(/[^0-9]/g, "");
}

// --------------------------------------------------------------------------------
// Limpieza numérica inteligente
// --------------------------------------------------------------------------------
function limpiarNumero(valor)
{
    valor = limpiarTexto(valor);

    if (!valor) {
        return "0";
    }

    valor = valor
        .replace(/\$/g, "")
        .replace(/€/g, "")
        .replace(/"/g, "")
        .replace(/'/g, "")
        .replace(/\s/g, "");

    // Tiene punto Y coma: el que está antes es el separador de miles
    if (valor.indexOf(".") > -1 && valor.indexOf(",") > -1) {
        if (valor.indexOf(",") < valor.indexOf(".")) {
            // 11,732.45 → 11732.45  (coma = miles, punto = decimal)
            valor = valor.replace(/,/g, "");
        } else {
            // 11.732,45 → 11732.45  (punto = miles, coma = decimal)
            valor = valor.replace(/\./g, "");
            valor = valor.replace(",", ".");
        }
    }

    // 333.333 → 333333
    else if (/^\d{1,3}(\.\d{3})+$/.test(valor)) {
        valor = valor.replace(/\./g, "");
    }

    // 333,33 → 333.33
    else if (valor.indexOf(",") > -1) {
        valor = valor.replace(",", ".");
    }

    valor = valor.replace(/[^0-9\.\-]/g, "");

    return valor;
}

// --------------------------------------------------------------------------------
// Limpieza de fechas
// --------------------------------------------------------------------------------
function limpiarFecha(valor)
{
    valor = limpiarTexto(valor);

    var partes = valor.split("/");

    if (partes.length === 3) {
        return parseInt(partes[0]) + "/" +
               parseInt(partes[1]) + "/" +
               partes[2];
    }

    return valor;
}

// --------------------------------------------------------------------------------
// Mensaje para error de columnas
// --------------------------------------------------------------------------------
function mensajeErrorColumnas(ficheroNombre, numeroLinea, columnasEsperadas, columnasEncontradas)
{
    return "Error al importar el archivo " + ficheroNombre + ".\n\n" +
           "La línea " + numeroLinea + " tiene una cantidad incorrecta de columnas.\n\n" +
           "Columnas esperadas: " + columnasEsperadas + "\n" +
           "Columnas encontradas: " + columnasEncontradas + "\n\n" +
           "Esto suele pasar cuando algún dato del CSV contiene el carácter punto y coma (;).\n\n" +
           "Por favor, revise el archivo CSV y reemplace ese ; dentro del texto por otro carácter, por ejemplo coma (,), guion (-) o espacio.";
}

// --------------------------------------------------------------------------------
// Detecta si el archivo debe ignorarse
// --------------------------------------------------------------------------------
function archivoDebeIgnorarse(nombreArchivo)
{
    if (!nombreArchivo || nombreArchivo === "") return true;

    nombreArchivo = nombreArchivo.toString().trim();

    // Archivos ocultos de Mac / sistema
    if (nombreArchivo.indexOf(".") === 0) return true;
    if (nombreArchivo.indexOf("._") === 0) return true;

    // Solo CSV
    if (nombreArchivo.toUpperCase().lastIndexOf(".CSV") !== nombreArchivo.length - 4) {
        return true;
    }

    return false;
}

// --------------------------------------------------------------------------------
// Obtiene nombre de tabla desde archivo CSV
// STOCK.csv → STOCK
// --------------------------------------------------------------------------------
function obtenerNombreTablaDesdeArchivo(nombreArchivo)
{
    nombreArchivo = nombreArchivo.toString().trim();

    var punto = nombreArchivo.lastIndexOf(".");

    if (punto > -1) {
        nombreArchivo = nombreArchivo.substring(0, punto);
    }

    return nombreArchivo.toUpperCase().trim();
}

// --------------------------------------------------------------------------------
// Detecta si una cadena de bytes (leída como ISO-8859-1) es UTF-8 válido.
// Devuelve true solo si hay al menos una secuencia multibyte correcta.
// --------------------------------------------------------------------------------
function pareceUTF8(str)
{
    var i = 0;
    var len = str.length;
    var tieneMultibyte = false;

    while (i < len) {
        var c = str.charCodeAt(i);

        if (c < 0x80) {
            i++;                                  // ASCII
        } else if (c >= 0xC2 && c <= 0xDF) {      // secuencia de 2 bytes
            if (i + 1 >= len) return false;
            if ((str.charCodeAt(i + 1) & 0xC0) !== 0x80) return false;
            tieneMultibyte = true;
            i += 2;
        } else if (c >= 0xE0 && c <= 0xEF) {      // secuencia de 3 bytes
            if (i + 2 >= len) return false;
            if ((str.charCodeAt(i + 1) & 0xC0) !== 0x80) return false;
            if ((str.charCodeAt(i + 2) & 0xC0) !== 0x80) return false;
            tieneMultibyte = true;
            i += 3;
        } else if (c >= 0xF0 && c <= 0xF4) {      // secuencia de 4 bytes
            if (i + 3 >= len) return false;
            if ((str.charCodeAt(i + 1) & 0xC0) !== 0x80) return false;
            if ((str.charCodeAt(i + 2) & 0xC0) !== 0x80) return false;
            if ((str.charCodeAt(i + 3) & 0xC0) !== 0x80) return false;
            tieneMultibyte = true;
            i += 4;
        } else {
            return false;                         // byte inválido en UTF-8
        }
    }

    return tieneMultibyte;
}

// --------------------------------------------------------------------------------
// Decodifica una cadena de bytes (leída como ISO-8859-1) interpretándola como UTF-8
// --------------------------------------------------------------------------------
function decodeUtf8(str)
{
    var out = "";
    var i = 0;
    var len = str.length;

    while (i < len) {
        var c = str.charCodeAt(i);

        if (c < 0x80) {
            out += String.fromCharCode(c);
            i++;
        } else if (c >= 0xC0 && c < 0xE0 && i + 1 < len) {
            var c2 = str.charCodeAt(i + 1);
            out += String.fromCharCode(((c & 0x1F) << 6) | (c2 & 0x3F));
            i += 2;
        } else if (c >= 0xE0 && c < 0xF0 && i + 2 < len) {
            var c2 = str.charCodeAt(i + 1);
            var c3 = str.charCodeAt(i + 2);
            out += String.fromCharCode(((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F));
            i += 3;
        } else {
            out += String.fromCharCode(c);
            i++;
        }
    }

    return out;
}

// --------------------------------------------------------------------------------
// Normaliza una línea leída como ISO-8859-1:
//  - Quita el BOM de UTF-8 si está presente
//  - Si los bytes son UTF-8 válido, los decodifica; si no, los deja como Latin1
// Así funciona tanto con CSV en UTF-8 como en ANSI (Windows-1252).
// --------------------------------------------------------------------------------
function normalizarLinea(linea)
{
    if (linea === null || linea === undefined) return linea;

    var s = linea.toString();

    // BOM UTF-8 (EF BB BF) leído como Latin1
    if (s.length >= 3 &&
        s.charCodeAt(0) === 0xEF &&
        s.charCodeAt(1) === 0xBB &&
        s.charCodeAt(2) === 0xBF) {
        s = s.substring(3);
    }

    if (pareceUTF8(s)) {
        s = decodeUtf8(s);
    }

    return s;
}

// --------------------------------------------------------------------------------
// Inicio
// --------------------------------------------------------------------------------
var dir = new VDir();
var senda = theRoot.varToString("SENDA");

dir.cd(senda);
dir.load();

if (dir.count() == 0) {
    theRoot.setVar("MENSAJE", "No se han encontrado ficheros a importar en " + senda);
}

var numFicherosImportados = 0;
var huboError = false;
var mensajeError = "";

for (var numFichero = 0; numFichero < dir.count(); numFichero++) {

    if (huboError) break;

    var fichero = dir.entryAt(numFichero);

    var nombreArchivo = fichero.fileName().toString().trim();

    // Ignorar archivos ocultos / no CSV
    if (archivoDebeIgnorarse(nombreArchivo)) {
        continue;
    }

    var ficheroNombre = obtenerNombreTablaDesdeArchivo(nombreArchivo);

    if (!ficheroNombre || ficheroNombre === "") {
        huboError = true;
        mensajeError =
            "No se pudo obtener el nombre de tabla desde el archivo.\n\n" +
            "Archivo detectado: " + nombreArchivo + "\n" +
            "Ruta: " + fichero.filePath();
        break;
    }

    var ficheroIdRef = tablaIdRef(ficheroNombre);

    if (ficheroIdRef === null) {
        huboError = true;
        mensajeError =
            "No se encontró una tabla con id: " + ficheroNombre + "\n\n" +
            "Archivo detectado: " + nombreArchivo + "\n" +
            "Ruta: " + fichero.filePath() + "\n\n" +
            "Verifique que el archivo CSV tenga el mismo nombre que la tabla.";
        break;
    }

    var separador = (theRoot.varToString("SEPARADOR") != null)
        ? theRoot.varToString("SEPARADOR")
        : ";";

    var bTransCurso = theRoot.existTrans();
    var bTransNueva = "";

    if (!bTransCurso) {
        bTransNueva = theRoot.beginTrans("Importando: " + nombreArchivo);
    }

    if (bTransCurso || bTransNueva) {

        var ficheroTxt = new VTextFile(fichero.filePath());
        ficheroTxt.setCodec("ISO-8859-1");

        if (ficheroTxt.open(VFile.OpenModeReadOnly)) {

            var linea = normalizarLinea(ficheroTxt.readLine());

            if (!linea || linea.trim() === "") {
                huboError = true;
                mensajeError =
                    "El archivo " + nombreArchivo + " está vacío o no tiene cabecera.";
            } else {

                var aCampos = linea.split(separador);
                var columnasEsperadas = aCampos.length;

                var nNumRegistro = 0;
                var numeroLinea = 1;

                var tipos           = obtenerCamposPorTipo(ficheroIdRef);
                var camposNumericos = tipos.numericos;
                var camposFecha     = tipos.fechas;

                theRoot.initProgressBar();
                theRoot.setProgress(100);

                while (!ficheroTxt.atEnd()) {

                    linea = normalizarLinea(ficheroTxt.readLine());
                    numeroLinea++;

                    if (!linea || linea.trim() === "") {
                        continue;
                    }

                    var aValores = linea.split(separador);

                    if (aValores.length !== columnasEsperadas) {

                        huboError = true;

                        mensajeError = mensajeErrorColumnas(
                            ficheroNombre,
                            numeroLinea,
                            columnasEsperadas,
                            aValores.length
                        );

                        break;
                    }

                    var registro = new VRegister(theRoot);
                    registro.setTable(ficheroIdRef);

                    for (var nCampo = 0; nCampo < aCampos.length; nCampo++) {

                        var nombreCampo = aCampos[nCampo];
                        var campo = nombreCampo.trim().toUpperCase();

                        var valor = "";

                        if (aValores[nCampo] !== undefined) {
                            valor = aValores[nCampo];
                        }

                        if (camposNumericos.includes(campo)) {
                            valor = limpiarNumero(valor);
                        }
                        else if (camposFecha.includes(campo)) {
                            valor = limpiarFecha(valor);
                        }
                        else {
                            valor = limpiarTexto(valor);

                            if (
                                campo === "CIF" ||
                                campo === "TLF" ||
                                campo === "CUIT" ||
                                campo === "CUIL" ||
                                campo === "DNI" ||
                                campo === "TELEFONO" ||
                                campo === "CELULAR"
                            ) {
                                valor = limpiarSoloNumeros(valor);
                            }
                        }

                        registro.setField(nombreCampo, valor);
                    }

                    registro.addRegister();

                    nNumRegistro++;

                    theRoot.setTitle(
                        "Importando registro nº " +
                        nNumRegistro +
                        " de la tabla " +
                        ficheroNombre
                    );
                }

                theRoot.endProgressBar();
            }

            ficheroTxt.close();
        } else {
            huboError = true;
            mensajeError =
                "No se pudo abrir el archivo CSV.\n\n" +
                "Archivo: " + nombreArchivo + "\n" +
                "Ruta: " + fichero.filePath();
        }

        if (huboError) {
            if (bTransNueva) {
                theRoot.rollbackTrans();
            }
            break;
        } else {
            if (bTransNueva) {
                theRoot.commitTrans();
            }

            numFicherosImportados++;
        }
    }
}

if (huboError) {
    theRoot.setVar("MENSAJE", mensajeError);
} else {
    theRoot.setVar(
        "MENSAJE",
        "Se han importado correctamente " +
        numFicherosImportados +
        " ficheros."
    );
}