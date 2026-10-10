/* ===========================================================================
 * importarPlantillaAuxC.js
 *
 * Importa la plantilla generada por generarPlantillaAuxC.js y CREA o MODIFICA
 * los registros de AUX_C (upsert), emparejando por la clave del índice "ID".
 *
 * Puntos clave del negocio:
 *   - La columna oculta PGC_ORIG decide la operación:
 *       * PGC_ORIG CON contenido -> MODIFICACIÓN. Se localiza por [PGC_ORIG, ID]
 *         (aunque el usuario haya cambiado el PGC en el desplegable) y se
 *         actualiza NAME y el puntero PGC. Si no existe el registro original,
 *         se cuenta como error.
 *       * PGC_ORIG VACÍO -> ALTA. Antes de crear se comprueba que NO exista ya
 *         la cuenta [PGC_visible, ID]; si existe, NO se hace nada y se cuenta
 *         como error; si no existe, se da de alta.
 *   - Clave compuesta: el índice "ID" de AUX_C se resuelve con un array de DOS
 *     partes -> [ ID del PGC (puntero), ID propio ]. Ambas ALFANUMÉRICAS (texto).
 *   - Columna PGC (combo): contiene "código - nombre"; se usa solo el CÓDIGO.
 *   - Si PGC viene VACÍO se asigna VACÍO (puntero sin valor), NUNCA 0.
 *   - La columna PGC_ORIG nunca se graba como campo.
 *
 * Entorno: motor JS embebido de Velneo V35 (Qt5).
 *
 * Variables de entrada:
 *   PAR_RUTA_FICHERO_EXCEL  {string}  Ruta absoluta del .xlsx a importar.
 *   PAR_INDICE_HOJA         {number}  (Opcional) Índice de hoja; por defecto la
 *                                     hoja "Datos" si existe, si no la 0.
 *
 * Variables de salida:
 *   RET_FILAS_ALTA  {number}  Registros creados.
 *   RET_FILAS_MOD   {number}  Registros modificados.
 *   RET_FILAS_ERR   {number}  Filas con error.
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

var TABLA_AUX = PROY_DAT + "/AUX_C";   // tabla destino

var CAMPO_ID       = "ID";        // campo/columna clave propia
var CAMPO_PGC      = "PGC";       // puntero a PGC_C (valor NUEVO, editable)
var CAMPO_PGC_ORIG = "PGC_ORIG";  // PGC original (columna oculta) para localizar
var INDICE_ID      = "ID";        // índice compuesto: [ PGC, ID ]

var HOJA_DATOS = "Datos";

/* Mapeo cabecera-del-Excel -> campo de AUX_C (columnas NO clave que se graban).
 *   tipo "plano" -> valor tal cual.
 *   tipo "combo" -> solo el código (lo previo al primer " - ").
 * PGC es combo y además forma parte de la clave (se trata aparte). */
var MAPEO = [
	{ cabecera: "NAME", campoArt: "NAME", tipo: "plano" },
	{ cabecera: "PGC",  campoArt: "PGC",  tipo: "combo" }
];

/* ----------------------------- Utilidades --------------------------------- */

function construirLookup() {
	var lk = {};
	for (var i = 0; i < MAPEO.length; i++) {
		lk[MAPEO[i].cabecera] = MAPEO[i];
		lk[MAPEO[i].campoArt] = MAPEO[i];
	}
	return lk;
}

/** Extrae el código de "código - nombre" (usa el PRIMER " - "). "" si vacío. */
function extraerCodigo(valor) {
	if (valor == null) return "";
	var s = String(valor);
	var p = s.indexOf(" - ");
	return (p === -1 ? s : s.substring(0, p)).replace(/^\s+|\s+$/g, "");
}

/** Normaliza una clave SIEMPRE como texto (alfabético). Los índices de AUX_C
 *  (ID y PGC) son alfanuméricos: convertirlos a número haría que readRegister
 *  no encontrase nada. Solo se recorta; nunca se convierte a Number. */
function normClave(valor) {
	if (valor == null) return "";
	return String(valor).replace(/^\s+|\s+$/g, "");
}

function esVacia(valor) {
	return valor == null || String(valor).replace(/^\s+|\s+$/g, "") === "";
}

/**
 * Asigna al registro las columnas del MAPEO presentes en la fila.
 * PGC vacío -> "" (puntero sin valor, nunca 0).
 */
function aplicarCampos(reg, fila, lookup) {
	var modificados = 0;
	for (var key in fila) {
		if (!fila.hasOwnProperty(key)) continue;
		if (key === CAMPO_ID) continue;              // la clave propia no va aquí

		var def = lookup[key];
		if (!def) continue;                           // columna desconocida

		var bruto = fila[key];
		var valor;
		if (esVacia(bruto)) {
			valor = "";                               // vacío = sin valor (no 0)
		} else if (def.tipo === "combo") {
			valor = extraerCodigo(bruto);
		} else {
			valor = String(bruto).replace(/^\s+|\s+$/g, "");
		}

		reg.setField(def.campoArt, valor);
		modificados++;
	}
	return modificados;
}

/* ------------------------------- Proceso ---------------------------------- */

var ruta = theRoot.varToString("SND");

var altaCount = 0;
var modCount  = 0;
var errCount  = 0;

var binario = leerFicheroComoBinario(ruta);

if (binario === null) {
	logError("No se pudo leer el fichero: " + ruta);
} else {
	var workbook = parsearWorkbook(binario);

	var indiceHoja = workbook.SheetNames.indexOf(HOJA_DATOS);
	if (indiceHoja < 0) {
		indiceHoja = parseInt(theRoot.varToString("PAR_INDICE_HOJA")) || 0;
	}

	var filas  = hojaAJson(workbook, indiceHoja);
	var lookup = construirLookup();

	for (var f = 0; f < filas.length; f++) {
		var fila = filas[f];

		// 1) Clave propia (ID) obligatoria.
		if (!fila.hasOwnProperty(CAMPO_ID) || esVacia(fila[CAMPO_ID])) {
			logError("Fila " + (f + 2) + ": sin ID, se omite.");
			errCount++;
			continue;
		}
		var id = normClave(fila[CAMPO_ID]);

		// 2) PGC original (columna oculta) y PGC visible (desplegable).
		//    - PGC_ORIG CON contenido -> es una MODIFICACIÓN.
		//    - PGC_ORIG VACÍO         -> es un ALTA.
		var pgcOrig = normClave(fila.hasOwnProperty(CAMPO_PGC_ORIG) ? fila[CAMPO_PGC_ORIG] : "");
		var pgcVis  = normClave(extraerCodigo(fila.hasOwnProperty(CAMPO_PGC) ? fila[CAMPO_PGC] : ""));

		theRoot.beginTrans("Importar AUX_C " + id);

		if (pgcOrig !== "") {
			/* ===================== MODIFICACIÓN ===================== */
			// Se localiza por [ PGC_ORIG, ID ] (aunque hayan cambiado el PGC).
			var reg = new VRegister(theRoot);
			reg.setTable(TABLA_AUX, false);

			if (reg.readRegister(INDICE_ID, [pgcOrig, id], VRegister.SearchThis) && reg.isOK()) {
				aplicarCampos(reg, fila, lookup);      // NAME + PGC (nuevo valor)
				reg.modifyRegister();
				if (reg.errorNumber() === 0) {
					theRoot.commitTrans();
					modCount++;
				} else {
					logError("Fila " + (f + 2) + ": ID=" + id + " error al modificar: " + reg.errorMessage());
					theRoot.rollbackTrans();
					errCount++;
				}
			} else {
				// Marcada como modificación pero no existe el registro original.
				theRoot.rollbackTrans();
				logError("Fila " + (f + 2) + ": no existe la cuenta a modificar [PGC=" + pgcOrig + ", ID=" + id + "].");
				errCount++;
			}

		} else {
			/* ========================= ALTA ========================= */
			// Antes de crear, validar que NO exista ya la cuenta [ PGC, ID ].
			var chk = new VRegister(theRoot);
			chk.setTable(TABLA_AUX, false);
			var yaExiste = chk.readRegister(INDICE_ID, [pgcVis, id], VRegister.SearchThis) && chk.isOK();

			if (yaExiste) {
				// Ya existe -> no se hace nada, se cuenta como error.
				theRoot.rollbackTrans();
				logError("Fila " + (f + 2) + ": la cuenta [PGC=" + pgcVis + ", ID=" + id + "] ya existe; no se da de alta.");
				errCount++;
			} else {
				var regNew = new VRegister(theRoot);
				regNew.setTable(TABLA_AUX, true);      // true = contenidos iniciales

				regNew.setField(CAMPO_ID, id);         // clave propia
				aplicarCampos(regNew, fila, lookup);   // NAME + PGC

				regNew.addRegister();
				if (regNew.errorNumber() === 0) {
					theRoot.commitTrans();
					altaCount++;
				} else {
					logError("Fila " + (f + 2) + ": ID=" + id + " error al crear: " + regNew.errorMessage());
					theRoot.rollbackTrans();
					errCount++;
				}
			}
		}
	}

	log("Importación finalizada. Altas=" + altaCount + "  Modificados=" + modCount + "  Errores=" + errCount);	
}

theRoot.setVar("MSJ", _log_lineas.join("\n"));

mostrarLog();
