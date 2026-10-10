/* ===========================================================================
 * importarPlantillaAltaArt.js
 *
 * Importa la plantilla generada por generarPlantillaAltaArt.js. TODO lo que
 * venga en el fichero se da de ALTA (siempre crea artículos nuevos).
 *
 * VALIDACIONES GLOBALES (antes de procesar nada; si fallan -> no se importa):
 *   G1) El ID de proveedor del encabezado de la columna A (celda A1) debe
 *       coincidir con la variable ID_PRV.
 *   G2) Las columnas de Bonificaciones del fichero deben coincidir (cantidad e
 *       IDs) con las bonificaciones del proveedor en BON_M (índice ENT_M).
 *       Las columnas de Rentabilidad por lista deben coincidir (cantidad e IDs)
 *       con los registros de VTA_TAR_G.
 *
 * VALIDACIONES POR FILA (si fallan -> no se importa esa fila y se registra):
 *   F1) Todas las columnas de la fila deben tener valor, EXCEPTO la columna A
 *       (proveedor, solo A1) y la columna "FIN_BONIFICACIONES".
 *   F2) El SKU proveedor no puede repetirse: se busca en ART_PRV_G por el
 *       índice REF_PRV = [ SKU, ID_PRV ]; si existe, la fila no se importa.
 *   F3) Ningún porcentaje de bonificación puede ser mayor a 100.
 *
 * GRABADO por artículo (una transacción por fila):
 *   ART_M:          REF=SKU Propio, NAME=Descripcion, FAM=Categoria(ID),
 *                   MAR_M=Marca(ID), UND_MED_INV=Unidad(ID)
 *   ART_PRV_G:      ART=ID art. creado, PRV=ID_PRV, REF=SKU proveedor, COS=Costo base
 *   ART_BON_M (x N): ART_PRV_G=ID art_prv creado, BON_M=ID bonif (cabecera), BON=%
 *   VTA_TAR_ART_G (x M): ART=ID art. creado, VTA_TAR=ID tarifa (cabecera), POR_REN=%
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   SND     {string}  Ruta absoluta del .xlsx a importar.
 *   ID_PRV  {string}  ID del proveedor esperado.
 *
 * Variables de salida:
 *   OK   {bool}    true si el fichero se procesó (aunque haya filas con error).
 *   MSJ  {string}  Resumen + detalle de filas no importadas.
 *
 * Dependencias: xlsx.full.min.js, fichero_utils.js, excel_utils.js, log_utils.js
 * =========================================================================== */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"

/* --------------------------- Configuración -------------------------------- */

var PROY_DAT = "sygemat_corralon_dat";

var TABLA_ART         = PROY_DAT + "/ART_M";
var TABLA_ART_PRV     = PROY_DAT + "/ART_PRV_G";
var TABLA_ART_BON     = PROY_DAT + "/ART_BON_M";
var TABLA_VTA_TAR_ART = PROY_DAT + "/VTA_TAR_ART_G";
var TABLA_BON         = PROY_DAT + "/BON_M";
var TABLA_VTA_TAR     = PROY_DAT + "/VTA_TAR_G";

var INDICE_REF_PRV = "REF_PRV";   // ART_PRV_G: [ REF (SKU), PRV ]
var INDICE_BON_ENT = "ENT_M";     // BON_M por proveedor
var INDICE_VTA_TAR = "ID";        // VTA_TAR_G: todas

var HOJA_DATOS = "Datos";

var MARCA_FIN_BONIF = "FIN_BONIFICACIONES";

// Cabeceras fijas esperadas (el resto entre "Costo base" y FIN son bonif.,
// y lo posterior a FIN son tarifas).
var H_SKU_PROPIO = "SKU Propio";
var H_DESC       = "Descripcion";
var H_CAT        = "Categoria";
var H_MAR        = "Marca";
var H_SKU_PRV    = "SKU proveedor";
var H_UND        = "Unidad de inventario";
var H_COSTO      = "Costo base";

var MAX_BONIF = 100;   // % máximo de bonificación

/* ----------------------------- Utilidades --------------------------------- */

/** Extrae el código de "código - nombre" (primer " - "). "" si vacío. */
function extraerCodigo(valor) {
	if (valor == null) return "";
	var s = String(valor);
	var p = s.indexOf(" - ");
	return (p === -1 ? s : s.substring(0, p)).replace(/^\s+|\s+$/g, "");
}

function trim(v) { return String(v == null ? "" : v).replace(/^\s+|\s+$/g, ""); }

function esVacia(valor) { return trim(valor) === ""; }

/** Celda segura de una matriz (fila puede ser más corta que las cabeceras). */
function celda(fila, idx) {
	if (!fila) return "";
	var v = (idx < fila.length) ? fila[idx] : "";
	return (v == null) ? "" : v;
}

/** Convierte a número admitiendo coma decimal. NaN si no es numérico. */
function aNumero(v) {
	if (v == null || v === "") return NaN;
	if (typeof v === "number") return v;
	var s = trim(v);
	// Formato europeo "1.234,56" -> "1234.56". Si no hay coma, se deja tal cual
	// (así "10.5" con punto decimal se respeta).
	if (s.indexOf(",") !== -1) s = s.replace(/\./g, "").replace(",", ".");
	return parseFloat(s);
}

/** ¿Dos listas de IDs son iguales en cantidad y contenido (como conjuntos)? */
function mismosIds(a, b) {
	if (a.length !== b.length) return false;
	var setB = {}; for (var i = 0; i < b.length; i++) setB[b[i]] = true;
	for (var j = 0; j < a.length; j++) if (!setB[a[j]]) return false;
	var setA = {}; for (var k = 0; k < a.length; k++) setA[a[k]] = true;
	for (var m = 0; m < b.length; m++) if (!setA[b[m]]) return false;
	return true;
}

/** Carga IDs de una tabla por un índice (clave [] = todas). */
function cargarIds(tabla, indice, clave, campoId) {
	var out = [];
	var lista = new VRegisterList(theRoot);
	lista.setTable(tabla);
	if (!lista.load(indice, clave)) {
		logError("No se pudo cargar " + tabla + " (índice " + indice + ")");
		return out;
	}
	for (var i = 0; i < lista.size(); i++) {
		out.push(lista.readAt(i).fieldToString(campoId));
	}
	return out;
}

/* ------------------------------- Proceso ---------------------------------- */

var ruta  = theRoot.varToString("SND");
var idPrv = trim(theRoot.varToString("ID_PRV"));

var altaCount = 0;
var errCount  = 0;

function abortar(msg) {
	theRoot.setVar("OK", false);
	theRoot.setVar("MSJ", msg);
	mostrarLog();
}

var binario = leerFicheroComoBinario(ruta);

if (binario === null) {
	abortar("No se pudo leer el fichero: " + ruta);
} else {
	var workbook = parsearWorkbook(binario);

	var indiceHoja = workbook.SheetNames.indexOf(HOJA_DATOS);
	if (indiceHoja < 0) indiceHoja = 0;

	var hoja   = workbook.Sheets[workbook.SheetNames[indiceHoja]];
	var matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });

	if (matriz.length === 0) {
		abortar("El fichero no tiene contenido.");
	} else {

	var cabeceras = matriz[0];

	/* --- Localizar columnas por cabecera --------------------------------- */
	var idxCab = function (nombre) {
		for (var i = 0; i < cabeceras.length; i++) {
			if (trim(cabeceras[i]) === nombre) return i;
		}
		return -1;
	};

	var idxSku   = idxCab(H_SKU_PROPIO);
	var idxDesc  = idxCab(H_DESC);
	var idxCat   = idxCab(H_CAT);
	var idxMar   = idxCab(H_MAR);
	var idxSkuP  = idxCab(H_SKU_PRV);
	var idxUnd   = idxCab(H_UND);
	var idxCosto = idxCab(H_COSTO);
	var idxFin   = idxCab(MARCA_FIN_BONIF);

	var faltan = [];
	if (idxSku   < 0) faltan.push(H_SKU_PROPIO);
	if (idxDesc  < 0) faltan.push(H_DESC);
	if (idxCat   < 0) faltan.push(H_CAT);
	if (idxMar   < 0) faltan.push(H_MAR);
	if (idxSkuP  < 0) faltan.push(H_SKU_PRV);
	if (idxUnd   < 0) faltan.push(H_UND);
	if (idxCosto < 0) faltan.push(H_COSTO);
	if (idxFin   < 0) faltan.push(MARCA_FIN_BONIF);

	if (faltan.length > 0) {
		abortar("El fichero no tiene la estructura esperada. Faltan columnas: " + faltan.join(", "));
	} else {

	/* --- Columnas dinámicas: bonificaciones (Costo..FIN) y tarifas (FIN..) - */
	var bonifCols  = [];   // { col, id }
	for (var cc = idxCosto + 1; cc < idxFin; cc++) {
		bonifCols.push({ col: cc, id: extraerCodigo(cabeceras[cc]) });
	}
	var tarifaCols = [];
	for (var cc = idxFin + 1; cc < cabeceras.length; cc++) {
		tarifaCols.push({ col: cc, id: extraerCodigo(cabeceras[cc]) });
	}

	/* === VALIDACIÓN GLOBAL G1: proveedor de A1 == ID_PRV ================== */
	var provFichero = trim(celda(cabeceras, 0));
	if (provFichero !== idPrv) {
		abortar("El proveedor del fichero (A1='" + provFichero + "') no coincide con el proveedor indicado (ID_PRV='" + idPrv + "'). No se importa nada.");
	} else {

	/* === VALIDACIÓN GLOBAL G2: columnas dinámicas == BD ================== */
	var bonifDB  = cargarIds(TABLA_BON,     INDICE_BON_ENT, [idPrv], "ID");
	var tarifaDB = cargarIds(TABLA_VTA_TAR, INDICE_VTA_TAR, [],      "ID");

	var bonifFileIds  = []; for (var i = 0; i < bonifCols.length; i++)  bonifFileIds.push(bonifCols[i].id);
	var tarifaFileIds = []; for (var i = 0; i < tarifaCols.length; i++) tarifaFileIds.push(tarifaCols[i].id);

	var errG2 = "";
	if (!mismosIds(bonifFileIds, bonifDB)) {
		errG2 = "Las bonificaciones del fichero (" + bonifFileIds.length + ") no coinciden con las del proveedor (" + bonifDB.length + "). Fichero: [" + bonifFileIds.join(", ") + "]  BD: [" + bonifDB.join(", ") + "]";
	} else if (!mismosIds(tarifaFileIds, tarifaDB)) {
		errG2 = "Las listas de precios del fichero (" + tarifaFileIds.length + ") no coinciden con las de la BD (" + tarifaDB.length + "). Fichero: [" + tarifaFileIds.join(", ") + "]  BD: [" + tarifaDB.join(", ") + "]";
	}

	if (errG2 !== "") {
		abortar("No se importa nada. " + errG2);
	} else {

	/* === PROCESO DE FILAS ================================================= */
	for (var r = 1; r < matriz.length; r++) {
		var fila     = matriz[r];
		var numFila  = r + 1;   // fila real en Excel (1-based, +1 por cabecera)

		// Valores fijos (crudos).
		var skuPropio = trim(celda(fila, idxSku));
		var desc      = trim(celda(fila, idxDesc));
		var catRaw    = trim(celda(fila, idxCat));
		var marRaw    = trim(celda(fila, idxMar));
		var skuProv   = trim(celda(fila, idxSkuP));
		var undRaw    = trim(celda(fila, idxUnd));
		var costoRaw  = trim(celda(fila, idxCosto));

		// ¿Fila completamente vacía? -> se ignora en silencio.
		var algo = (skuPropio || desc || catRaw || marRaw || skuProv || undRaw || costoRaw);
		if (!algo) {
			for (var b = 0; b < bonifCols.length && !algo; b++)  if (trim(celda(fila, bonifCols[b].col)))  algo = true;
			for (var t = 0; t < tarifaCols.length && !algo; t++) if (trim(celda(fila, tarifaCols[t].col))) algo = true;
		}
		if (!algo) continue;

		/* --- F1: todos los campos requeridos con valor -------------------- */
		var faltantes = [];
		if (skuPropio === "") faltantes.push(H_SKU_PROPIO);
		if (desc === "")      faltantes.push(H_DESC);
		if (catRaw === "")    faltantes.push(H_CAT);
		if (marRaw === "")    faltantes.push(H_MAR);
		if (skuProv === "")   faltantes.push(H_SKU_PRV);
		if (undRaw === "")    faltantes.push(H_UND);
		if (costoRaw === "")  faltantes.push(H_COSTO);
		for (var b = 0; b < bonifCols.length; b++) {
			if (trim(celda(fila, bonifCols[b].col)) === "") faltantes.push("Bonif " + bonifCols[b].id);
		}
		for (var t = 0; t < tarifaCols.length; t++) {
			if (trim(celda(fila, tarifaCols[t].col)) === "") faltantes.push("Tarifa " + tarifaCols[t].id);
		}
		if (faltantes.length > 0) {
			logError("Fila " + numFila + ": faltan valores en: " + faltantes.join(", ") + ".");
			errCount++;
			continue;
		}

		// Valores numéricos y códigos.
		var costo = aNumero(costoRaw);
		var cat   = extraerCodigo(catRaw);
		var mar   = extraerCodigo(marRaw);
		var und   = extraerCodigo(undRaw);

		if (isNaN(costo)) {
			logError("Fila " + numFila + ": 'Costo base' no es numérico ('" + costoRaw + "').");
			errCount++;
			continue;
		}

		/* --- F3: bonificaciones <= 100 y numéricas ------------------------ */
		var bonifVals = [];   // { id, pct }
		var errNum = "";
		for (var b = 0; b < bonifCols.length && errNum === ""; b++) {
			var pv = aNumero(celda(fila, bonifCols[b].col));
			if (isNaN(pv))       errNum = "Bonif " + bonifCols[b].id + " no es numérica.";
			else if (pv > MAX_BONIF) errNum = "Bonif " + bonifCols[b].id + " (" + pv + "%) supera el " + MAX_BONIF + "%.";
			else bonifVals.push({ id: bonifCols[b].id, pct: pv });
		}
		if (errNum !== "") {
			logError("Fila " + numFila + ": " + errNum);
			errCount++;
			continue;
		}

		var tarifaVals = [];  // { id, pct }
		for (var t = 0; t < tarifaCols.length && errNum === ""; t++) {
			var pr = aNumero(celda(fila, tarifaCols[t].col));
			if (isNaN(pr)) errNum = "Tarifa " + tarifaCols[t].id + " no es numérica.";
			else tarifaVals.push({ id: tarifaCols[t].id, pct: pr });
		}
		if (errNum !== "") {
			logError("Fila " + numFila + ": " + errNum);
			errCount++;
			continue;
		}

		/* --- F2: SKU proveedor no duplicado en ART_PRV_G ------------------ */
		var chk = new VRegister(theRoot);
		chk.setTable(TABLA_ART_PRV, false);
		if (chk.readRegister(INDICE_REF_PRV, [skuProv, idPrv], VRegister.SearchThis) && chk.isOK()) {
			logError("Fila " + numFila + ": el SKU proveedor '" + skuProv + "' ya existe para este proveedor.");
			errCount++;
			continue;
		}

		/* --- ALTA (transacción por fila) ---------------------------------- */
		theRoot.beginTrans("Alta artículo fila " + numFila);
		var errFila = "";

		// 1) ART_M
		var art = new VRegister(theRoot);
		art.setTable(TABLA_ART, true);
		art.setField("REF",         skuPropio);
		art.setField("NAME",        desc);
		art.setField("FAM",         cat);
		art.setField("MAR_M",       mar);
		art.setField("UND_MED_INV", und);
		art.setField("PRV", idPrv);
		art.addRegister();
		if (art.errorNumber() !== 0) errFila = "crear ART_M: [" + art.errorNumber() + "] " + art.errorMessage();
		var idArt = art.fieldToString("ID");
		if (errFila === "" && esVacia(idArt)) errFila = "ART_M creado pero su ID llegó vacío (fieldToString('ID') tras addRegister).";

		// 2) ART_PRV_G
		var idArtPrv = "";
		if (errFila === "") {
			var ap = new VRegister(theRoot);
			ap.setTable(TABLA_ART_PRV, true);
			ap.setField("ART", idArt);
			ap.setField("PRV", idPrv);
			ap.setField("REF", skuProv);
			ap.setField("COS", costo);
			ap.setField("PRN", 1);			
			ap.addRegister();
			if (ap.errorNumber() !== 0) errFila = "crear ART_PRV_G: [" + ap.errorNumber() + "] " + ap.errorMessage();
			idArtPrv = ap.fieldToString("ID");
			if (errFila === "" && esVacia(idArtPrv)) errFila = "ART_PRV_G creado pero su ID llegó vacío.";
		}

		// 3) ART_BON_M (una por bonificación)
		for (var b = 0; b < bonifVals.length && errFila === ""; b++) {
			var rb = new VRegister(theRoot);
			rb.setTable(TABLA_ART_BON, true);
			rb.setField("ART_PRV_G", idArtPrv);
			rb.setField("BON_M",     bonifVals[b].id);
			rb.setField("BON",       bonifVals[b].pct);
			rb.addRegister();
			if (rb.errorNumber() !== 0) errFila = "crear ART_BON_M (BON_M=" + bonifVals[b].id + ", ART_PRV_G=" + idArtPrv + "): [" + rb.errorNumber() + "] " + rb.errorMessage();
		}

		// 4) VTA_TAR_ART_G (una por lista de precios)
		/*alert(JSON.stringify(tarifaVals));
		for (var t = 0; t < tarifaVals.length && errFila === ""; t++) {			
			var rv = new VRegister(theRoot);
			rv.setTable(TABLA_VTA_TAR_ART, true);
			rv.setField("ART",     idArt);
			rv.setField("VTA_TAR", tarifaVals[t].id);
			rv.setField("POR_REN", tarifaVals[t].pct);
			rv.addRegister();
			if (rv.errorNumber() !== 0) errFila = "crear VTA_TAR_ART_G (ART=" + idArt + ", VTA_TAR=" + tarifaVals[t].id + ", POR_REN=" + tarifaVals[t].pct + "): [" + rv.errorNumber() + "] " + rv.errorMessage();
		}*/

		// Confirmar o revertir la fila completa.
		if (errFila === "") {
			theRoot.commitTrans();
			altaCount++;
		} else {
			theRoot.rollbackTrans();
			logError("Fila " + numFila + ": " + errFila);
			errCount++;
		}
	}

	var resumen = "Importación finalizada. Altas=" + altaCount + "  Errores=" + errCount;
	theRoot.setVar("OK", true);
	theRoot.setVar("MSJ", resumen + (_log_lineas.length > 0 ? ("\n\n" + _log_lineas.join("\n")) : ""));

	}}}} // cierres de: G2 ok, G1 ok, estructura ok, matriz no vacía
}

mostrarLog();
