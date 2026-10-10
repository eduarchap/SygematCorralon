/* ===========================================================================
 * generarPlantillaAltaArt.js
 *
 * Genera una plantilla VACÍA (solo cabeceras) para dar de alta artículos de un
 * proveedor. Columnas:
 *
 *   [oculta]  ID proveedor         -> el ID va EN EL ENCABEZADO (variable ID_PRV)
 *             SKU Propio           (plana)
 *             Descripcion          (plana)
 *             Categoria            (combo, maestra FAM_M)
 *             Marca                (combo, maestra MAR_M)
 *             SKU proveedor        (plana)
 *             Unidad de inventario (combo, maestra UND_MED_M)
 *             Costo base           (plana)
 *             [dinámicas] Bonificaciones -> 1 col por registro de BON_M del
 *                          proveedor (índice ENT_M = [ID_PRV]); cabecera "ID - NAME"
 *   [oculta]  FIN_BONIFICACIONES   -> marcador de fin de bonificaciones (texto fijo)
 *             [dinámicas] Rentabilidad por lista -> 1 col por registro de
 *                          VTA_TAR_G (índice ID sin resolver = todas); cabecera "ID - NAME"
 *
 * Los desplegables (Categoria/Marca/Unidad) se ofrecen hasta la fila
 * FILAS_PLANTILLA+1 para que el usuario tenga filas listas para rellenar.
 *
 * Arquitectura (idéntica a generarPlantillaConCombos): SheetJS arma el workbook
 * -> se descomprime el zip (lector propio) -> se inyectan <cols> (ocultar) y
 * <dataValidations> respetando el orden OOXML -> se recomprime. Se evitan las
 * rutas "latin1" de fflate (fallan en el motor Qt5 embebido).
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   ID_PRV  {string}  ID del proveedor (va en el encabezado de la col. oculta y
 *                     filtra las bonificaciones de BON_M).
 *
 * Variables de salida:
 *   OK, MSJ, SND
 *
 * Dependencias (deben incluirse antes):
 *   xlsx.full.min.js, fflate.js, excel_utils.js, fichero_utils.js, log_utils.js
 * =========================================================================== */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/fflate/fflate.js"
#include "(CurrentProject)/excel/excel_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"

/* --------------------------- Configuración -------------------------------- */

var PROY_DAT = "sygemat_corralon_dat";

var HOJA_DATOS  = "Datos";
var HOJA_LISTAS = "Listas";

// Filas de margen para que el usuario rellene (desplegables hasta esta fila+1).
var FILAS_PLANTILLA = 300;

// Texto fijo del marcador de fin de bonificaciones.
var MARCA_FIN_BONIF = "FIN_BONIFICACIONES";

/* ----------------------------- Utilidades --------------------------------- */

/** Número de columna 1-based -> letra de Excel (1->A, 27->AA). */
function columnaLetra(n) {
	var s = "";
	while (n > 0) {
		var resto = (n - 1) % 26;
		s = String.fromCharCode(65 + resto) + s;
		n = Math.floor((n - 1) / 26);
	}
	return s;
}

/* ----------------------- Conversión bytes <-> string ---------------------- */

function binStrAU8(s) {
	var u = new Uint8Array(s.length);
	for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xFF;
	return u;
}

function u8ABinStr(u8) {
	var CHUNK = 8192, s = "";
	for (var i = 0; i < u8.length; i += CHUNK) {
		var fin = Math.min(i + CHUNK, u8.length);
		var arr = [];
		for (var j = i; j < fin; j++) arr.push(u8[j]);
		s += String.fromCharCode.apply(null, arr);
	}
	return s;
}

function leerU16(u8, p) { return (u8[p] | (u8[p + 1] << 8)) >>> 0; }
function leerU32(u8, p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0; }

function leerNombre(u8, p, len) {
	var s = "";
	for (var i = 0; i < len; i++) s += String.fromCharCode(u8[p + i]);
	return s;
}

/* --------------------------- Lectura del ZIP ------------------------------ */
function descomprimirZip(u8) {
	var n = u8.length;

	var i = n - 22;
	while (i >= 0 && leerU32(u8, i) !== 0x06054b50) i--;
	if (i < 0) throw new Error("ZIP inválido: no se encontró EOCD");

	var numEntradas = leerU16(u8, i + 10);
	var offsetCD    = leerU32(u8, i + 16);

	var ficheros = {};
	var p = offsetCD;

	for (var e = 0; e < numEntradas; e++) {
		if (leerU32(u8, p) !== 0x02014b50) throw new Error("ZIP inválido: cabecera CD en " + p);

		var metodo     = leerU16(u8, p + 10);
		var compSize   = leerU32(u8, p + 20);
		var uncompSize = leerU32(u8, p + 24);
		var nameLen    = leerU16(u8, p + 28);
		var extraLen   = leerU16(u8, p + 30);
		var commentLen = leerU16(u8, p + 32);
		var localOff   = leerU32(u8, p + 42);
		var nombre     = leerNombre(u8, p + 46, nameLen);

		var lhNameLen  = leerU16(u8, localOff + 26);
		var lhExtraLen = leerU16(u8, localOff + 28);
		var inicioDato = localOff + 30 + lhNameLen + lhExtraLen;

		var comp = u8.subarray(inicioDato, inicioDato + compSize);
		var dato = (metodo === 0)
			? new Uint8Array(comp)
			: fflate.inflateSync(comp, { out: new Uint8Array(uncompSize) });

		ficheros[nombre] = dato;
		p += 46 + nameLen + extraLen + commentLen;
	}

	return ficheros;
}

function nombresClaves(files) {
	var arr = [];
	for (var key in files) { if (files.hasOwnProperty(key)) arr.push(key); }
	return arr.join(", ");
}

/**
 * Carga TODOS los registros de una tabla maestra para un desplegable:
 *   { valores: ["cod - nom", ...] (ordenado), mapa: { cod: "cod - nom" } }
 */
function cargarMaestro(def) {
	var resultado = { valores: [], mapa: {} };

	var lista = new VRegisterList(theRoot);
	lista.setTable(def.tabla);

	if (!lista.load(def.indice, [])) {
		logError("No se pudo cargar la maestra " + def.tabla + " (índice " + def.indice + ")");
		return resultado;
	}

	for (var i = 0; i < lista.size(); i++) {
		var reg     = lista.readAt(i);
		var codigo  = reg.fieldToString(def.campoCod);
		var nombre  = reg.fieldToString(def.campoNom);
		var display = (nombre !== "" && nombre != null) ? (codigo + " - " + nombre) : codigo;

		resultado.valores.push(display);
		resultado.mapa[codigo] = display;
	}

	resultado.valores.sort();
	return resultado;
}

/**
 * Carga registros de una tabla y devuelve [{ id, nombre }] para construir
 * cabeceras dinámicas. `clave` es el array de partes del índice ([] = todas).
 */
function cargarRegistros(tabla, indice, clave, campoId, campoNom) {
	var out = [];

	var lista = new VRegisterList(theRoot);
	lista.setTable(tabla);

	if (!lista.load(indice, clave)) {
		logError("No se pudo cargar " + tabla + " (índice " + indice + ")");
		return out;
	}

	for (var i = 0; i < lista.size(); i++) {
		var reg = lista.readAt(i);
		out.push({
			id:     reg.fieldToString(campoId),
			nombre: reg.fieldToString(campoNom)
		});
	}
	return out;
}

/* ------------------------------ Proceso ----------------------------------- */

var idPrv = theRoot.varToString("ID_PRV");
var ruta  = theApp.tempPath() + "/AltaArticulos.xlsx";

if (idPrv === "" || idPrv == null) {
	logError("No se recibió ID_PRV; las bonificaciones saldrán vacías.");
}

/* 1) Definir columnas ------------------------------------------------------ */
//    Cada columna: { cabecera, tipo:"plano"|"combo", oculta?, (combo: tabla/indice/campoCod/campoNom) }
var columnas = [];

// Col oculta con el ID del proveedor EN EL ENCABEZADO.
columnas.push({ cabecera: idPrv, tipo: "plano", oculta: true });

// Fijas.
columnas.push({ cabecera: "SKU Propio",   tipo: "plano" });
columnas.push({ cabecera: "Descripcion",  tipo: "plano" });
columnas.push({ cabecera: "Categoria",    tipo: "combo", tabla: PROY_DAT + "/FAM_M",     indice: "ID", campoCod: "ID", campoNom: "NAME" });
columnas.push({ cabecera: "Marca",        tipo: "combo", tabla: PROY_DAT + "/MAR_M",     indice: "ID", campoCod: "ID", campoNom: "NAME" });
columnas.push({ cabecera: "SKU proveedor", tipo: "plano" });
columnas.push({ cabecera: "Unidad de inventario", tipo: "combo", tabla: PROY_DAT + "/UND_MED_M", indice: "ID", campoCod: "ID", campoNom: "NAME" });
columnas.push({ cabecera: "Costo base",   tipo: "plano" });

// Dinámicas: bonificaciones del proveedor (BON_M por índice ENT_M = [ID_PRV]).
var bonificaciones = cargarRegistros(PROY_DAT + "/BON_M", "ENT_M", [idPrv], "ID", "DSC");
for (var b = 0; b < bonificaciones.length; b++) {
	columnas.push({ cabecera: bonificaciones[b].id + " - " + bonificaciones[b].nombre, tipo: "plano" });
}

// Marcador oculto de fin de bonificaciones (texto fijo).
columnas.push({ cabecera: MARCA_FIN_BONIF, tipo: "plano", oculta: true });

// Dinámicas: rentabilidad por lista de precios (VTA_TAR_G, índice ID sin resolver = todas).
var tarifas = cargarRegistros(PROY_DAT + "/VTA_TAR_G", "ID", [], "ID", "NAME");
for (var t = 0; t < tarifas.length; t++) {
	columnas.push({ cabecera: tarifas[t].id + " - " + tarifas[t].nombre, tipo: "plano" });
}

/* 2) Cargar maestras de los combos ---------------------------------------- */
var combos = [];   // { col, datos, idxLista, idxColData }
for (var c = 0; c < columnas.length; c++) {
	if (columnas[c].tipo === "combo") {
		combos.push({
			col:        columnas[c],
			datos:      cargarMaestro(columnas[c]),
			idxLista:   combos.length,
			idxColData: c
		});
	}
}

/* 3) Hoja "Datos": solo la fila de cabeceras (plantilla vacía) ------------- */
var cabec = [];
for (var c = 0; c < columnas.length; c++) cabec.push(columnas[c].cabecera);
var filas = [cabec];

/* 4) Hoja "Listas": una columna por combo --------------------------------- */
var maxLen = 1;
for (var k = 0; k < combos.length; k++) {
	if (combos[k].datos.valores.length > maxLen) maxLen = combos[k].datos.valores.length;
}
var filasListas = [];
for (var r = 0; r < maxLen; r++) {
	var filaL = [];
	for (var k = 0; k < combos.length; k++) {
		var vals = combos[k].datos.valores;
		filaL.push(r < vals.length ? vals[r] : null);
	}
	filasListas.push(filaL);
}
if (filasListas.length === 0) filasListas.push([null]);

/* 5) Montar el workbook ---------------------------------------------------- */
var wb  = XLSX.utils.book_new();
var wsD = XLSX.utils.aoa_to_sheet(filas);
var wsL = XLSX.utils.aoa_to_sheet(filasListas);

wb.Props = {
	Title:   "Plantilla alta de artículos",
	Subject: "Rellena una fila por artículo. No modifiques las cabeceras.",
	Author:  "Sygemat"
};

XLSX.utils.book_append_sheet(wb, wsD, HOJA_DATOS);
XLSX.utils.book_append_sheet(wb, wsL, HOJA_LISTAS);

wb.Workbook = wb.Workbook || {};
wb.Workbook.Sheets = [ { Hidden: 0 }, { Hidden: 1 } ];

var nombres = [];
for (var k = 0; k < combos.length; k++) {
	var n = combos[k].datos.valores.length;
	if (n < 1) n = 1;
	var letra = columnaLetra(combos[k].idxLista + 1);
	combos[k].nombreRango = "LISTA_" + (combos[k].idxLista + 1);   // nombre único y válido
	nombres.push({
		Name: combos[k].nombreRango,
		Ref:  "'" + HOJA_LISTAS + "'!$" + letra + "$1:$" + letra + "$" + n
	});
}
wb.Workbook.Names = nombres;

/* 6) Serializar y descomprimir -------------------------------------------- */
var wbBin = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
var files = descomprimirZip(binStrAU8(wbBin));

/* 7) Inyectar <cols> (ocultar) + <dataValidations> ------------------------ */
var primeraFila = 2;
var ultimaFila  = FILAS_PLANTILLA + 1;   // fila 2 .. 301

// Validaciones (una por combo), sobre el rango de filas de la plantilla.
var validaciones = "";
for (var k = 0; k < combos.length; k++) {
	var letraCol = columnaLetra(combos[k].idxColData + 1);
	var sqref    = letraCol + primeraFila + ":" + letraCol + ultimaFila;
	validaciones +=
		'<dataValidation type="list" allowBlank="1" showInputMessage="1" ' +
		'showErrorMessage="1" sqref="' + sqref + '">' +
			"<formula1>" + combos[k].nombreRango + "</formula1>" +
		"</dataValidation>";
}

// Columnas ocultas (tamaño 0).
var colsXml = "";
for (var c = 0; c < columnas.length; c++) {
	if (columnas[c].oculta) {
		var num = c + 1;
		colsXml += '<col min="' + num + '" max="' + num + '" width="8" customWidth="1" hidden="1"/>';
	}
}
if (colsXml !== "") colsXml = "<cols>" + colsXml + "</cols>";

var claveHoja = "xl/worksheets/sheet1.xml";
if (!files[claveHoja]) {
	logError("No se encontró " + claveHoja + ". Hojas en el zip: " + nombresClaves(files));
}

if (files[claveHoja]) {
	var sheetXml = fflate.strFromU8(files[claveHoja]);

	// Orden OOXML: <cols> antes de <sheetData>; <dataValidations> antes de
	// hyperlinks/pageMargins/ignoredErrors/etc.
	if (colsXml !== "") {
		sheetXml = sheetXml.replace("<sheetData>", colsXml + "<sheetData>");
	}

	if (validaciones !== "") {
		var dv = '<dataValidations count="' + combos.length + '">' + validaciones + "</dataValidations>";
		var anclas = [
			"<hyperlinks", "<printOptions", "<pageMargins", "<pageSetup",
			"<headerFooter", "<rowBreaks", "<colBreaks", "<customProperties",
			"<cellWatches", "<ignoredErrors", "<smartTags", "<drawing",
			"<legacyDrawing", "<picture", "<tableParts", "<extLst", "</worksheet>"
		];
		var pos = -1;
		for (var a = 0; a < anclas.length; a++) {
			var idx = sheetXml.indexOf(anclas[a]);
			if (idx !== -1 && (pos === -1 || idx < pos)) pos = idx;
		}
		sheetXml = sheetXml.slice(0, pos) + dv + sheetXml.slice(pos);
	}

	files[claveHoja] = fflate.strToU8(sheetXml);
}

/* 8) Recomprimir y escribir a disco --------------------------------------- */
var bytes  = fflate.zipSync(files);
var binStr = u8ABinStr(bytes);

if (escribirBinarioEnFichero(ruta, binStr)) {
	theRoot.setVar("OK", true);
	theRoot.setVar("MSJ", "Plantilla generada: " + ruta +
		"  (bonificaciones=" + bonificaciones.length + ", tarifas=" + tarifas.length + ")");
	theRoot.setVar("SND", ruta);
} else {
	theRoot.setVar("OK", false);
	theRoot.setVar("MSJ", _log_lineas.join("\n"));
}

mostrarLog();
