/* ===========================================================================
 * generarPlantillaAuxC.js
 *
 * Genera una plantilla .xlsx con los registros EXISTENTES de la tabla AUX_C
 * para que el usuario la rellene/modifique y la vuelva a importar.
 *
 * Columnas (fijas):
 *   ID    -> clave del registro (plana, se usa para emparejar al reimportar).
 *   NAME  -> descripción (plana).
 *   PGC   -> puntero a maestro PGC_C: se muestra como LISTA DESPLEGABLE con los
 *            valores existentes en PGC_C ("código - nombre").
 *
 * Arquitectura (idéntica a generarPlantillaConCombos.js):
 *   SheetJS arma el workbook -> se DESCOMPRIME el zip (lector propio) -> se
 *   inyecta <dataValidations> a mano en el XML de la hoja -> se RECOMPRIME.
 *   Se evitan las rutas "latin1" de fflate (String.fromCharCode.apply sobre
 *   typed arrays falla en el motor Qt5 embebido).
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   SND  {string}  Carpeta destino donde se escribe el fichero.
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

var TABLA_AUX  = PROY_DAT + "/AUX_C";   // tabla origen
var INDICE_AUX = "ID";                  // índice para cargar TODOS los registros

var HOJA_DATOS  = "Datos";
var HOJA_LISTAS = "Listas";

var NOMBRE_FICHERO = "PlantillaAuxC.xlsx";

// Fila mínima hasta la que el desplegable de los combos debe estar disponible,
// aunque se hayan exportado menos registros (para poder añadir filas nuevas).
var FILAS_MIN_COMBO = 300;

// Proteger la hoja (columnas visibles editables, columnas ocultas bloqueadas).
// Desactivado: la hoja queda libre para trabajar. PGC_ORIG sigue OCULTA (para
// no estorbar), pero editable. Ponlo a true si quieres blindar PGC_ORIG.
var PROTEGER_HOJA = false;

// Ancho de las columnas visibles. Un <col> con estilo pero SIN width lo
// interpreta Excel como ancho 0 (columna invisible), por eso se fija aquí.
var ANCHO_COLUMNA = 22;

/* Columnas de salida. La columna PGC es "combo": desplegable con los valores
 * de PGC_C. campoCod/campoNom son los campos de la maestra a mostrar como
 * "código - nombre" (igual que las categorías/marcas de la plantilla de
 * artículos).
 *
 * PGC_ORIG es una columna OCULTA y bloqueada: guarda el código de PGC ORIGINAL
 * del registro. Al reimportar se localiza por [PGC_ORIG, ID], de modo que si el
 * usuario cambia el PGC en el desplegable el registro se MODIFICA (no se
 * duplica). Para filas nuevas PGC_ORIG queda vacío -> se tratará como alta. */
var COLUMNAS = [
	{ cabecera: "ID",       campoArt: "ID",   tipo: "plano" },
	{ cabecera: "NAME",     campoArt: "NAME", tipo: "plano" },
	{ cabecera: "PGC",      campoArt: "PGC",  tipo: "combo",
	  tabla: PROY_DAT + "/PGC_C", indice: "ID", campoCod: "ID", campoNom: "NAME" },
	{ cabecera: "PGC_ORIG", campoArt: "PGC",  tipo: "plano", oculta: true }
];

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

/* ----------------------- Conversión bytes <-> string ----------------------
 * En el motor Qt5, String.fromCharCode.apply(null, typedArray) devuelve ceros.
 * fflate usa ese patrón en sus rutas "latin1" (nombres de fichero del ZIP y
 * strFromU8(_, true)), así que NO las usamos. Conversión segura: charCodeAt
 * byte a byte, y apply SOLO sobre Arrays normales. */

/** Cadena binaria (1 char = 1 byte) -> Uint8Array. */
function binStrAU8(s) {
	var u = new Uint8Array(s.length);
	for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xFF;
	return u;
}

/** Uint8Array -> cadena binaria (1 byte = 1 char). Chunked sobre Array normal. */
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

/** Nombre de fichero del ZIP (ASCII) byte a byte, sin apply. */
function leerNombre(u8, p, len) {
	var s = "";
	for (var i = 0; i < len; i++) s += String.fromCharCode(u8[p + i]);
	return s;
}

/* --------------------------- Lectura del ZIP -------------------------------
 * Lector propio que recorre la Central Directory para obtener los nombres
 * CORRECTOS (fflate.unzipSync los corrompe en este motor). El contenido se
 * descomprime con fflate.inflateSync (seguro, solo bytes). */
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

/**
 * Añade a styles.xml un formato (xf) con la celda DESBLOQUEADA
 * (<protection locked="0"/>) y devuelve su índice dentro de <cellXfs>.
 * Se usa como estilo de columna para dejar editables las columnas visibles
 * cuando la hoja está protegida.
 */
function agregarEstiloDesbloqueado(files) {
	var st = fflate.strFromU8(files["xl/styles.xml"]);
	var indice = -1;

	st = st.replace(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/, function (m, cnt, body) {
		var n = parseInt(cnt, 10);
		indice = n; // el nuevo xf se añade al final -> su índice es el count actual
		var xf = '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" ' +
		         'applyProtection="1"><protection locked="0"/></xf>';
		return '<cellXfs count="' + (n + 1) + '">' + body + xf + '</cellXfs>';
	});

	if (indice === -1) {
		logError("No se pudo insertar el estilo desbloqueado en styles.xml");
		return -1;
	}

	files["xl/styles.xml"] = fflate.strToU8(st);
	return indice;
}

/** Nombres de fichero del objeto zip (diagnóstico). */
function nombresClaves(files) {
	var arr = [];
	for (var key in files) { if (files.hasOwnProperty(key)) arr.push(key); }
	return arr.join(", ");
}

/**
 * Carga TODOS los registros de una tabla maestra y devuelve:
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
	log("Maestra " + def.tabla + ": " + resultado.valores.length + " valores");
	return resultado;
}

/* ------------------------------- Proceso ---------------------------------- */

var senda = theRoot.varToString("SND");
var ruta  = theApp.tempPath() + "/" + NOMBRE_FICHERO;

// 0) Cargar los registros existentes de AUX_C.
var listaAux = new VRegisterList(theRoot);
listaAux.setTable(TABLA_AUX);

if (!listaAux.load(INDICE_AUX, [])) {
	alert("No se pudieron cargar los registros de " + TABLA_AUX);
} else {

	/* 1) Cargar las maestras de las columnas combo --------------------------- */
	var combos = [];   // { col, datos, idxLista, idxColData }
	for (var c = 0; c < COLUMNAS.length; c++) {
		if (COLUMNAS[c].tipo === "combo") {
			combos.push({
				col:        COLUMNAS[c],
				datos:      cargarMaestro(COLUMNAS[c]),
				idxLista:   combos.length,
				idxColData: c
			});
		}
	}

	/* 2) Construir las filas de la hoja "Datos" ------------------------------ */
	var filas = [];
	var cabec = [];
	for (var c = 0; c < COLUMNAS.length; c++) cabec.push(COLUMNAS[c].cabecera);
	filas.push(cabec);

	for (var i = 0; i < listaAux.size(); i++) {
		var reg  = listaAux.readAt(i);
		var fila = [];

		for (var c = 0; c < COLUMNAS.length; c++) {
			var def = COLUMNAS[c];

			if (def.tipo === "combo") {
				var cod   = reg.fieldToString(def.campoArt);
				var combo = null;
				for (var k = 0; k < combos.length; k++) {
					if (combos[k].idxColData === c) { combo = combos[k]; break; }
				}
				var display = (combo && combo.datos.mapa[cod] != null) ? combo.datos.mapa[cod] : cod;
				fila.push(display);
			} else {
				fila.push(reg.fieldToString(def.campoArt));
			}
		}
		filas.push(fila);
	}

	/* 3) Construir la hoja "Listas" (una columna por combo) ------------------ */
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

	/* 4) Montar el workbook -------------------------------------------------- */
	var wb  = XLSX.utils.book_new();
	var wsD = XLSX.utils.aoa_to_sheet(filas);
	var wsL = XLSX.utils.aoa_to_sheet(filasListas);

	wb.Props = {
		Title:   "Plantilla AUX_C",
		Subject: "Selecciona el PGC en el desplegable. No modifiques la columna ID.",
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
		combos[k].nombreRango = "LISTA_" + combos[k].col.campoArt;
		nombres.push({
			Name: combos[k].nombreRango,
			Ref:  "'" + HOJA_LISTAS + "'!$" + letra + "$1:$" + letra + "$" + n
		});
	}
	wb.Workbook.Names = nombres;

	/* 5) Serializar y descomprimir ------------------------------------------ */
	var wbBin = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
	var files = descomprimirZip(binStrAU8(wbBin));

	/* 6) Inyectar <dataValidations> en la hoja "Datos" (sheet1.xml) --------- */
	var numFilasDatos = listaAux.size();
	var primeraFila   = 2;
	// El desplegable llega al menos hasta FILAS_MIN_COMBO, aunque haya menos
	// registros, para que las filas nuevas también tengan combo.
	var ultimaFila    = Math.max(numFilasDatos + 1, FILAS_MIN_COMBO);

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

	// Columnas ocultas (oculta:true) y decisión de protección.
	var colsOcultas = [];   // números de columna 1-based
	for (var c = 0; c < COLUMNAS.length; c++) {
		if (COLUMNAS[c].oculta) colsOcultas.push(c + 1);
	}
	var proteger = PROTEGER_HOJA && colsOcultas.length > 0;

	// Estilo "desbloqueado" para las columnas visibles (solo si protegemos).
	var idxDesbloq = proteger ? agregarEstiloDesbloqueado(files) : -1;

	// <cols>: ocultas -> hidden (bloqueadas por defecto); visibles -> estilo
	// desbloqueado cuando protegemos (si no, no hace falta tocarlas).
	var colsXml = "";
	for (var c = 0; c < COLUMNAS.length; c++) {
		var num = c + 1;
		if (COLUMNAS[c].oculta) {
			colsXml += '<col min="' + num + '" max="' + num + '" width="' + ANCHO_COLUMNA +
			           '" customWidth="1" hidden="1"/>';
		} else if (proteger && idxDesbloq >= 0) {
			// width + customWidth OBLIGATORIOS: un <col> con style pero sin width
			// se renderiza con ancho 0 (columna invisible).
			colsXml += '<col min="' + num + '" max="' + num + '" width="' + ANCHO_COLUMNA +
			           '" customWidth="1" style="' + idxDesbloq + '"/>';
		}
	}
	if (colsXml !== "") colsXml = "<cols>" + colsXml + "</cols>";

	var protXml = (proteger && idxDesbloq >= 0)
		? '<sheetProtection sheet="1" objects="1" scenarios="1" ' +
		  'selectLockedCells="1" selectUnlockedCells="1"/>'
		: "";

	var claveHoja = "xl/worksheets/sheet1.xml";
	if (!files[claveHoja]) {
		logError("No se encontró " + claveHoja + ". Hojas en el zip: " + nombresClaves(files));
	}

	if (files[claveHoja]) {
		var sheetXml = fflate.strFromU8(files[claveHoja]);

		// Orden OOXML (CT_Worksheet): ... cols, sheetData, sheetProtection, ...,
		// dataValidations, ..., ignoredErrors. Insertamos respetando ese orden.

		// 1) <cols> justo antes de <sheetData>.
		if (colsXml !== "") {
			sheetXml = sheetXml.replace("<sheetData>", colsXml + "<sheetData>");
		}

		// 2) <sheetProtection> justo después de </sheetData>.
		if (protXml !== "") {
			sheetXml = sheetXml.replace("</sheetData>", "</sheetData>" + protXml);
		}

		// 3) <dataValidations> antes del primer elemento que, según el esquema,
		//    sigue a dataValidations (hyperlinks/pageMargins/ignoredErrors/...).
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

	/* 7) Recomprimir y escribir a disco ------------------------------------- */
	var bytes  = fflate.zipSync(files);
	var binStr = u8ABinStr(bytes);

	if (escribirBinarioEnFichero(ruta, binStr)) {
		theRoot.setVar("SND", ruta);
		theRoot.setVar("OK", 1);
		log("Plantilla generada: " + ruta + "  (" + numFilasDatos + " registros)");
	} else {
		theRoot.setVar("OK", 0);
		logError("No se pudo escribir el fichero: " + ruta);
	}
}

mostrarLog();
