/* ===========================================================================
 * generarPlantillaConCombos.js
 *
 * Igual que generarPlantilla.js (exporta los artículos seleccionados en
 * ART_SEL a un .xlsx según las variables booleanas ACT_*), pero en las
 * columnas de Categoría, Marca, Línea, Proveedor y Unidad de medida escribe
 * una LISTA DESPLEGABLE (data validation) con los valores disponibles en la
 * tabla maestra correspondiente, en lugar del valor crudo.
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5). Sin DOM, sin Node.
 *
 * Por qué esta arquitectura (ver también script.js de ejemplo en la raíz):
 *   - SheetJS community NO escribe <dataValidations> (eso es Pro). Por eso el
 *     workbook se genera con SheetJS, se DESCOMPRIME el zip con fflate, se
 *     inyecta a mano el bloque <dataValidations> en el XML de la hoja, y se
 *     RECOMPRIME.
 *   - Con muchos valores la lista inline ("a,b,c,...") se descarta (tope
 *     ~255 chars). Por eso los valores se vuelcan a una hoja OCULTA ("Listas")
 *     y cada validación apunta a un NOMBRE DEFINIDO sobre su rango exacto.
 *   - Se usan fflate.strFromU8 / fflate.strToU8 (con fallback manual UTF-8
 *     interno) en lugar de TextDecoder/TextEncoder, que el motor Qt5 embebido
 *     puede no proveer.
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

// Proyecto de datos donde viven las tablas maestras. Ajustar si el alias del
// proyecto en este entorno no es exactamente "sygemat_corralon_dat".
var PROY_DAT = "sygemat_corralon_dat";

var HOJA_DATOS  = "Datos";    // hoja visible
var HOJA_LISTAS = "Listas";   // hoja oculta con los valores de los desplegables

/* Definición de cada columna de salida.
 *
 *   tipo "plano"  -> se escribe el valor crudo del artículo (como el original).
 *   tipo "combo"  -> se escribe el valor formateado "código - nombre" y se le
 *                    asocia un desplegable con todos los valores de su tabla.
 *   tipo "lookup" -> el valor NO está en el artículo: se busca en una tabla
 *                    relacionada por un índice de 2 claves construidas desde el
 *                    artículo (tabla, indice, campoRet, claveArt, clavePrv).
 *                    Ej.: SKU proveedor -> ART_PRV_G, índice ART_PRV = [ID, PRV].
 *
 * Para las columnas combo:
 *   tabla    : referencia "PROYECTO@TABLA" de la maestra.
 *   indice   : índice por el que se cargan TODOS los registros. "ID" existe
 *              siempre. Si la maestra tiene "ID_ON" (solo activos, !OFF) y se
 *              quieren excluir los desactivados, cambiar a "ID_ON".
 *   campoCod : campo código de la maestra (el que enlaza con el artículo).
 *   campoNom : campo descriptivo a mostrar junto al código.
 *
 * El array se filtra luego por las variables ACT_* (mismo orden que el
 * script original) para construir solo las columnas activas.
 */
var DEF_COLUMNAS = [
	{ varAct: "ACT_DSC", cabecera: "Nombre", campoArt: "NAME", tipo: "plano" },
	{ varAct: "ACT_CAT", cabecera: "Categoria", campoArt: "FAM", tipo: "combo", tabla: PROY_DAT + "/FAM_M", indice: "ID", campoCod: "ID", campoNom: "NAME" },
	{ varAct: "ACT_MAR", cabecera: "Marca", campoArt: "MAR_M", tipo: "combo", tabla: PROY_DAT + "/MAR_M", indice: "ID", campoCod: "ID", campoNom: "NAME" },
	{ varAct: "ACT_LIN", cabecera: "Linea", campoArt: "LIN_M", tipo: "combo", tabla: PROY_DAT + "/LIN_M", indice: "ID", campoCod: "ID", campoNom: "NAME" },
	{ varAct: "ACT_PRV", cabecera: "Proveedor", campoArt: "PRV", tipo: "combo", tabla: PROY_DAT + "/ENT_M", indice: "ID_ES_PRV", campoCod: "ID", campoNom: "NAME" },
	{ varAct: "ACT_SKU_PRV", cabecera: "SKU proveedor", tipo: "lookup", tabla: PROY_DAT + "/ART_PRV_G", indice: "ART_PRV", campoRet: "REF_PRV", claveArt: "ID", clavePrv: "PRV" },
	{ varAct: "ACT_COD_BAR_ART", cabecera: "Codigo Barra", campoArt: "COD_BAR", tipo: "plano" },
	{ varAct: "ACT_UND_MED", cabecera: "Unidad medida", campoArt: "UND_MED_INV", tipo: "combo", tabla: PROY_DAT + "/UND_MED_M", indice: "ID", campoCod: "ID", campoNom: "NAME" },
	{ varAct: "ACT_NO_RES_STK", cabecera: "No reserva stock", campoArt: "ASG_SIE", tipo: "plano" }
];

/* ----------------------------- Utilidades --------------------------------- */

/**
 * Convierte un número de columna 1-based a su letra de Excel (1->A, 27->AA).
 */
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
 * En el motor Qt5 embebido, String.fromCharCode.apply(null, typedArray) NO
 * expande el typed array (devuelve ceros). fflate usa ese patrón en sus rutas
 * "latin1" (decode de nombres de fichero del ZIP y strFromU8(_, true)), por lo
 * que NO podemos usar esas rutas. Estas dos funciones hacen la conversión de
 * forma segura: charCodeAt byte a byte, y apply SOLO sobre Arrays normales.
 * -------------------------------------------------------------------------- */

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
		s += String.fromCharCode.apply(null, arr); // arr es Array normal -> apply OK
	}
	return s;
}

/** Lectura little-endian sobre Uint8Array. */
function leerU16(u8, p) { return (u8[p] | (u8[p + 1] << 8)) >>> 0; }
function leerU32(u8, p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0; }

/** Nombre de fichero del ZIP (ASCII) byte a byte, sin apply. */
function leerNombre(u8, p, len) {
	var s = "";
	for (var i = 0; i < len; i++) s += String.fromCharCode(u8[p + i]);
	return s;
}

/* --------------------------- Lectura del ZIP -------------------------------
 * Lector propio de ZIP que recorre la Central Directory para obtener los
 * nombres CORRECTOS (fflate.unzipSync los corrompe en este motor). El
 * contenido se descomprime con fflate.inflateSync, que es seguro (solo opera
 * sobre bytes, sin rutas de string). Devuelve un objeto { nombre: Uint8Array }.
 * -------------------------------------------------------------------------- */
function descomprimirZip(u8) {
	var n = u8.length;

	// Localizar End Of Central Directory (firma 0x06054b50).
	var i = n - 22;
	while (i >= 0 && leerU32(u8, i) !== 0x06054b50) i--;
	if (i < 0) throw new Error("ZIP inválido: no se encontró EOCD");

	var numEntradas = leerU16(u8, i + 10);
	var offsetCD    = leerU32(u8, i + 16);

	var ficheros = {};
	var p = offsetCD;

	for (var e = 0; e < numEntradas; e++) {
		// Cabecera de Central Directory (firma 0x02014b50).
		if (leerU32(u8, p) !== 0x02014b50) throw new Error("ZIP inválido: cabecera CD en " + p);

		var metodo     = leerU16(u8, p + 10);
		var compSize   = leerU32(u8, p + 20);
		var uncompSize = leerU32(u8, p + 24);
		var nameLen    = leerU16(u8, p + 28);
		var extraLen   = leerU16(u8, p + 30);
		var commentLen = leerU16(u8, p + 32);
		var localOff   = leerU32(u8, p + 42);
		var nombre     = leerNombre(u8, p + 46, nameLen);

		// Cabecera local (firma 0x04034b50): los campos name/extra pueden diferir.
		var lhNameLen  = leerU16(u8, localOff + 26);
		var lhExtraLen = leerU16(u8, localOff + 28);
		var inicioDato = localOff + 30 + lhNameLen + lhExtraLen;

		var comp = u8.subarray(inicioDato, inicioDato + compSize);
		var dato = (metodo === 0)
			? new Uint8Array(comp)                                    // almacenado
			: fflate.inflateSync(comp, { out: new Uint8Array(uncompSize) }); // deflate

		ficheros[nombre] = dato;

		p += 46 + nameLen + extraLen + commentLen;
	}

	return ficheros;
}

/**
 * Carga TODOS los registros de una tabla maestra y devuelve:
 *   { valores: ["cod - nom", ...] (ordenado),  mapa: { cod: "cod - nom" } }
 *
 * El "código" se lee siempre como texto para que sirva de clave consistente
 * tanto si el campo es numérico (MAR_M, LIN_M, ENT_M...) como alfanumérico (FAM).
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

	// Orden alfabético para que el desplegable sea cómodo de usar.
	resultado.valores.sort();

	//log("Maestra " + def.tabla + ": " + resultado.valores.length + " valores");
	return resultado;
}

/**
 * Columna "lookup": busca un valor en una tabla RELACIONADA a partir de dos
 * claves tomadas del artículo en curso.
 *
 * Caso SKU proveedor: en ART_PRV_G, índice ART_PRV = [ ID del artículo, PRV ]
 * (proveedor del artículo). Devuelve el campo def.campoRet (REF_PRV) del
 * registro encontrado, o "" si no existe.
 *
 * Las claves se leen como texto para no forzar conversiones numéricas que
 * puedan impedir el emparejamiento del índice.
 */
function buscarRelacionado(artReg, def) {
	var k1 = artReg.fieldToString(def.claveArt);   // ID del artículo
	var k2 = artReg.fieldToString(def.clavePrv);   // PRV (proveedor del artículo)

	var r = new VRegister(theRoot);
	r.setTable(def.tabla, false);

	if (r.readRegister(def.indice, [k1, k2], VRegister.SearchThis) && r.isOK()) {
		return r.fieldToString(def.campoRet);
	}
	return "";
}

/* ------------------------------ Proceso ----------------------------------- */

var listaArt = new VRegisterList(theRoot);
listaArt     = theRegisterListIn;
var ruta     = theApp.tempPath() + "/CambiosMasivos.xlsx";

if ( listaArt.size() == 0 ) {
	theRoot.setVar("OK" , false);
	theRoot.setVar("MSJ" , "No se pudo obtener la lista de artículos seleccionados");	
} else {

	/* 1) Determinar columnas activas (mismo orden que el script original) --- */
	//    La columna ID del artículo se exporta SIEMPRE en primera posición:
	//    es la clave para emparejar registros al reimportar la plantilla.
	var columnas = [
		{ cabecera: "ID", campoArt: "ID", tipo: "plano" }
	];
	for (var c = 0; c < DEF_COLUMNAS.length; c++) {
		if (theRoot.varToBool(DEF_COLUMNAS[c].varAct)) {
			columnas.push(DEF_COLUMNAS[c]);
		}
	}

	/* 2) Cargar las maestras de las columnas combo activas ------------------ */
	//    Cada combo activo recibe un índice de hoja oculta (columna en "Listas").
	var combos = [];   // { col: defColumna, datos: {valores,mapa}, idxLista, idxColData }
	for (var c = 0; c < columnas.length; c++) {
		if (columnas[c].tipo === "combo") {
			combos.push({
				col:        columnas[c],
				datos:      cargarMaestro(columnas[c]),
				idxLista:   combos.length,   // columna en HOJA_LISTAS (0 = A, 1 = B, ...)
				idxColData: c                // columna en HOJA_DATOS (0-based)
			});
		}
	}

	/* 3) Construir las filas de la hoja "Datos" ----------------------------- */
	var filas  = [];
	var cabec  = [];
	for (var c = 0; c < columnas.length; c++) cabec.push(columnas[c].cabecera);
	filas.push(cabec);

	for (var i = 0; i < listaArt.size(); i++) {
		var reg  = listaArt.readAt(i);
		var fila = [];

		for (var c = 0; c < columnas.length; c++) {
			var def = columnas[c];

			if (def.tipo === "combo") {
				// Valor actual del artículo -> formateado "código - nombre"
				// para que coincida con una entrada del desplegable.
				var cod   = reg.fieldToString(def.campoArt);
				var combo = null;
				for (var k = 0; k < combos.length; k++) {
					if (combos[k].idxColData === c) { combo = combos[k]; break; }
				}
				var display = (combo && combo.datos.mapa[cod] != null) ? combo.datos.mapa[cod] : cod;
				fila.push(display);
			} else if (def.tipo === "lookup") {
				// Valor tomado de una tabla relacionada (ej. SKU en ART_PRV_G).
				fila.push(buscarRelacionado(reg, def));
			} else {
				fila.push(reg.fieldToString(def.campoArt));
			}
		}
		filas.push(fila);
	}

	/* 4) Construir la hoja "Listas" (una columna por combo) ----------------- */
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
	if (filasListas.length === 0) filasListas.push([null]); // hoja nunca vacía

	/* 5) Montar el workbook ------------------------------------------------- */
	var wb   = XLSX.utils.book_new();
	var wsD  = XLSX.utils.aoa_to_sheet(filas);
	var wsL  = XLSX.utils.aoa_to_sheet(filasListas);

	wb.Props = {
		Title:   "Plantilla cambios masivos (con desplegables)",
		Subject: "Selecciona los valores en los desplegables. No cambies las cabeceras.",
		Author:  "Sygemat"
	};

	XLSX.utils.book_append_sheet(wb, wsD, HOJA_DATOS);   // -> sheet1.xml
	XLSX.utils.book_append_sheet(wb, wsL, HOJA_LISTAS);  // -> sheet2.xml

	wb.Workbook = wb.Workbook || {};
	wb.Workbook.Sheets = [ { Hidden: 0 }, { Hidden: 1 } ]; // ocultar "Listas"

	// Un nombre definido por combo, cubriendo EXACTAMENTE sus valores.
	var nombres = [];
	for (var k = 0; k < combos.length; k++) {
		var n = combos[k].datos.valores.length;
		if (n < 1) n = 1;
		var letra = columnaLetra(combos[k].idxLista + 1); // A, B, C...
		combos[k].nombreRango = "LISTA_" + combos[k].col.campoArt;
		nombres.push({
			Name: combos[k].nombreRango,
			Ref:  "'" + HOJA_LISTAS + "'!$" + letra + "$1:$" + letra + "$" + n
		});
	}
	wb.Workbook.Names = nombres;

	/* 6) Serializar y descomprimir el zip ----------------------------------- */
	//    XLSX.write type:"binary" (modo que el original ya usa con éxito) -> se
	//    pasa a bytes con binStrAU8 (charCodeAt, seguro) y se descomprime con
	//    nuestro lector propio (fflate.unzipSync corrompe los nombres aquí).
	var wbBin = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
	var files = descomprimirZip(binStrAU8(wbBin));

	/* 7) Inyectar <dataValidations> en la hoja "Datos" (sheet1.xml) --------- */
	var numFilasDatos = listaArt.size();
	var primeraFila   = 2;                                  // fila 1 = cabeceras
	var ultimaFila    = numFilasDatos > 0 ? (numFilasDatos + 1) : 1000;

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

	var claveHoja = "xl/worksheets/sheet1.xml"; // Datos = primera hoja añadida
	if (!files[claveHoja]) {
		logError("No se encontró " + claveHoja + ". Hojas en el zip: " + nombresClaves(files));
	}

	if (validaciones !== "" && files[claveHoja]) {
		var dv = '<dataValidations count="' + combos.length + '">' + validaciones + "</dataValidations>";

		// strFromU8/strToU8 SIN segundo argumento -> ruta UTF-8 (sin apply), segura.
		var sheetXml = fflate.strFromU8(files[claveHoja]);

		// El esquema OOXML (CT_Worksheet) exige ORDEN ESTRICTO de elementos:
		// <dataValidations> va después de sheetData/mergeCells/conditionalFormatting
		// y ANTES de hyperlinks, pageMargins, ignoredErrors, drawing, etc. Si se
		// coloca fuera de orden, Excel marca el fichero como dañado.
		// SheetJS suele terminar la hoja con <ignoredErrors>, así que insertamos
		// antes del PRIMER elemento que, según el esquema, sigue a dataValidations.
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

		files[claveHoja] = fflate.strToU8(sheetXml);
	}

	/* 8) Recomprimir y escribir a disco ------------------------------------- */
	//    fflate.zipSync codifica los nombres por una ruta segura (sin apply).
	//    El Uint8Array final se pasa a cadena binaria con u8ABinStr (apply solo
	//    sobre Arrays normales) para reutilizar escribirBinarioEnFichero.
	var bytes  = fflate.zipSync(files);
	var binStr = u8ABinStr(bytes);

	if (escribirBinarioEnFichero(ruta, binStr)) {
		theRoot.setVar("OK" , true);
		theRoot.setVar("MSJ" , "Plantilla generada: " + ruta);			
		theRoot.setVar("SND", ruta);
	} else {
		theRoot.setVar("OK" , false);
		theRoot.setVar("MSJ" , _log_lineas.join("\n"));
	}
}

/** Lista los nombres de fichero del objeto de zip (para diagnóstico en log). */
function nombresClaves(files) {
	var arr = [];
	for (var key in files) { if (files.hasOwnProperty(key)) arr.push(key); }
	return arr.join(", ");
}


