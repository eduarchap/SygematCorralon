/**
 * exportar_informe_stock_3p.js
 * TERCER PLANO — Genera en memoria el informe Excel de stock con estilos y
 * devuelve el binario en una variable para que el proceso de primer plano
 * lo guarde en disco.
 *
 * Si hay más de un almacén, genera una hoja por almacén.
 * Si sólo hay un almacén, genera una única hoja "Stock" (comportamiento original).
 *
 * Variables de entrada:
 *   PAR_RUTA_DIRECTORIO  {string}  Ruta del directorio donde se guardará el fichero.
 *
 * Variables de salida:
 *   RET_XLSX         {string}  Binario del fichero .xlsx serializado.
 *   RET_RUTA         {string}  Ruta completa del fichero a guardar.
 *   RET_TOTAL_STOCK  {string}  Total general de unidades (para mostrarlo en el alert 1p).
 *
 * Tablas usadas:
 *   course_sheetjs_dat/STOCK_ARTICULOS
 *   course_sheetjs_dat/ALMACENES
 *   course_sheetjs_dat/ARTICULOS
 */

#include "(CurrentProject)/excel/lib/xlsx-js-style/xlsx.bundle.js"
#include "(CurrentProject)/excel/utilidades/log_utils.js"
#include "(CurrentProject)/excel/utilidades/fichero_utils.js"
#include "(CurrentProject)/excel/excel_estilos_utils.js"

// --- Cargar datos ---
var listaStock = new VRegisterList(theRoot);
listaStock.setTable("course_sheetjs_dat/STOCK_ARTICULOS");

if (!listaStock.load("ID", [])) {
	alert("No se pudieron cargar los datos de stock.", "Error");
} else {

	listaStock.sort(["ALMACENES", "ARTICULOS"]);
	log("registros de stock: " + listaStock.size());

	// --- Mapas de caché ---
	var cacheAlmacenes = {};
	var cacheArticulos = {};

	function obtenerNombreAlmacen(idAlmacen) {
		if (!cacheAlmacenes[idAlmacen]) {
			var lista = new VRegisterList(theRoot);
			lista.setTable("course_sheetjs_dat/ALMACENES");
			lista.load("ID", [idAlmacen]);
			cacheAlmacenes[idAlmacen] = (lista.size() > 0) ? lista.readAt(0).fieldToString("NAME") : "Almacén " + idAlmacen;
		}
		return cacheAlmacenes[idAlmacen];
	}

	function obtenerNombreArticulo(idArticulo) {
		if (!cacheArticulos[idArticulo]) {
			var lista = new VRegisterList(theRoot);
			lista.setTable("course_sheetjs_dat/ARTICULOS");
			lista.load("ID", [idArticulo]);
			cacheArticulos[idArticulo] = (lista.size() > 0) ? lista.readAt(0).fieldToString("NAME") : "Artículo " + idArticulo;
		}
		return cacheArticulos[idArticulo];
	}

	// --- Fecha y hora ---
	var hoy = new Date();
	var fechaFormato = hoy.getDate() + "/" + (hoy.getMonth() + 1) + "/" + hoy.getFullYear();
	var horaFormato = hoy.getHours() + ":" + (hoy.getMinutes() < 10 ? "0" : "") + hoy.getMinutes();

	// --- Estilos reutilizables ---
	var estiloEncabezado = {
		negrita: true,
		tamanoFuente: 11,
		colorFuente: "FFFFFF",
		colorFondo: "70AD47",
		alineacionH: "centro",
		alineacionV: "centro",
		borde: "normal",
		colorBorde: "4A7C2C"
	};

	var estiloDataPar = {
		alineacionH: "izquierda",
		borde: "normal",
		colorBorde: "E2EFDA"
	};

	var estiloDataImpar = {
		alineacionH: "izquierda",
		colorFondo: "F2F2F2",
		borde: "normal",
		colorBorde: "E2EFDA"
	};

	var estiloDataNumero = {
		alineacionH: "derecha",
		formato: "#,##0",
		borde: "normal",
		colorBorde: "E2EFDA"
	};

	var estiloDataNumeroImpar = {
		alineacionH: "derecha",
		colorFondo: "F2F2F2",
		formato: "#,##0",
		borde: "normal",
		colorBorde: "E2EFDA"
	};

	var estiloTotal = {
		negrita: true,
		tamanoFuente: 12,
		colorFuente: "FFFFFF",
		colorFondo: "FFC000",
		alineacionH: "derecha",
		formato: "#,##0",
		borde: "grueso",
		colorBorde: "FF8C00"
	};

	var estiloTotalTexto = {
		negrita: true,
		tamanoFuente: 12,
		colorFuente: "FFFFFF",
		colorFondo: "FFC000",
		alineacionH: "derecha",
		borde: "grueso",
		colorBorde: "FF8C00"
	};

	// --- Agrupar datos por almacén ---
	var dataPorAlmacen = {};
	var ordenAlmacenes = [];

	for (var i = 0; i < listaStock.size(); i++) {
		var reg = listaStock.readAt(i);
		var idAlmacen  = reg.fieldToInt("ALMACENES");
		var idArticulo = reg.fieldToInt("ARTICULOS");
		var stock      = reg.fieldToInt("NSTOCK");

		if (!dataPorAlmacen[idAlmacen]) {
			dataPorAlmacen[idAlmacen] = {
				nombre: obtenerNombreAlmacen(idAlmacen),
				registros: []
			};
			ordenAlmacenes.push(idAlmacen);
		}

		dataPorAlmacen[idAlmacen].registros.push({
			articulo: obtenerNombreArticulo(idArticulo),
			stock: stock
		});
	}

	log("almacenes distintos: " + ordenAlmacenes.length);

	var totalStock = 0;
	var hojas      = [];

	// ======================================================
	// CASO A: UN SOLO ALMACÉN — hoja única "Stock" (original)
	// ======================================================
	if (ordenAlmacenes.length <= 1) {

		var filas = [];

		// Fila 0: Título principal
		filas.push([
			{ valor: "INFORME DE STOCK", tipo: "texto", estilo: {
				negrita: true,
				tamanoFuente: 18,
				colorFuente: "FFFFFF",
				colorFondo: "1F4E78",
				alineacionH: "centro",
				alineacionV: "centro",
				borde: "normal",
				colorBorde: "1F4E78"
			}},
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 1: Fecha y hora
		filas.push([
			{ valor: "Generado: " + fechaFormato + " a las " + horaFormato, tipo: "texto", estilo: {
				cursiva: true,
				tamanoFuente: 10,
				colorFuente: "595959",
				colorFondo: "D9E1F2",
				alineacionH: "izquierda",
				borde: "normal",
				colorBorde: "A4A4A4"
			}},
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 2: Vacía (separador)
		filas.push([
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 3: Encabezados
		filas.push([
			{ valor: "ALMACEN",  tipo: "texto", estilo: estiloEncabezado },
			{ valor: "ARTICULO", tipo: "texto", estilo: estiloEncabezado },
			{ valor: "STOCK",    tipo: "texto", estilo: estiloEncabezado }
		]);

		// Filas de datos (un solo almacén)
		var numFilaData = 0;
		if (ordenAlmacenes.length === 1) {
			var idAlm = ordenAlmacenes[0];
			var regs  = dataPorAlmacen[idAlm].registros;
			var nombreAlm = dataPorAlmacen[idAlm].nombre;
			for (var j = 0; j < regs.length; j++) {
				var estiloFila   = (numFilaData % 2 === 0) ? estiloDataPar : estiloDataImpar;
				var estiloNumero = (numFilaData % 2 === 0) ? estiloDataNumero : estiloDataNumeroImpar;
				filas.push([
					{ valor: nombreAlm,         tipo: "texto",  estilo: estiloFila },
					{ valor: regs[j].articulo,  tipo: "texto",  estilo: estiloFila },
					{ valor: regs[j].stock,     tipo: "numero", estilo: estiloNumero }
				]);
				totalStock += regs[j].stock;
				numFilaData++;
			}
		}

		// Fila vacía
		filas.push([
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Total general
		filas.push([
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "TOTAL GENERAL", tipo: "texto", estilo: estiloTotalTexto },
			{ valor: totalStock,       tipo: "numero", estilo: estiloTotal }
		]);

		hojas.push({
			nombre: "Stock",
			filas: filas,
			columnas: [{ ancho: 25 }, { ancho: 35 }, { ancho: 12 }],
			fusiones: [
				{ desde: [0, 0], hasta: [2, 0] },
				{ desde: [0, 1], hasta: [2, 1] }
			]
		});

	// ======================================================
	// CASO B: VARIOS ALMACENES — hoja resumen + una hoja por almacén
	// ======================================================
	} else {

		// --- Calcular subtotales por almacén (necesarios para el resumen) ---
		var subtotalesPorAlmacen = {};
		for (var a = 0; a < ordenAlmacenes.length; a++) {
			var idAlm = ordenAlmacenes[a];
			var regs  = dataPorAlmacen[idAlm].registros;
			var sub   = 0;
			for (var j = 0; j < regs.length; j++) { sub += regs[j].stock; }
			subtotalesPorAlmacen[idAlm] = sub;
			totalStock += sub;
		}

		// --- Hoja resumen "Stock" ---
		var filasResumen = [];

		// Fila 0: Título
		filasResumen.push([
			{ valor: "INFORME DE STOCK", tipo: "texto", estilo: {
				negrita: true,
				tamanoFuente: 18,
				colorFuente: "FFFFFF",
				colorFondo: "1F4E78",
				alineacionH: "centro",
				alineacionV: "centro",
				borde: "normal",
				colorBorde: "1F4E78"
			}},
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 1: Fecha y hora
		filasResumen.push([
			{ valor: "Generado: " + fechaFormato + " a las " + horaFormato, tipo: "texto", estilo: {
				cursiva: true,
				tamanoFuente: 10,
				colorFuente: "595959",
				colorFondo: "D9E1F2",
				alineacionH: "izquierda",
				borde: "normal",
				colorBorde: "A4A4A4"
			}},
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 2: Vacía (separador)
		filasResumen.push([
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Fila 3: Encabezados
		filasResumen.push([
			{ valor: "ALMACEN",     tipo: "texto", estilo: estiloEncabezado },
			{ valor: "STOCK TOTAL", tipo: "texto", estilo: estiloEncabezado }
		]);

		// Una fila por almacén con su subtotal
		for (var a = 0; a < ordenAlmacenes.length; a++) {
			var idAlm     = ordenAlmacenes[a];
			var nombreAlm = dataPorAlmacen[idAlm].nombre;
			var estiloFila   = (a % 2 === 0) ? estiloDataPar : estiloDataImpar;
			var estiloNumero = (a % 2 === 0) ? estiloDataNumero : estiloDataNumeroImpar;
			filasResumen.push([
				{ valor: nombreAlm,                    tipo: "texto",  estilo: estiloFila },
				{ valor: subtotalesPorAlmacen[idAlm],  tipo: "numero", estilo: estiloNumero }
			]);
		}

		// Fila vacía
		filasResumen.push([
			{ valor: "", tipo: "texto", estilo: {} },
			{ valor: "", tipo: "texto", estilo: {} }
		]);

		// Total general
		filasResumen.push([
			{ valor: "TOTAL GENERAL", tipo: "texto",  estilo: estiloTotalTexto },
			{ valor: totalStock,      tipo: "numero", estilo: estiloTotal }
		]);

		hojas.push({
			nombre: "Stock",
			filas: filasResumen,
			columnas: [{ ancho: 35 }, { ancho: 14 }],
			fusiones: [
				{ desde: [0, 0], hasta: [1, 0] },
				{ desde: [0, 1], hasta: [1, 1] }
			]
		});

		// log("hoja resumen 'Stock' generada con " + ordenAlmacenes.length + " almacenes");

		// --- Una hoja por almacén ---
		for (var a = 0; a < ordenAlmacenes.length; a++) {
			var idAlm     = ordenAlmacenes[a];
			var almDatos  = dataPorAlmacen[idAlm];
			var regs      = almDatos.registros;
			var nombreAlm = almDatos.nombre;

			var filas = [];

			// Fila 0: Título con el nombre del almacén
			filas.push([
				{ valor: nombreAlm.toUpperCase(), tipo: "texto", estilo: {
					negrita: true,
					tamanoFuente: 16,
					colorFuente: "FFFFFF",
					colorFondo: "1F4E78",
					alineacionH: "centro",
					alineacionV: "centro",
					borde: "normal",
					colorBorde: "1F4E78"
				}},
				{ valor: "", tipo: "texto", estilo: {} }
			]);

			// Fila 1: Fecha y hora
			filas.push([
				{ valor: "Generado: " + fechaFormato + " a las " + horaFormato, tipo: "texto", estilo: {
					cursiva: true,
					tamanoFuente: 10,
					colorFuente: "595959",
					colorFondo: "D9E1F2",
					alineacionH: "izquierda",
					borde: "normal",
					colorBorde: "A4A4A4"
				}},
				{ valor: "", tipo: "texto", estilo: {} }
			]);

			// Fila 2: Vacía (separador)
			filas.push([
				{ valor: "", tipo: "texto", estilo: {} },
				{ valor: "", tipo: "texto", estilo: {} }
			]);

			// Fila 3: Encabezados (sin columna ALMACÉN)
			filas.push([
				{ valor: "ARTICULO", tipo: "texto", estilo: estiloEncabezado },
				{ valor: "STOCK",    tipo: "texto", estilo: estiloEncabezado }
			]);

			// Filas de datos
			var subtotalAlmacen = 0;
			for (var j = 0; j < regs.length; j++) {
				var estiloFila   = (j % 2 === 0) ? estiloDataPar : estiloDataImpar;
				var estiloNumero = (j % 2 === 0) ? estiloDataNumero : estiloDataNumeroImpar;
				filas.push([
					{ valor: regs[j].articulo, tipo: "texto",  estilo: estiloFila },
					{ valor: regs[j].stock,    tipo: "numero", estilo: estiloNumero }
				]);
				subtotalAlmacen += regs[j].stock;
			}

			// subtotalAlmacen ya se contabilizó en el resumen

			// Fila vacía
			filas.push([
				{ valor: "", tipo: "texto", estilo: {} },
				{ valor: "", tipo: "texto", estilo: {} }
			]);

			// Total del almacén
			filas.push([
				{ valor: "TOTAL " + nombreAlm.toUpperCase(), tipo: "texto",  estilo: estiloTotalTexto },
				{ valor: subtotalAlmacen,                    tipo: "numero", estilo: estiloTotal }
			]);

			// Nombre de hoja: máx. 31 caracteres (límite de Excel)
			var nombreHoja = nombreAlm.length > 31 ? nombreAlm.substring(0, 31) : nombreAlm;

			hojas.push({
				nombre: nombreHoja,
				filas: filas,
				columnas: [{ ancho: 35 }, { ancho: 12 }],
				fusiones: [
					{ desde: [0, 0], hasta: [1, 0] },
					{ desde: [0, 1], hasta: [1, 1] }
				]
			});

			// log("hoja '" + nombreHoja + "': " + regs.length + " artículos, subtotal=" + subtotalAlmacen);
		}
	}

	// log("filas construidas, hojas: " + hojas.length);

	// --- Construir JSON para exportación ---
	var datosExcel = {
		titulo: "Informe Stock",
		asunto: "Estado actual del inventario por almacén",
		autor:  "Sistema de Control de Stock",
		hojas:  hojas
	};

	// log("datosExcel construido");

	var workbook = jsonAWorkbookConEstilos(datosExcel);
	// log("workbook configurado");

	var binario = workbookABinario(workbook);
	// log("binario.length = " + binario.length);

	// --- Devolver resultado al proceso de primer plano ---
	theRoot.setVar("RET_XLSX",        serializarBinario(binario));
	theRoot.setVar("RET_TOTAL_STOCK", String(totalStock));
	// log("RET_XLSX, RET_RUTA y RET_TOTAL_STOCK establecidos");

	// mostrarLog();
}