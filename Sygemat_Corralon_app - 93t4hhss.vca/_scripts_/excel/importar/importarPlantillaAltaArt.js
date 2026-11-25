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
 * VALIDACIONES POR FILA (se juntan TODOS los errores de cada fila; con una
 * sola fila con error no se crea nada):
 *   F1) Todas las columnas de la fila deben tener valor, EXCEPTO la columna A
 *       (proveedor, solo A1) y la columna "FIN_BONIFICACIONES".
 *   F2) El SKU proveedor no puede repetirse: se busca en ART_PRV_G por el
 *       índice REF_PRV = [ SKU, ID_PRV ]; si existe, la fila no se importa.
 *   F3) Ningún porcentaje de bonificación puede ser mayor a 100 ni negativo.
 *   F6) El SKU proveedor tampoco puede repetirse dentro del fichero.
 *   F4) El SKU Propio (ART_M.REF) no puede repetirse: ni DENTRO del fichero
 *       (dos filas con el mismo SKU), ni contra la BD (índice REF). En ambos
 *       casos la fila no se importa.
 *   F5) Categoría, Marca y Unidad de inventario deben EXISTIR en su maestra
 *       (FAM_M / MAR_M / UND_MED_M). El desplegable ayuda, pero pegar un valor
 *       en Excel lo saltea; si no existe, la fila no se importa.
 *
 * Nota sobre números: el costo y los porcentajes se interpretan en formato
 * ARGENTINO ("." = miles, "," = decimal). "1.234" = 1234, "1.234,56" = 1234.56.
 *
 * MODOS (variable MODO; S30-81, asistente de Alta masiva de artículos):
 *   VALIDAR  Revisa TODAS las filas y arma el informe (INFORME, en HTML) sin
 *            grabar nada. El asistente lo muestra antes de crear.
 *   CREAR    Vuelve a validar y, si no hay ningún error, crea TODOS los
 *            artículos en UNA sola transacción: todo o nada (RN-8). Si una
 *            fila falla al grabar, se revierte todo y no queda ningún artículo.
 *   ""       (vacío) igual que CREAR, para la acción vieja ART_IMP_PLA.
 *
 * Listas de precios: solo cuentan las NO reducidas (VTA_TAR_G.RED = 0), igual
 * que el alta manual (trigger A3 de ART_M), que solo le autocrea al artículo
 * las filas de VTA_TAR_ART_G de las no reducidas (S30-81, falla 1).
 *
 * GRABADO (MODO CREAR, una sola transacción para todo el fichero):
 *   ART_M:          REF=SKU Propio, NAME=Descripcion, FAM=Categoria(ID),
 *                   MAR_M=Marca(ID), UND_MED_INV=Unidad(ID)
 *   ART_PRV_G:      ART=ID art. creado, PRV=ID_PRV, REF_PRV=SKU proveedor, COS=Costo base
 *   ART_BON_M (x N): ART_PRV_G=ID art_prv creado, BON_M=ID bonif (cabecera), BON=%
 *   VTA_TAR_ART_G (x M): ART=ID art. creado, VTA_TAR=ID tarifa (cabecera), POR_REN=%
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   SND     {string}  Ruta absoluta del .xlsx a importar.
 *   ID_PRV  {string}  ID del proveedor esperado.
 *
 *   MODO    {string}  "VALIDAR" | "CREAR" | "" (ver MODOS).
 *
 * Variables de salida:
 *   OK      {bool}    VALIDAR: la planilla no tiene errores. CREAR: se crearon.
 *   MSJ     {string}  Resumen en texto (para un mensaje).
 *   INFORME {string}  Informe en HTML (para el Visor HTML del asistente).
 *   N_FIL   {number}  Filas con datos.
 *   N_OK    {number}  Filas sin errores.
 *   N_ERR   {number}  Filas con errores (1 si la planilla entera no sirve).
 *   N_ALT   {number}  Artículos creados (solo CREAR).
 *
 * Dependencias: xlsx.full.min.js, fichero_utils.js, excel_utils.js, log_utils.js
 * =========================================================================== */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/permiso_alta_masiva.js"

/* --------------------------- Configuración -------------------------------- */

var PROY_DAT = "sygemat_corralon_dat";

var TABLA_ART         = PROY_DAT + "/ART_M";
var TABLA_ART_PRV     = PROY_DAT + "/ART_PRV_G";
var TABLA_ART_BON     = PROY_DAT + "/ART_BON_M";
var TABLA_VTA_TAR_ART = PROY_DAT + "/VTA_TAR_ART_G";
var TABLA_BON         = PROY_DAT + "/BON_M";
var TABLA_VTA_TAR     = PROY_DAT + "/VTA_TAR_G";

// Maestras de los combos (para validar que el valor escrito/pegado exista).
var TABLA_FAM = PROY_DAT + "/FAM_M";       // Categoría
var TABLA_MAR = PROY_DAT + "/MAR_M";       // Marca
var TABLA_UND = PROY_DAT + "/UND_MED_M";   // Unidad de inventario

var INDICE_REF     = "REF";       // ART_M por SKU Propio (campo REF)
var INDICE_REF_PRV = "REF_PRV";   // ART_PRV_G: [ REF_PRV (SKU), PRV, ART ]
var INDICE_BON_ENT = "ENT_M";     // BON_M por proveedor
var INDICE_VTA_TAR = "ID";        // VTA_TAR_G: todas

// Las filas de VTA_TAR_ART_G se autocrean al dar de alta el artículo. Para
// fijar su rentabilidad se cargan por el índice del puntero ART y se localiza
// cada lista por su campo VTA_TAR.
var INDICE_VTA_ART  = "ART";       // índice de VTA_TAR_ART_G por el artículo
var CAMPO_VTA_TAR   = "VTA_TAR";   // puntero a la lista de precios
var CAMPO_POR_REN   = "POR_REN";   // % de rentabilidad a modificar

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

/** Convierte a número en formato ARGENTINO. NaN si no es numérico.
 *  Reglas: "." = separador de MILES, "," = separador DECIMAL.
 *    "1.234"    -> 1234      (miles, NO 1.234)
 *    "1.234,56" -> 1234.56
 *    "1234,5"   -> 1234.5
 *    "1234"     -> 1234
 *  Un número ya tipado como number (lo interpretó Excel según su locale) se
 *  devuelve tal cual. */
function aNumero(v) {
	if (v == null || v === "") return NaN;
	if (typeof v === "number") return v;
	var s = trim(v).replace(/[^\d.,\-]/g, "");   // deja solo dígitos . , -
	// S30-81: con coma, los puntos son miles y la coma el decimal. Sin coma: varios puntos o un punto seguido de EXACTAMENTE 3 digitos
	// son miles ("1.234" = 1234); cualquier otro punto es decimal ("1234.5" = 1234,5, "12.50" = 12,5), como llega una celda numerica de Excel.
	if (s.indexOf(",") !== -1) {
		s = s.replace(/\./g, "").replace(",", ".");
	} else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
		s = s.replace(/\./g, "");
	}
	return parseFloat(s);
}

/* --- Validación de que un código exista en su maestra --------------------- *
 * Se carga UNA vez el conjunto de códigos de cada maestra y se cachea. La
 * comprobación es por comparación de texto (sin depender del tipo de clave).  */
var _setsMaestro = {};

function setMaestro(tabla, indice, campoCod) {
	var clave = tabla + "|" + indice;
	if (_setsMaestro[clave]) return _setsMaestro[clave];

	var set = {};
	var lista = new VRegisterList(theRoot);
	lista.setTable(tabla);
	if (!lista.load(indice, [])) {
		logError("No se pudo cargar la maestra " + tabla + " (índice " + indice + ") para validar.");
	} else {
		for (var i = 0; i < lista.size(); i++) {
			set[lista.readAt(i).fieldToString(campoCod)] = true;
		}
	}
	_setsMaestro[clave] = set;
	return set;
}

function existeEnMaestro(tabla, indice, campoCod, codigo) {
	return setMaestro(tabla, indice, campoCod).hasOwnProperty(String(codigo));
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

/** Listas de precios NO reducidas (VTA_TAR_G.RED = 0): las mismas que el alta
 *  de ART_M (trigger A3) le crea al artículo nuevo. S30-81. */
function cargarTarifasNoReducidas() {
	var out = [];
	var lista = new VRegisterList(theRoot);
	lista.setTable(TABLA_VTA_TAR);
	if (!lista.load(INDICE_VTA_TAR, [])) {
		logError("No se pudo cargar " + TABLA_VTA_TAR + " (índice " + INDICE_VTA_TAR + ")");
		return out;
	}
	for (var i = 0; i < lista.size(); i++) {
		var reg = lista.readAt(i);
		if (esVerdadero(reg, "RED")) continue;
		out.push(reg.fieldToString("ID"));
	}
	return out;
}

function esVerdadero(reg, campo) {
	var s = trim(reg.fieldToString(campo)).toLowerCase();
	return s === "1" || s === "true" || s === "s";
}

/** Primer registro de la tabla cuyo campo es EXACTAMENTE el valor, o null. S30-81: el índice
 *  REF de ART_M no es de clave única (indexa 10 caracteres) y readRegister con SearchThis no
 *  encontraba artículos recién creados; se carga la lista por el índice y se compara el valor. */
function buscarExacto(tabla, indice, clave, campo, valor) {
	var lista = new VRegisterList(theRoot);
	lista.setTable(tabla);
	if (!lista.load(indice, clave)) return null;
	for (var i = 0; i < lista.size(); i++) {
		var r = lista.readAt(i);
		if (r.fieldToString(campo) === String(valor)) return r;
	}
	return null;
}

/* S30-81 (ronda 2): rendimiento. buscarExacto carga una lista por fila y, como el indice REF indexa solo 10 caracteres, cada
 * carga trae todos los articulos con el mismo comienzo (ZZS3081-V0...) y se lee uno por uno: el tiempo crecia mas que lineal
 * (1.000 filas = 4 min). Con planillas grandes se leen UNA sola vez los SKU existentes y se consulta en memoria. */
var UMBRAL_PRECARGA = 40;
var _nDatos = 0;
var _mapaArt = null, _mapaArtPrv = null;

/** Articulo existente con ese SKU Propio exacto: {id, name} o null. */
function artPorSku(sku) {
	if (_nDatos <= UMBRAL_PRECARGA) {
		var r = buscarExacto(TABLA_ART, INDICE_REF, [sku], "REF", sku);
		return r ? { id: r.fieldToString("ID"), name: r.fieldToString("NAME") } : null;
	}
	if (!_mapaArt) {
		_mapaArt = {};
		var lista = new VRegisterList(theRoot);
		lista.setTable(TABLA_ART);
		if (lista.load(INDICE_REF, [])) {
			for (var i = 0; i < lista.size(); i++) {
				var reg = lista.readAt(i), k = String(reg.fieldToString("REF"));
				if (!_mapaArt.hasOwnProperty(k)) _mapaArt[k] = { id: reg.fieldToString("ID"), name: reg.fieldToString("NAME") };
			}
		}
	}
	return _mapaArt.hasOwnProperty(String(sku)) ? _mapaArt[String(sku)] : null;
}

/** ¿Ya hay un articulo de este proveedor (idPrv) con ese SKU de proveedor exacto? */
function existeSkuPrv(skuProv) {
	if (_nDatos <= UMBRAL_PRECARGA) return !!buscarExacto(TABLA_ART_PRV, INDICE_REF_PRV, [skuProv, idPrv], "REF_PRV", skuProv);
	if (!_mapaArtPrv) {
		_mapaArtPrv = {};
		var lista = new VRegisterList(theRoot);
		lista.setTable(TABLA_ART_PRV);
		if (lista.load(INDICE_REF_PRV, [])) {
			for (var i = 0; i < lista.size(); i++) {
				var reg = lista.readAt(i);
				if (String(reg.fieldToString("PRV")) === String(idPrv)) _mapaArtPrv[String(reg.fieldToString("REF_PRV"))] = true;
			}
		}
	}
	return _mapaArtPrv.hasOwnProperty(String(skuProv));
}

/** Nombre de un registro por su ID ("" si no existe). */
function nombreDe(tabla, id, campoNom) {
	var r = new VRegister(theRoot);
	r.setTable(tabla, false);
	if (r.readRegister("ID", [id], VRegister.SearchThis) && r.isOK()) return r.fieldToString(campoNom);
	return "";
}

function html(v) {
	return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* --------------------------- Informe (HTML) ------------------------------- */
// S30-81 (UX): con 200 filas un cuadro fila por fila es imposible de revisar. El informe:
//  1) resume en tarjetas (filas, listas, con error);
//  2) agrupa los errores POR TIPO con las filas afectadas ("Categoria inexistente: filas 3, 7, 12");
//  3) detalla solo las filas con error (hasta MAX_DETALLE), con un filtro para buscar;
//  4) deja TODOS los errores en CSV_ERR para guardarlos y abrirlos en Excel (boton "Guardar errores").
// El Visor HTML es un navegador: se usa CSS embebido con los colores del sistema (naranja F07F46, gris 3A3C3E).
var COLOR_OK  = "#1b7a3c";
var COLOR_ERR = "#BA000D";
var MAX_DETALLE = 150;   // filas con error que se detallan en pantalla (todas van al CSV)
var MAX_LISTA   = 40;    // filas que se nombran por tipo de error antes de decir "y N mas"
var MAX_VISTA   = 15;    // filas de muestra cuando la planilla esta bien
var csvErr = "";         // todos los errores en CSV (variable de salida CSV_ERR)

var ETIQUETA_TIPO = {
	"SKU Propio repetido": "SKU Propio repetido dentro de la planilla",
	"SKU Propio ya existe": "SKU Propio ya existe en el sistema",
	"SKU proveedor repetido": "SKU proveedor repetido dentro de la planilla"
};

/** Parte un error "tipo (detalle)" para agruparlo: el tipo sin el detalle de cada fila. */
function partirError(e) {
	var m = /\(([^)]*)\)/.exec(e);
	var det = m ? m[1] : "";
	var tipo = e.replace(/\s*\([^)]*\)/g, "");
	var mb = /^(Bonif\.|Lista) (\S+)/.exec(tipo);
	if (mb) {
		det = (mb[1] === "Lista" ? "lista " : "bonif. ") + mb[2] + (det ? " " + det : "");
		tipo = tipo.replace(/^Bonif\. \S+/, "Bonificación").replace(/^Lista \S+/, "Lista de precios");
	}
	if (ETIQUETA_TIPO.hasOwnProperty(tipo)) tipo = ETIQUETA_TIPO[tipo];
	return { tipo: tipo, det: det };
}

/** Lista plana de {tipo, det} de una fila; "Falta: a, b" se abre en un error por dato. */
function erroresDeFila(f) {
	var res = [];
	for (var i = 0; i < f.errores.length; i++) {
		var e = f.errores[i];
		if (e.indexOf("Falta: ") === 0) {
			var nombres = e.substring(7).split(", ");
			for (var n = 0; n < nombres.length; n++) {
				var nom = nombres[n];
				if (nom.indexOf("bonif. ") === 0)      res.push({ tipo: "Falta una bonificación (el 0% se escribe 0)", det: nom });
				else if (nom.indexOf("lista ") === 0)  res.push({ tipo: "Falta el % de una lista de precios (el 0% se escribe 0)", det: nom });
				else                                    res.push({ tipo: "Falta el dato " + nom, det: "" });
			}
		} else {
			res.push(partirError(e));
		}
	}
	return res;
}

/** Agrupa los errores de todas las filas por tipo, de mayor a menor cantidad de filas. */
function agruparErrores(filas) {
	var grupos = {}, orden = [];
	for (var i = 0; i < filas.length; i++) {
		var lst = erroresDeFila(filas[i]);
		for (var j = 0; j < lst.length; j++) {
			var k = lst[j].tipo;
			if (!grupos.hasOwnProperty(k)) { grupos[k] = { tipo: k, filas: [], dets: [], vistas: {} }; orden.push(k); }
			var g = grupos[k];
			if (!g.vistas.hasOwnProperty(filas[i].num)) { g.vistas[filas[i].num] = true; g.filas.push(filas[i].num); g.dets.push(lst[j].det); }
		}
	}
	var res = [];
	for (var o = 0; o < orden.length; o++) res.push(grupos[orden[o]]);
	res.sort(function (a, b) { return b.filas.length - a.filas.length; });
	return res;
}

/** CSV (separador ;, con BOM para que Excel respete los acentos): una linea por error. */
function celdaCsv(v) {
	v = String(v == null ? "" : v).replace(/"/g, "\"\"");
	return /[;"\r\n]/.test(v) ? "\"" + v + "\"" : v;
}
function armarCsv(filas) {
	var s = "\uFEFFFila;SKU Propio;Descripcion;Error;Detalle\r\n";
	for (var i = 0; i < filas.length; i++) {
		var lst = erroresDeFila(filas[i]);
		for (var j = 0; j < lst.length; j++) {
			s += [filas[i].num, celdaCsv(filas[i].sku), celdaCsv(filas[i].desc), celdaCsv(lst[j].tipo), celdaCsv(lst[j].det)].join(";") + "\r\n";
		}
	}
	return s;
}

function estilosInforme() {
	return "<style>" +
		"body{font-family:Arial,sans-serif;font-size:13px;color:#3A3C3E;margin:12px 16px;background:#fff}" +
		".tarjetas{display:flex;gap:10px;margin-bottom:12px}" +
		".t{flex:1;border:1px solid #CBCACA;border-radius:10px;padding:8px 14px}" +
		".t b{display:block;font-size:26px;line-height:30px}" +
		".t span{font-size:12px;color:#757575}" +
		".t.ok{border-color:#1b7a3c}.t.ok b{color:#1b7a3c}" +
		".t.er{border-color:#BA000D;background:#FDECEA}.t.er b{color:#BA000D}" +
		".msg{padding:10px 14px;border-radius:10px;margin-bottom:12px;line-height:18px}" +
		".msg.ok{background:#E8F5EC;color:#1b7a3c}.msg.er{background:#FDECEA;color:#BA000D}.msg.in{background:#FEF3EE;color:#3A3C3E}" +
		"h3{font-size:14px;margin:16px 0 6px 0;color:#3A3C3E}" +
		".g{border:1px solid #CBCACA;border-radius:8px;padding:8px 12px;margin-bottom:6px}" +
		".g .n{display:inline-block;min-width:26px;text-align:center;background:#BA000D;color:#fff;border-radius:11px;padding:1px 7px;margin-right:8px;font-weight:bold}" +
		".g .f{margin-top:4px;color:#495055;line-height:19px}.g .d{color:#757575}" +
		"table{border-collapse:collapse;width:100%}" +
		"th{position:sticky;top:0;background:#F5F5F6;text-align:left;padding:6px 8px;border-bottom:2px solid #CBCACA}" +
		"td{padding:5px 8px;border-bottom:1px solid #E7EAEF;vertical-align:top}" +
		"tr:nth-child(even) td{background:#FAFAFB}" +
		".p{display:inline-block;background:#FDECEA;color:#BA000D;border-radius:10px;padding:1px 8px;margin:1px 3px 1px 0}" +
		".r{text-align:right}" +
		"input{width:100%;box-sizing:border-box;border:1px solid #BEC5CD;border-radius:5px;padding:6px 8px;margin:4px 0 8px 0;font-size:13px}" +
		".nota{color:#757575;font-size:12px;margin-top:6px}" +
		"</style>";
}

function tarjeta(valor, texto, clase) {
	return "<div class='t " + (clase || "") + "'><b>" + valor + "</b><span>" + html(texto) + "</span></div>";
}

function informeCuerpo(cuerpo) {
	return "<html><head><meta charset='utf-8'>" + estilosInforme() + "</head><body>" + cuerpo + "</body></html>";
}

/** Un mensaje solo (planilla vacia, fichero que no sirve, fallo al grabar). */
function informeHtml(titulo, colorTitulo, detalle) {
	var clase = colorTitulo === COLOR_OK ? "ok" : "er";
	return informeCuerpo("<div class='msg " + clase + "'><b>" + html(titulo) + "</b>" + (detalle ? "<br>" + detalle : "") + "</div>");
}

/** 3,4,5,6 -> "3 a 6": las filas seguidas se escriben como rango. */
function compactarFilas(arr) {
	var out = [], i = 0;
	while (i < arr.length) {
		var j = i;
		while (j + 1 < arr.length && arr[j + 1] === arr[j] + 1) j++;
		out.push(j - i >= 2 ? arr[i] + " a " + arr[j] : (j > i ? arr[i] + ", " + arr[j] : String(arr[i])));
		i = j + 1;
	}
	return out;
}

/** Texto de las filas de un grupo: rangos y, si el detalle es corto y distinto por fila, con su detalle. */
function textoFilas(gr) {
	var uni = {}, nuni = 0, corto = true, algo = false;
	for (var i = 0; i < gr.dets.length; i++) {
		var d = gr.dets[i];
		if (d === "") continue;
		algo = true;
		if (d.length > 30) corto = false;
		if (!uni.hasOwnProperty(d)) { uni[d] = true; nuni++; }
	}
	var res, mas = "";
	if (algo && nuni > 1 && corto) {
		var items = [];
		for (var k = 0; k < gr.filas.length && k < MAX_LISTA; k++) items.push(gr.filas[k] + (gr.dets[k] ? " <span class='d'>(" + html(gr.dets[k]) + ")</span>" : ""));
		res = items.join(", ");
		if (gr.filas.length > MAX_LISTA) mas = " ... y " + (gr.filas.length - MAX_LISTA) + " filas más (están en Guardar errores)";
	} else {
		var seg = compactarFilas(gr.filas);
		res = seg.slice(0, MAX_LISTA).join(", ");
		if (seg.length > MAX_LISTA) mas = " ... y más (están en Guardar errores)";
		if (algo && nuni === 1) for (var u in uni) res += " <span class='d'>&mdash; " + html(u) + "</span>";
	}
	return res + mas;
}

/** Planilla con errores: tarjetas + errores por tipo + detalle filtrable. */
function informeErrores(filas, nFil, nOk, nErr) {
	var h = "<div class='tarjetas'>" + tarjeta(nFil, "filas con datos") + tarjeta(nOk, "listas", "ok") + tarjeta(nErr, "con error", "er") + "</div>";
	h += "<div class='msg er'><b>No se crea ningún artículo hasta corregir " + (nErr === 1 ? "la fila con error" : "las " + nErr + " filas con error") + ".</b><br>" +
		"Proveedor: <b>" + html(prvTxt) + "</b><br>Corregí la planilla en Excel, guardala y volvé a tocar <b>Revisar planilla</b>. " +
		"Con <b>Guardar errores</b> te llevás la lista completa para abrirla en Excel.</div>";

	var grupos = agruparErrores(filas);
	h += "<h3>Qué hay que corregir (" + grupos.length + (grupos.length === 1 ? " tipo de error" : " tipos de error") + ")</h3>";
	for (var g = 0; g < grupos.length; g++) {
		var gr = grupos[g];
		h += "<div class='g'><span class='n'>" + gr.filas.length + "</span><b>" + html(gr.tipo) + "</b>" +
			"<div class='f'>" + (gr.filas.length === 1 ? "Fila: " : "Filas: ") + textoFilas(gr) + "</div></div>";
	}

	var cant = 0, detalle = "";
	for (var k = 0; k < filas.length && cant < MAX_DETALLE; k++) {
		var f = filas[k];
		if (f.errores.length === 0) continue;
		var pills = "", le = erroresDeFila(f);
		for (var e = 0; e < le.length; e++) pills += "<span class='p'>" + html(le[e].tipo + (le[e].det ? " (" + le[e].det + ")" : "")) + "</span>";
		detalle += "<tr><td class='r'>" + f.num + "</td><td>" + html(f.sku) + "</td><td>" + html(f.desc) + "</td><td>" + pills + "</td></tr>";
		cant++;
	}
	h += "<h3>Detalle de las filas con error" + (nErr > MAX_DETALLE ? " (las primeras " + MAX_DETALLE + " de " + nErr + ")" : "") + "</h3>";
	if (nErr > 12) {
		h += "<input id='q' placeholder='Buscar en el detalle: fila, SKU, descripción o error...' oninput='filtrar()'>";
	}
	h += "<table id='det'><thead><tr><th class='r'>Fila</th><th>SKU Propio</th><th>Descripción</th><th>Errores</th></tr></thead><tbody>" + detalle + "</tbody></table>";
	if (nErr > MAX_DETALLE) h += "<div class='nota'>Faltan " + (nErr - MAX_DETALLE) + " filas: la lista completa está en <b>Guardar errores</b>.</div>";
	h += "<script>function filtrar(){var q=document.getElementById('q').value.toLowerCase();var r=document.querySelectorAll('#det tbody tr');" +
		"for(var i=0;i<r.length;i++){r[i].style.display=r[i].textContent.toLowerCase().indexOf(q)<0?'none':'';}}</script>";
	return informeCuerpo(h);
}

/** Planilla sin errores: tarjetas + muestra de las primeras filas. */
function informeListo(filas, nFil) {
	var h = "<div class='tarjetas'>" + tarjeta(nFil, "filas con datos") + tarjeta(nFil, "listas", "ok") + tarjeta(0, "con error") + "</div>";
	h += "<div class='msg ok'><b>Todo en orden: se van a crear " + nFil + (nFil === 1 ? " artículo" : " artículos") + ".</b><br>Proveedor: <b>" + html(prvTxt) + "</b><br>" +
		"Tocá <b>Crear artículos</b>. Se crean todos o ninguno.</div>";
	return informeCuerpo(h + tablaMuestra(filas, nFil, "Muestra de las primeras filas"));
}

/** Terminada la creacion: tarjetas + primeros articulos creados. */
function informeCreado(filas, nFil) {
	var h = "<div class='tarjetas'>" + tarjeta(nFil, nFil === 1 ? "artículo creado" : "artículos creados", "ok") + "</div>";
	h += "<div class='msg ok'><b>Se " + (nFil === 1 ? "creó 1 artículo" : "crearon " + nFil + " artículos") + ".</b><br>Proveedor: <b>" + html(prvTxt) + "</b></div>";
	// S30-81: con el costo neto y el precio de la primera lista se ve al instante que el artículo quedó completo.
	h += "<h3>Primeros artículos creados</h3><table><thead><tr><th class='r'>Fila</th><th>SKU Propio</th><th>Descripción</th><th class='r'>Costo base</th><th class='r'>Costo neto</th><th class='r'>Precio lista " +
		(filas[0] && filas[0].precios && filas[0].precios.length > 0 ? html(filas[0].precios[0].lista) : "") + "</th></tr></thead><tbody>";
	for (var i = 0; i < filas.length && i < MAX_VISTA; i++) {
		var f = filas[i];
		h += "<tr><td class='r'>" + f.num + "</td><td>" + html(f.sku) + "</td><td>" + html(f.desc) + "</td><td class='r'>" + html(f.costoRaw) + "</td><td class='r'>" +
			html(f.cosNet || "") + "</td><td class='r'>" + html(f.precios && f.precios.length > 0 ? f.precios[0].pre : "") + "</td></tr>";
	}
	h += "</tbody></table>";
	if (nFil > MAX_VISTA) h += "<div class='nota'>... y " + (nFil - MAX_VISTA) + " filas más.</div>";
	return informeCuerpo(h);
}

function tablaMuestra(filas, nFil, titulo) {
	var h = "<h3>" + html(titulo) + "</h3><table><thead><tr><th class='r'>Fila</th><th>SKU Propio</th><th>Descripción</th><th>Categoría</th><th>Marca</th><th class='r'>Costo base</th></tr></thead><tbody>";
	for (var i = 0; i < filas.length && i < MAX_VISTA; i++) {
		var f = filas[i];
		h += "<tr><td class='r'>" + f.num + "</td><td>" + html(f.sku) + "</td><td>" + html(f.desc) + "</td><td>" + html(f.catRaw) +
			"</td><td>" + html(f.marRaw) + "</td><td class='r'>" + html(f.costoRaw) + "</td></tr>";
	}
	h += "</tbody></table>";
	if (nFil > MAX_VISTA) h += "<div class='nota'>... y " + (nFil - MAX_VISTA) + " filas más.</div>";
	return h;
}

// S30-81: si algo falla en el servidor (3er plano), alert() no se ve; el error vuelve en MSJ.
try {

/* ------------------------------- Proceso ---------------------------------- */

var ruta  = theRoot.varToString("SND");
var idPrv = trim(theRoot.varToString("ID_PRV"));
var modo  = trim(theRoot.varToString("MODO")).toUpperCase();
if (modo !== "VALIDAR") modo = "CREAR";   // "" = acción vieja ART_IMP_PLA

// S30-81 (ronda 2, E3 / RN-9): el permiso frena tambien en el servidor. Se mira ANTES de abrir la planilla; sin permiso no se lee ni se graba nada.
var perm = permisoAltaMasiva();

var nomPrv = nombreDe(PROY_DAT + "/ENT_M", idPrv, "NAME");
var prvTxt = idPrv + (nomPrv ? " - " + nomPrv : "");

/** Variables de salida. */
function terminar(ok, msj, informe, nFil, nOk, nErr, nAlt) {
	theRoot.setVar("OK", ok);
	theRoot.setVar("MSJ", msj);
	theRoot.setVar("INFORME", informe);
	theRoot.setVar("N_FIL", nFil);
	theRoot.setVar("N_OK", nOk);
	theRoot.setVar("N_ERR", nErr);
	theRoot.setVar("N_ALT", nAlt);
	theRoot.setVar("CSV_ERR", csvErr);   // S30-81: todos los errores en CSV para el boton Guardar errores
}

/** El fichero entero no sirve (estructura, otro proveedor, otras listas). */
function abortar(msg) {
	terminar(false, msg, informeHtml("No se puede usar esta planilla", COLOR_ERR, html(msg)), 0, 0, 1, 0);
	return null;
}

/** Lee y valida la planilla. Devuelve las filas con datos (cada una con sus
 *  errores) o null si el fichero entero no sirve (ya llamó a abortar). */
function validarFichero() {
	var binario = leerFicheroComoBinario(ruta);
	if (binario === null) return abortar("No se pudo leer el fichero: " + ruta);

	var workbook = parsearWorkbook(binario);
	var indiceHoja = workbook.SheetNames.indexOf(HOJA_DATOS);
	if (indiceHoja < 0) indiceHoja = 0;
	var hoja   = workbook.Sheets[workbook.SheetNames[indiceHoja]];
	var matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
	if (matriz.length === 0) return abortar("El fichero no tiene contenido.");

	var cabeceras = matriz[0];
	var idxCab = function (nombre) {
		for (var i = 0; i < cabeceras.length; i++) if (trim(cabeceras[i]) === nombre) return i;
		return -1;
	};
	var idxSku = idxCab(H_SKU_PROPIO), idxDesc = idxCab(H_DESC), idxCat = idxCab(H_CAT), idxMar = idxCab(H_MAR);
	var idxSkuP = idxCab(H_SKU_PRV), idxUnd = idxCab(H_UND), idxCosto = idxCab(H_COSTO), idxFin = idxCab(MARCA_FIN_BONIF);

	var faltan = [];
	if (idxSku   < 0) faltan.push(H_SKU_PROPIO);
	if (idxDesc  < 0) faltan.push(H_DESC);
	if (idxCat   < 0) faltan.push(H_CAT);
	if (idxMar   < 0) faltan.push(H_MAR);
	if (idxSkuP  < 0) faltan.push(H_SKU_PRV);
	if (idxUnd   < 0) faltan.push(H_UND);
	if (idxCosto < 0) faltan.push(H_COSTO);
	if (idxFin   < 0) faltan.push(MARCA_FIN_BONIF);
	if (faltan.length > 0) return abortar("No es la planilla de alta de artículos. Faltan columnas: " + faltan.join(", ") + ".");

	var bonifCols = [];
	for (var cc = idxCosto + 1; cc < idxFin; cc++) bonifCols.push({ col: cc, id: extraerCodigo(cabeceras[cc]) });
	var tarifaCols = [];
	for (var ct = idxFin + 1; ct < cabeceras.length; ct++) {
		if (trim(cabeceras[ct]) !== "") tarifaCols.push({ col: ct, id: extraerCodigo(cabeceras[ct]) });
	}

	/* G1: proveedor de A1 == ID_PRV (E15) */
	var provFichero = trim(celda(cabeceras, 0));
	if (provFichero !== idPrv) {
		var nomFich = nombreDe(PROY_DAT + "/ENT_M", provFichero, "NAME");
		return abortar("La planilla es del proveedor " + provFichero + (nomFich ? " - " + nomFich : "") +
			" y elegiste " + prvTxt + ". Generá la planilla para este proveedor o elegí el otro.");
	}

	/* S30-81: sin los datos de la empresa no se puede crear un articulo igual al manual: se avisa ya en la revision */
	var empChk = datosEmpresa();
	if (empChk.error !== "") return abortar(empChk.error);

	/* G2: columnas dinámicas == BD: bonificaciones del proveedor (E16) y listas NO reducidas (E17) */
	var bonifDB  = cargarIds(TABLA_BON, INDICE_BON_ENT, [idPrv], "ID");
	var tarifaDB = cargarTarifasNoReducidas();
	var bonifFileIds = [], tarifaFileIds = [];
	for (var i = 0; i < bonifCols.length; i++)  bonifFileIds.push(bonifCols[i].id);
	for (var j = 0; j < tarifaCols.length; j++) tarifaFileIds.push(tarifaCols[j].id);
	if (!mismosIds(bonifFileIds, bonifDB)) {
		return abortar("Las bonificaciones del proveedor cambiaron desde que se generó la planilla (planilla: " +
			bonifFileIds.length + ", hoy: " + bonifDB.length + "). Descargá la planilla de nuevo.");
	}
	if (!mismosIds(tarifaFileIds, tarifaDB)) {
		return abortar("Las listas de precios cambiaron desde que se generó la planilla (planilla: " +
			tarifaFileIds.length + ", hoy: " + tarifaDB.length + "). Descargá la planilla de nuevo.");
	}

	/* Repetidos dentro del fichero: SKU Propio y SKU proveedor (valor -> filas) */
	var filasSku = {}, filasSkuP = {};
	for (var rr = 1; rr < matriz.length; rr++) {
		var sp = trim(celda(matriz[rr], idxSku)), spp = trim(celda(matriz[rr], idxSkuP));
		if (sp !== "")  (filasSku[sp]   = filasSku[sp]   || []).push(rr + 1);
		if (spp !== "") (filasSkuP[spp] = filasSkuP[spp] || []).push(rr + 1);
	}
	var otras = function (lista, num) {
		var o = []; for (var k = 0; k < lista.length; k++) if (lista[k] !== num) o.push(lista[k]);
		return o.join(", ");
	};

	_nDatos = matriz.length - 1;   // S30-81 (ronda 2): decide si conviene precargar los SKU existentes

	/* Validación por fila: se juntan TODOS los errores de cada una (E20) */
	var filas = [];
	for (var r = 1; r < matriz.length; r++) {
		var fila = matriz[r], numFila = r + 1;
		var f = {
			num: numFila, errores: [],
			sku: trim(celda(fila, idxSku)), desc: trim(celda(fila, idxDesc)),
			catRaw: trim(celda(fila, idxCat)), marRaw: trim(celda(fila, idxMar)),
			skuProv: trim(celda(fila, idxSkuP)), undRaw: trim(celda(fila, idxUnd)),
			costoRaw: trim(celda(fila, idxCosto)), bonifVals: [], tarifaVals: []
		};

		// Fila completamente vacía -> se ignora (E31).
		var algo = (f.sku || f.desc || f.catRaw || f.marRaw || f.skuProv || f.undRaw || f.costoRaw);
		for (var b0 = 0; b0 < bonifCols.length && !algo; b0++)  if (trim(celda(fila, bonifCols[b0].col)))  algo = true;
		for (var t0 = 0; t0 < tarifaCols.length && !algo; t0++) if (trim(celda(fila, tarifaCols[t0].col))) algo = true;
		if (!algo) continue;

		// F1: obligatorios (RN-2: un % vacío no es 0)
		var faltantes = [];
		if (f.sku === "")      faltantes.push(H_SKU_PROPIO);
		if (f.desc === "")     faltantes.push(H_DESC);
		if (f.catRaw === "")   faltantes.push(H_CAT);
		if (f.marRaw === "")   faltantes.push(H_MAR);
		if (f.skuProv === "")  faltantes.push(H_SKU_PRV);
		if (f.undRaw === "")   faltantes.push(H_UND);
		if (f.costoRaw === "") faltantes.push(H_COSTO);
		for (var b1 = 0; b1 < bonifCols.length; b1++)  if (trim(celda(fila, bonifCols[b1].col)) === "")  faltantes.push("bonif. " + bonifCols[b1].id);
		for (var t1 = 0; t1 < tarifaCols.length; t1++) if (trim(celda(fila, tarifaCols[t1].col)) === "") faltantes.push("lista " + tarifaCols[t1].id);
		if (faltantes.length > 0) f.errores.push("Falta: " + faltantes.join(", "));

		// Costo (E29)
		f.costo = aNumero(celda(fila, idxCosto));   // S30-81: se usa la celda original: si Excel la dejo numerica (1234.5) NO se le sacan los puntos
		if (f.costoRaw !== "" && isNaN(f.costo)) f.errores.push("Costo no numérico ('" + f.costoRaw + "')");
		else if (f.costoRaw !== "" && f.costo < 0) f.errores.push("Costo negativo");
		// S30-81 (ronda 2): con costo 0 el articulo queda con costo neto y precios en 0 (inutilizable y no sale en el listado): se rechaza.
		else if (f.costoRaw !== "" && f.costo === 0) f.errores.push("Costo base debe ser mayor que 0");

		// F5: maestros existentes, pegar un valor saltea el desplegable (E26)
		f.cat = extraerCodigo(f.catRaw); f.mar = extraerCodigo(f.marRaw); f.und = extraerCodigo(f.undRaw);
		if (f.catRaw !== "" && !existeEnMaestro(TABLA_FAM, "ID", "ID", f.cat)) f.errores.push("Categoría inexistente ('" + f.catRaw + "')");
		if (f.marRaw !== "" && !existeEnMaestro(TABLA_MAR, "ID", "ID", f.mar)) f.errores.push("Marca inexistente ('" + f.marRaw + "')");
		if (f.undRaw !== "" && !existeEnMaestro(TABLA_UND, "ID", "ID", f.und)) f.errores.push("Unidad inexistente ('" + f.undRaw + "')");

		// F3: bonificaciones numéricas entre 0 y 100 (RN-6, E27, E28)
		for (var b = 0; b < bonifCols.length; b++) {
			var crudo = trim(celda(fila, bonifCols[b].col));
			if (crudo === "") continue;
			var pv = aNumero(celda(fila, bonifCols[b].col));   // S30-81: celda original (ver costo)
			if (isNaN(pv))           f.errores.push("Bonif. " + bonifCols[b].id + " no numérica");
			else if (pv > MAX_BONIF) f.errores.push("Bonif. " + bonifCols[b].id + " (" + pv + "%) supera el " + MAX_BONIF + "%");
			else if (pv < 0)         f.errores.push("Bonif. " + bonifCols[b].id + " (" + pv + "%) negativa");
			else f.bonifVals.push({ id: bonifCols[b].id, pct: pv });
		}
		// Rentabilidad por lista: numérica
		for (var t = 0; t < tarifaCols.length; t++) {
			var crudoT = trim(celda(fila, tarifaCols[t].col));
			if (crudoT === "") continue;
			var pr = aNumero(celda(fila, tarifaCols[t].col));   // S30-81: celda original (ver costo)
			if (isNaN(pr)) f.errores.push("Lista " + tarifaCols[t].id + " no numérica");
			else f.tarifaVals.push({ id: tarifaCols[t].id, pct: pr });
		}

		// F4: SKU Propio único, en el fichero (E23) y en la base (E24)
		if (f.sku !== "" && filasSku[f.sku].length > 1) f.errores.push("SKU Propio repetido (fila " + otras(filasSku[f.sku], numFila) + ")");
		if (f.sku !== "") {
			var chkArt = artPorSku(f.sku);
			if (chkArt) {
				f.errores.push("SKU Propio ya existe (artículo " + chkArt.id + " - " + chkArt.name + ")");
			}
		}
		// F2 / F6: SKU proveedor único para el proveedor, en la base (E25) y en el fichero
		if (f.skuProv !== "" && filasSkuP[f.skuProv].length > 1) f.errores.push("SKU proveedor repetido (fila " + otras(filasSkuP[f.skuProv], numFila) + ")");
		if (f.skuProv !== "") {
			if (existeSkuPrv(f.skuProv)) {
				f.errores.push("SKU proveedor ya cargado para este proveedor");
			}
		}
		filas.push(f);
	}
	return filas;
}

/* S30-81 (falla 1): el alta manual completa por 'contenido inicial' datos que un alta por script no completa solos:
 *   EMP / EMP_DIV (empresa y division de la sesion: variable global EMP_ID, que es la division),
 *   REG_IVA_VTA / REG_IVA_COM, TIP_ING_VTA / TIP_EGR_COM (la division manda si los tiene, si no la empresa),
 *   NO_STK, FPG_M (forma de pago de ventas de la empresa) y VTA_TAR_G (lista principal).
 * Sin EMP el articulo queda sin IVA, sin forma de pago y no aparece en el listado (que filtra por empresa). */
var _empDef = null;

function leerPorId(tabla, id) {
	if (esVacia(id) || String(id) === "0") return null;
	var r = new VRegister(theRoot);
	r.setTable(tabla, false);
	if (r.readRegister("ID", [id], VRegister.SearchThis) && r.isOK()) return r;
	return null;
}

function datosEmpresa() {
	if (_empDef) return _empDef;
	var d = { error: "" };
	var tabEmp = PROY_DAT + "/EMP_M";
	var idDiv = trim(theApp.globalVarToString(PROY_DAT + "/EMP_ID"));
	var rd = leerPorId(tabEmp, idDiv);
	if (!rd) {
		// Sin variable global (proceso en el servidor): la primera division, o sea la que no es la empresa.
		var le = new VRegisterList(theRoot);
		le.setTable(tabEmp);
		if (le.load("ID", [])) {
			for (var i = 0; i < le.size() && !rd; i++) {
				if (!esVerdadero(le.readAt(i), "ES_EMP")) rd = le.readAt(i);
			}
		}
	}
	if (!rd) { d.error = "No se pudo determinar la empresa y la division para crear los articulos."; _empDef = d; return d; }
	d.div = rd.fieldToString("ID");
	var re = leerPorId(tabEmp, trim(rd.fieldToString("EMP"))) || rd;
	d.emp = re.fieldToString("ID");
	d.ivaVta = re.fieldToString("REG_IVA_VTA");
	d.ivaCom = re.fieldToString("REG_IVA_COM");
	d.noStk = esVerdadero(re, "NO_STK");
	var tiv = trim(rd.fieldToString("TIP_ING_VTA")), teg = trim(rd.fieldToString("TIP_EGR_COM"));
	d.tipIng = d.noStk ? "" : ((parseFloat(tiv) > 0) ? tiv : re.fieldToString("TIP_ING_VTA"));
	d.tipEgr = d.noStk ? "" : ((parseFloat(teg) > 0) ? teg : re.fieldToString("TIP_EGR_COM"));
	d.fpg = re.fieldToString("FPG_VTA");
	// Lista de precios principal (funcion OBT_VTA_TAR_PRN: VTA_TAR_G por el indice PRN).
	d.tarPrn = "";
	var lt = new VRegisterList(theRoot);
	lt.setTable(TABLA_VTA_TAR);
	if (lt.load("PRN", []) && lt.size() > 0) d.tarPrn = lt.readAt(0).fieldToString("ID");
	_empDef = d;
	return d;
}

/** Crea un artículo (ART_M + ART_PRV_G + ART_BON_M + rentabilidades). Devuelve "" o el error. */
function crearArticulo(f) {
	// 1) ART_M (su trigger de alta autocrea VTA_TAR_ART_G en las listas no reducidas)
	var art = new VRegister(theRoot);
	art.setTable(TABLA_ART, true);
	art.setField("REF",         f.sku);
	art.setField("NAME",        f.desc);
	art.setField("FAM",         f.cat);
	art.setField("MAR_M",       f.mar);
	art.setField("UND_MED_INV", f.und);
	art.setField("PRV",         idPrv);
	// S30-81: mismos datos por defecto que el alta manual (ver datosEmpresa)
	var emp = datosEmpresa();
	if (emp.error !== "") return emp.error;
	art.setField("EMP",         emp.emp);
	art.setField("EMP_DIV",     emp.div);
	art.setField("REG_IVA_VTA", emp.ivaVta);
	art.setField("REG_IVA_COM", emp.ivaCom);
	art.setField("NO_STK",      emp.noStk ? 1 : 0);
	art.setField("TIP_ING_VTA", emp.tipIng);
	art.setField("TIP_EGR_COM", emp.tipEgr);
	art.setField("FPG_M",       emp.fpg);
	if (emp.tarPrn !== "") art.setField("VTA_TAR_G", emp.tarPrn);
	art.setField("UND_MED_COM", f.und);
	art.setField("UND_MED_VTA", f.und);
	art.setField("UND_MED_CBO_COS", 1);
	art.setField("UND_MED_DES", 1);
	art.setField("FAC_CNV_UND_COM_VS_INV", 1);
	art.setField("FAC_CNV_UND_VTA_VS_INV", 1);
	art.setField("FAC_CNV_UND_CBO_MAS_VS_INV", 1);
	art.setField("PESO", 1);
	art.setField("COE", 1);
	art.setField("CON_STK", 3);
	// S30-81 (ronda 2): CAL es alfabetico de 1 (calidad "1"); grabado como numero quedaba vacio.
	art.setField("CAL", "1");
	var rf = leerPorId(TABLA_FAM, f.cat);
	if (rf) art.setField("TPV_VIS", rf.fieldToString("TPV_VIS"));
	art.addRegister();
	if (art.errorNumber() !== 0) return "crear el artículo: [" + art.errorNumber() + "] " + art.errorMessage();
	var idArt = art.fieldToString("ID");
	if (esVacia(idArt)) return "el artículo se creó pero su ID llegó vacío.";

	// 2) ART_PRV_G (proveedor principal con su costo)
	var ap = new VRegister(theRoot);
	ap.setTable(TABLA_ART_PRV, true);
	ap.setField("ART", idArt);
	ap.setField("PRV", idPrv);
	ap.setField("REF_PRV", f.skuProv);   // S30-81: el campo es REF_PRV; "REF" no existe en ART_PRV_G y el SKU se perdía
	ap.setField("COS", 0);   // S30-81: el costo real se graba en el paso 3b, modificando la ficha
	ap.setField("PRN", 1);
	ap.addRegister();
	if (ap.errorNumber() !== 0) return "crear la relación con el proveedor: [" + ap.errorNumber() + "] " + ap.errorMessage();
	var idArtPrv = ap.fieldToString("ID");
	if (esVacia(idArtPrv)) return "la relación con el proveedor se creó pero su ID llegó vacío.";

	// 3) ART_BON_M (una por bonificación, incluidas las de 0%)
	for (var b = 0; b < f.bonifVals.length; b++) {
		var rb = new VRegister(theRoot);
		rb.setTable(TABLA_ART_BON, true);
		rb.setField("ART_PRV_G", idArtPrv);
		rb.setField("BON_M",     f.bonifVals[b].id);
		rb.setField("BON",       f.bonifVals[b].pct);
		rb.addRegister();
		if (rb.errorNumber() !== 0) return "crear la bonificación " + f.bonifVals[b].id + ": [" + rb.errorNumber() + "] " + rb.errorMessage();
	}

	// 3b) S30-81: se graba el costo MODIFICANDO la relación con el proveedor. El costo neto y los precios los calcula
	// CHG_COS_ART_PRV, que solo corre desde el trigger de modificación de ART_PRV_G (cambio de COS) o desde los de
	// ART_BON_M. Con un proveedor sin bonificaciones, grabarlo en el alta dejaba costo neto 0 y precios 0.
	var lstAp = new VRegisterList(theRoot);
	lstAp.setTable(TABLA_ART_PRV);
	if (!lstAp.load("ID", [idArtPrv]) || lstAp.size() < 1) return "releer la relación con el proveedor para grabar el costo.";
	var rc = lstAp.readLockingAt(0);
	rc.setField("COS", f.costo);
	rc.modifyRegister();
	if (rc.errorNumber() !== 0) return "grabar el costo: [" + rc.errorNumber() + "] " + rc.errorMessage();
	// S30-81: si despues de grabar el costo el costo neto sigue en 0 (salvo una bonificacion del 100%), el recalculo no corrio:
	// se revierte todo en vez de dejar articulos incompletos (costo neto 0 y precios 0) sin avisar.
	var hay100 = false;
	for (var b100 = 0; b100 < f.bonifVals.length; b100++) if (parseFloat(f.bonifVals[b100].pct) >= 100) hay100 = true;
	var lstCn = new VRegisterList(theRoot);
	lstCn.setTable(TABLA_ART_PRV);
	if (lstCn.load("ID", [idArtPrv]) && lstCn.size() > 0) {
		f.cosNet = String(lstCn.readAt(0).fieldToString("COS_NET"));
		if (f.costo > 0 && !hay100 && !/[1-9]/.test(f.cosNet)) {
			return "el costo neto quedó en 0 tras grabar el costo (no corrió el recálculo de CHG_COS_ART_PRV).";
		}
	}

	// 4) VTA_TAR_ART_G: las autocreó el alta; se fija la rentabilidad de cada lista
	if (f.tarifaVals.length > 0) {
		var pctPorTar = {};
		for (var t = 0; t < f.tarifaVals.length; t++) pctPorTar[String(f.tarifaVals[t].id)] = f.tarifaVals[t].pct;
		var lstTar = new VRegisterList(theRoot);
		lstTar.setTable(TABLA_VTA_TAR_ART);
		if (!lstTar.load(INDICE_VTA_ART, [idArt])) return "no se pudieron cargar las listas de precios del artículo.";
		var aplicadas = 0;
		for (var i = 0; i < lstTar.size(); i++) {
			var rv = lstTar.readLockingAt(i);
			var vt = rv.fieldToString(CAMPO_VTA_TAR);
			if (!pctPorTar.hasOwnProperty(vt)) continue;
			rv.setField(CAMPO_POR_REN, pctPorTar[vt]);
			rv.modifyRegister();
			if (rv.errorNumber() !== 0) return "grabar la rentabilidad de la lista " + vt + ": [" + rv.errorNumber() + "] " + rv.errorMessage();
			aplicadas++;
		}
		if (aplicadas < f.tarifaVals.length) {
			return "el alta no creó todas las listas de precios del artículo (esperadas " + f.tarifaVals.length + ", encontradas " + aplicadas + ").";
		}
		// S30-81: se relee el precio de cada lista (lo calcula el trigger de la rentabilidad). Si con costo > 0 y rentabilidad >= 0
		// el precio quedó en 0, el cálculo no corrió: se revierte todo en vez de dejar artículos sin precio.
		var lstPre = new VRegisterList(theRoot);
		lstPre.setTable(TABLA_VTA_TAR_ART);
		f.precios = [];
		if (lstPre.load(INDICE_VTA_ART, [idArt])) {
			for (var q = 0; q < lstPre.size(); q++) {
				var rq = lstPre.readAt(q), lq = String(rq.fieldToString(CAMPO_VTA_TAR)), pq = String(rq.fieldToString("PRE"));
				if (!pctPorTar.hasOwnProperty(lq)) continue;
				f.precios.push({ lista: lq, pre: pq });
				if (f.costo > 0 && !hay100 && parseFloat(pctPorTar[lq]) >= 0 && !/[1-9]/.test(pq)) {
					return "el precio de la lista " + lq + " quedó en 0 (no corrió el cálculo de la rentabilidad).";
				}
			}
		}
	}
	return "";
}

/* --- Validar (siempre) y, en modo CREAR sin errores, crear ----------------- */
var filas = null;
if (perm.ok) filas = validarFichero();
else terminar(false, perm.msj, informeHtml(perm.msj, COLOR_ERR, "Pedile el permiso a un administrador."), 0, 0, 1, 0);

if (filas) {
	var nFil = filas.length, nErr = 0;
	for (var i = 0; i < filas.length; i++) if (filas[i].errores.length > 0) nErr++;
	var nOk = nFil - nErr;

	if (nFil === 0) {
		terminar(false, "La planilla no tiene ningún artículo cargado.",
			informeHtml("La planilla no tiene ningún artículo cargado", COLOR_ERR, "Completá al menos una fila y volvé a elegirla."), 0, 0, 0, 0);
	} else if (nErr > 0) {
		// S30-81 (UX): el mensaje de texto es corto (las primeras filas); el detalle esta en el informe y en el CSV.
		csvErr = armarCsv(filas);
		var lineas = [], k = 0;
		for (k = 0; k < filas.length && lineas.length < 8; k++) if (filas[k].errores.length > 0) lineas.push("Fila " + filas[k].num + ": " + filas[k].errores.join("; "));
		terminar(false, "Hay " + nErr + " fila(s) con errores de " + nFil + ". No se crea ningún artículo hasta corregirlas." + "\n\n" + lineas.join("\n") +
			(nErr > lineas.length ? "\n" + "... y " + (nErr - lineas.length) + " filas más (ver Revisar planilla o Guardar errores)." : ""),
			informeErrores(filas, nFil, nOk, nErr), nFil, nOk, nErr, 0);
	} else if (modo === "VALIDAR") {
		terminar(true, "Se van a crear " + nFil + " artículos. Proveedor: " + prvTxt, informeListo(filas, nFil), nFil, nOk, 0, 0);
	} else {
		/* Crear: todo o nada, en una sola transacción (RN-8, E19) */
		theRoot.beginTrans("Alta masiva de artículos - proveedor " + idPrv);
		var errCrear = "";
		for (var m = 0; m < filas.length && errCrear === ""; m++) {
			var e = crearArticulo(filas[m]);
			if (e !== "") errCrear = "Fila " + filas[m].num + ": " + e;
		}
		if (errCrear === "") {
			theRoot.commitTrans();
			terminar(true, "Se crearon " + nFil + " artículos. Proveedor: " + prvTxt, informeCreado(filas, nFil), nFil, 0, 0, nFil);   // N_OK=0: ya no queda nada por crear (apaga el botón)
		} else {
			theRoot.rollbackTrans();
			terminar(false, "No se creó ningún artículo. " + errCrear,
				informeHtml("No se creó ningún artículo", COLOR_ERR, "Al grabar falló la " + html(errCrear) + " Se deshizo todo para no dejar la carga a medias."), nFil, 0, 1, 0);
		}
	}
}

mostrarLog();

} catch (e) {
	theRoot.setVar("OK", false);
	theRoot.setVar("MSJ", "S30-81: error inesperado en importarPlantillaAltaArt.js: " + e + (e && e.lineNumber ? " (línea " + e.lineNumber + ")" : ""));
	try { theRoot.setVar("INFORME", "<p style='color:#b3222e'><b>Error inesperado</b></p><p>" + String(e) + "</p>"); } catch (e2) {}
}
