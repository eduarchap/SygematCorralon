/* ===========================================================================
 * importarPlantillaConCombos.js
 *
 * Importa la plantilla generada por generarPlantillaConCombos.js y aplica los
 * cambios sobre los artículos, emparejando cada fila por su columna ID.
 *
 * Premisas (acordadas con el negocio):
 *   - La columna ID SIEMPRE viene primera y es la clave de emparejamiento.
 *   - El Excel puede traer SOLO ALGUNAS de las columnas exportables (el usuario
 *     pudo exportar un subconjunto). Por eso NO se asume un layout fijo: se lee
 *     la cabecera y solo se actualizan los campos cuyas columnas estén presentes.
 *   - Las columnas combo (Categoría, Marca, Línea, Proveedor, Unidad de medida)
 *     contienen "código - nombre"; se importa solo el CÓDIGO (lo previo a " - ").
 *   - "No reserva stock" -> campo ASG_SIE del artículo (columna plana).
 *   - "SKU proveedor" NO es un campo del artículo: es REF_PRV de ART_PRV_G
 *     (índice ART_PRV = [ ID del artículo, PRV ]).
 *
 * Reglas de negocio:
 *   - RN-2: celda VACÍA = "no tocar". NUNCA se vacía un dato desde la planilla
 *     (la columna simplemente se omite). Para vaciar, se edita la ficha.
 *   - RN-3: un valor de combo solo se acepta si existe en su maestra. Un valor
 *     de lista inexistente descarta la fila.
 *   - RN-4: aplicación PARCIAL. Se graba lo válido y se informa lo que no se
 *     pudo aplicar. La fila completa solo se descarta cuando falla el ID
 *     (ausente o artículo no encontrado) o cuando un valor de lista no existe.
 *   - RN-7: el código de barras NO es único (no se valida duplicidad).
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta absoluta del .xlsx a importar.
 *   PAR_INDICE_HOJA         {number}  (Opcional) Índice de hoja. Por defecto se
 *                                     usa la hoja "Datos" si existe, si no la 0.
 *
 * Variables de salida:
 *   RET_FILAS_OK    {number}  Filas aplicadas por completo.
 *   RET_FILAS_PARC  {number}  Filas aplicadas parcialmente (RN-4).
 *   RET_FILAS_ERR   {number}  Filas descartadas (sin ID / ID no encontrado / valor de lista inexistente).
 *   MSJ             {string}  Detalle de incidencias.
 *
 * Dependencias (deben incluirse antes):
 *   xlsx.full.min.js, fichero_utils.js, excel_utils.js, log_utils.js
 * =========================================================================== */

#include "(CurrentProject)/excel/lib/xlsx.full.min.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_utils.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"

/* --------------------------- Configuración -------------------------------- */

var PROY_DAT = "sygemat_corralon_dat";

// Referencia de la tabla de artículos (la que se exporta desde ART_SEL).
var TABLA_ART = PROY_DAT + "/ART_M";

var CAMPO_ID  = "ID";   // campo clave del artículo
var INDICE_ID = "ID";   // índice por el que se localiza el artículo

// SKU de proveedor: NO es un campo del artículo. Vive en ART_PRV_G y se
// localiza por el índice ART_PRV = [ ID del artículo, PRV (proveedor del art.) ].
// Al importar se actualiza REF_PRV de ese registro.
var TABLA_ART_PRV  = PROY_DAT + "/ART_PRV_G";
var INDICE_ART_PRV = "ART_PRV";
var CAMPO_PRV      = "PRV";   // proveedor del artículo

var HOJA_DATOS = "Datos";

/* Mapeo cabecera-del-Excel -> campo del artículo.
 *
 * Debe reflejar las cabeceras de generarPlantillaConCombos.js. El lookup
 * reconoce TANTO la cabecera "amigable" (export actual) COMO el id de campo
 * (por si algún Excel antiguo usaba el id como cabecera), así que la
 * importación es tolerante a ambos formatos.
 *
 *   tipo "plano" -> se escribe el valor tal cual.
 *   tipo "combo" -> se escribe solo el código (lo previo a " - ").
 */
var MAPEO = [
	{ cabecera: "Nombre",          campoArt: "NAME",        tipo: "plano" },
	{ cabecera: "Categoria",       campoArt: "FAM",         tipo: "combo", tabla: PROY_DAT + "/FAM_M",     indice: "ID",        campoCod: "ID" },
	{ cabecera: "Marca",           campoArt: "MAR_M",       tipo: "combo", tabla: PROY_DAT + "/MAR_M",     indice: "ID",        campoCod: "ID" },
	{ cabecera: "Linea",           campoArt: "LIN_M",       tipo: "combo", tabla: PROY_DAT + "/LIN_M",     indice: "ID",        campoCod: "ID" },
	{ cabecera: "Proveedor",       campoArt: "PRV",         tipo: "combo", tabla: PROY_DAT + "/ENT_M",     indice: "ID_ES_PRV", campoCod: "ID" },
	// SKU proveedor -> ART_PRV_G.REF_PRV (relación art.-proveedor), NO campo del artículo.
	{ cabecera: "SKU proveedor",   tipo: "relacion", campoRet: "REF_PRV", aliases: ["SKU Fabricante"] },
	{ cabecera: "Codigo Barra",    campoArt: "COD_BAR",     tipo: "plano" },
	{ cabecera: "Unidad medida",   campoArt: "UND_MED_INV", tipo: "combo", tabla: PROY_DAT + "/UND_MED_M", indice: "ID",        campoCod: "ID" },
	{ cabecera: "No reserva stock", campoArt: "ASG_SIE",    tipo: "plano" }
];

/* ----------------------------- Utilidades --------------------------------- */

/** Construye el índice de búsqueda cabecera|campoArt|alias -> definición. */
function construirLookup() {
	var lk = {};
	for (var i = 0; i < MAPEO.length; i++) {
		var m = MAPEO[i];
		lk[m.cabecera] = m;
		if (m.campoArt) lk[m.campoArt] = m;          // también por id de campo
		if (m.aliases) {
			for (var j = 0; j < m.aliases.length; j++) lk[m.aliases[j]] = m;
		}
	}
	return lk;
}

/**
 * Extrae el código de un valor "código - nombre".
 * Usa el PRIMER " - " como separador (los nombres pueden contener guiones).
 */
function extraerCodigo(valor) {
	if (valor == null) return "";
	var s = String(valor);
	var p = s.indexOf(" - ");
	return (p === -1 ? s : s.substring(0, p)).replace(/^\s+|\s+$/g, "");
}

/** Normaliza la clave ID: numérica si es todo dígitos, si no texto. */
function claveId(valor) {
	if (typeof valor === "number") return valor;
	var s = String(valor).replace(/^\s+|\s+$/g, "");
	if (/^\d+$/.test(s)) return parseInt(s, 10);
	return s;
}

/** ¿La celda se considera vacía? */
function esVacia(valor) {
	return valor == null || String(valor).replace(/^\s+|\s+$/g, "") === "";
}

/** Recorta espacios. */
function trim(valor) {
	return String(valor == null ? "" : valor).replace(/^\s+|\s+$/g, "");
}

/* --- RN-3: validación de valores de lista contra la maestra --------------- *
 * Para cada combo se carga UNA vez el conjunto de códigos válidos de su tabla
 * maestra y se cachea. Así la comprobación de existencia es por comparación de
 * texto (sin depender del tipo de clave) y no repite lecturas por fila.        */
var _setsMaestro = {};

function setMaestro(def) {
	var clave = def.tabla + "|" + def.indice;
	if (_setsMaestro[clave]) return _setsMaestro[clave];

	var set = {};
	var lista = new VRegisterList(theRoot);
	lista.setTable(def.tabla);
	if (!lista.load(def.indice, [])) {
		logError("No se pudo cargar la maestra " + def.tabla + " (índice " + def.indice + ") para validar la lista.");
	} else {
		for (var i = 0; i < lista.size(); i++) {
			set[lista.readAt(i).fieldToString(def.campoCod)] = true;
		}
	}
	_setsMaestro[clave] = set;
	return set;
}

/** RN-3: ¿el código existe en la maestra del combo? */
function existeEnMaestro(def, codigo) {
	return setMaestro(def).hasOwnProperty(String(codigo));
}

/* ------------------------------- Proceso ---------------------------------- */

var ruta = theRoot.varToString("SND");

var okCount   = 0;   // filas aplicadas por completo
var parcCount = 0;   // filas aplicadas parcialmente (RN-4)
var errCount  = 0;   // filas descartadas (sin ID / ID no encontrado / lista inexistente)

var binario = leerFicheroComoBinario(ruta);

if (binario === null) {
	logError("No se pudo leer el fichero: " + ruta);
} else {
	var workbook = parsearWorkbook(binario);

	// Elegir hoja: "Datos" si existe; si no, PAR_INDICE_HOJA o 0.
	var indiceHoja = workbook.SheetNames.indexOf(HOJA_DATOS);
	if (indiceHoja < 0) {
		indiceHoja = parseInt(theRoot.varToString("PAR_INDICE_HOJA")) || 0;
	}

	// Filas como objetos { cabecera: valor }. defval:"" -> toda columna presente
	// aparece como clave en cada fila (clave = cabecera de su columna).
	var filas  = hojaAJson(workbook, indiceHoja);
	var lookup = construirLookup();

	for (var f = 0; f < filas.length; f++) {
		var fila    = filas[f];
		var numFila = f + 2;   // fila real en Excel (1-based, +1 por cabecera)

		// 1) RN-4: sin ID -> se descarta la fila completa.
		if (!fila.hasOwnProperty(CAMPO_ID) || esVacia(fila[CAMPO_ID])) {
			logError("Fila " + numFila + ": sin ID, fila descartada.");
			errCount++;
			continue;
		}
		var id = claveId(fila[CAMPO_ID]);

		// 2) Clasificar columnas presentes (RN-2: celda vacía = NO tocar, se omite).
		//    Combos: validar contra la maestra (RN-3). Relaciones (SKU): diferir.
		var camposArt    = [];   // { campo, valor }  (plano + combo válidos)
		var relaciones   = [];   // { def, valor }
		var listaInvalida = [];  // RN-3: valores de lista inexistentes

		for (var key in fila) {
			if (!fila.hasOwnProperty(key)) continue;
			if (key === CAMPO_ID) continue;           // la clave no se modifica

			var def = lookup[key];
			if (!def) continue;                        // columna desconocida -> ignorar

			var bruto = fila[key];
			if (esVacia(bruto)) continue;              // RN-2: vacío = no tocar

			if (def.tipo === "relacion") {
				relaciones.push({ def: def, valor: trim(bruto) });
			} else if (def.tipo === "combo") {
				var cod = extraerCodigo(bruto);
				if (existeEnMaestro(def, cod)) {
					camposArt.push({ campo: def.campoArt, valor: cod });
				} else {
					listaInvalida.push(def.cabecera + " ('" + cod + "')");
				}
			} else {
				camposArt.push({ campo: def.campoArt, valor: trim(bruto) });
			}
		}

		// 3) RN-3/RN-4: si algún valor de lista no existe -> descartar la fila.
		if (listaInvalida.length > 0) {
			logError("Fila " + numFila + ": valor(es) de lista inexistente(s): " +
				listaInvalida.join(", ") + ". Fila descartada.");
			errCount++;
			continue;
		}

		// 4) Transacción: localizar el artículo (RN-4: si no existe -> descartar).
		theRoot.beginTrans("Importar artículo " + id);

		var reg = new VRegister(theRoot);
		reg.setTable(TABLA_ART, false);

		if (!reg.readRegister(INDICE_ID, [id], VRegister.SearchThis) || !reg.isOK()) {
			theRoot.rollbackTrans();
			logError("Fila " + numFila + ": artículo ID=" + id + " no encontrado. Fila descartada.");
			errCount++;
			continue;
		}

		// 5) RN-4: aplicar lo válido; acumular lo que NO se pudo aplicar.
		var noAplicado = [];

		// 5a) Campos del artículo (plano + combo) en un único modifyRegister.
		if (camposArt.length > 0) {
			for (var ci = 0; ci < camposArt.length; ci++) {
				reg.setField(camposArt[ci].campo, camposArt[ci].valor);
			}
			reg.modifyRegister();
			if (reg.errorNumber() !== 0) {
				noAplicado.push("datos del artículo (" + reg.errorMessage() + ")");
			}
		}

		// 5b) SKU proveedor -> ART_PRV_G.REF_PRV por [ ID, PRV ]. No descarta la
		//     fila: si no se puede, se informa y se conserva lo ya aplicado.
		if (relaciones.length > 0) {
			var prv = reg.fieldToString(CAMPO_PRV);
			for (var rIdx = 0; rIdx < relaciones.length; rIdx++) {
				var rel = relaciones[rIdx];
				if (esVacia(prv)) {
					noAplicado.push("SKU proveedor (el artículo no tiene proveedor/PRV)");
					continue;
				}
				var rp = new VRegister(theRoot);
				rp.setTable(TABLA_ART_PRV, false);
				if (rp.readRegister(INDICE_ART_PRV, [claveId(id), claveId(prv)], VRegister.SearchThis) && rp.isOK()) {
					rp.setField(rel.def.campoRet, rel.valor);
					rp.modifyRegister();
					if (rp.errorNumber() !== 0) {
						noAplicado.push("SKU proveedor (" + rp.errorMessage() + ")");
					}
				} else {
					noAplicado.push("SKU proveedor (no existe relación ART_PRV [ID=" + id + ", PRV=" + prv + "])");
				}
			}
		}

		// 6) Confirmar siempre lo válido (RN-4). Informar lo no aplicado.
		theRoot.commitTrans();
		if (noAplicado.length === 0) {
			okCount++;
		} else {
			parcCount++;
			logError("Fila " + numFila + ": ID=" + id + " aplicado parcialmente. No se pudo aplicar: " +
				noAplicado.join("; ") + ".");
		}
	}

	log("Importación finalizada. OK=" + okCount + "  Parciales=" + parcCount + "  Descartadas=" + errCount);
}

theRoot.setVar("RET_FILAS_OK",   okCount);
theRoot.setVar("RET_FILAS_PARC", parcCount);
theRoot.setVar("RET_FILAS_ERR",  errCount);
theRoot.setVar("MSJ" , _log_lineas.join("\n"));
