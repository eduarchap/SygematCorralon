importClass("VProcess");
importClass("XMLHttpRequest");

// ================= CONFIG =================
var root = theRoot;
var app  = theApp;

var URL_MACRO = root.varToString("URL");
var EMP_ASG_SIE = root.varToBool("ASG_SIE");

var PAGE_LIMIT = parseInt(root.varToString("PAGE_LIMIT"), 10);
if (isNaN(PAGE_LIMIT) || PAGE_LIMIT < 100) PAGE_LIMIT = 500;

var BLOQUE_TRANSACCION = parseInt(root.varToString("BLOQUE_TRANSACCION"), 10);
if (isNaN(BLOQUE_TRANSACCION) || BLOQUE_TRANSACCION < 100) BLOQUE_TRANSACCION = 500;

var EVENTS_EVERY = parseInt(root.varToString("EVENTS_EVERY"), 10);
if (isNaN(EVENTS_EVERY) || EVENTS_EVERY < 100) EVENTS_EVERY = 500;

// ================= FLAGS =================
var costoConIva  = root.varToBool("COS_TIE_IVA");
var precioConIva = root.varToBool("PRE_TIE_IVA");
var DIV_IVA = 1.21;

// ================= TABLAS =================
var T_ART_M        = "sygemat_corralon_dat/ART_M";
var T_ART_PRV_G    = "sygemat_corralon_dat/ART_PRV_G";
var T_ART_BON_M    = "sygemat_corralon_dat/ART_BON_M";
var T_VTA_TAR_ART  = "sygemat_corralon_dat/VTA_TAR_ART_G";
var T_ENT_M        = "sygemat_corralon_dat/ENT_M";
var T_MAR_M        = "sygemat_corralon_dat/MAR_M";
var T_LIN_M        = "sygemat_corralon_dat/LIN_M";
var T_UND_MED_M    = "sygemat_corralon_dat/UND_MED_M";
var T_FPG_PRV_M    = "sygemat_corralon_dat/FPG_PRV_M";
var T_BON_M        = "sygemat_corralon_dat/BON_M";
var T_DIV_COT_M    = "sygemat_corralon_dat/DIV_COT_M";

var T_FAM_M        = "sygemat_corralon_dat/FAM_M";
var T_VTA_TAR_G    = "sygemat_corralon_dat/VTA_TAR_G";

// ---- Constantes del bloque de LISTAS DE PRECIO EXTRA (7 en adelante) ----
// Tienen que estar ACA, arriba del flujo principal. Las funciones se hoistean
// pero las asignaciones de var NO: si se declaran junto a su bloque (al final
// del archivo) todavia valen undefined cuando el loop las usa, y entonces
// listasExtraPresentes() sale por el chequeo de cache devolviendo undefined y
// todo el bloque muere con un TypeError que nadie ve.
var LISTA_EXTRA_MIN = 7;
var LISTA_EXTRA_MAX = 50;   // tope de seguridad
var RE_LISTA_EXTRA  = /^(?:Rent\.?|Precio)\s+[Ll]ista\s+(\d+)$/;
var _cacheListasExtra = null;

// ---- Avisos de las listas 1-6 y de la condicion de stock (PENDIENTES 19 y 3) ----
// Van aca arriba por la misma razon que todo lo de este bloque: una var declarada
// al lado de su funcion vale undefined cuando el loop la usa.
//
// Se avisa UNA vez por numero de lista, no una por articulo: si falta la tarifa de
// la lista 3, va a faltar en los 20.000 y no hace falta decirlo 20.000 veces.
var _avisadoTarifa = {};
var _avisadoConStk = {};

// ---- Constantes del bloque de CAMPOS DIRECTOS de ART_M ----
// Van aca por el mismo motivo que las de arriba: el flujo principal las usa.
var CAMPO_DIRECTO_MAX = 30;   // tope de seguridad
var RE_CAMPO_DIRECTO  = /^ART_M\.([A-Z][A-Z0-9_]*)$/;
// Campos que el importador ya maneja: si una columna de paso apunta a uno de
// estos se ignora y se avisa. Sin esto, una columna ART_M.REF pisaria el SKU
// en silencio.
//
// REG_IVA_COM y REG_IVA_VTA NO estan aca a proposito (26/08/2026): estaban fijos
// en "G" para todos los articulos y no se derivan de ninguna columna del
// contrato, asi que una columna ART_M.REG_IVA_VTA puede pisarlos sin contradecir
// nada. aplicarCamposDirectos() corre despues de los setField hardcodeados, asi
// que el valor de la planilla gana. Tiene que ser el IDENTIFICADOR de REG_IVA_M
// (G, R, S, E, X, A, B), no la etiqueta visible: el importador no lo valida.
var CAMPOS_ART_M_RESERVADOS = {
  // estructurales: un valor equivocado rompe mucho mas que el articulo
  ID:1, EMP:1, EMP_DIV:1,
  // punteros a maestros, resueltos por los verificar*()
  PRV:1, MAR_M:1, FAM:1, LIN_M:1,
  UND_MED_INV:1, UND_MED_CBO_COS:1, UND_MED_DES:1,
  // datos que salen de columnas del contrato: pisarlos dejaria el articulo
  // contradiciendo su propia fila de la planilla
  NAME:1, REF:1, SKU_FAB:1, COD_BAR:1, CAL:1,
  ALT_CM:1, ANC_CM:1, LAR_CM:1, PESO:1,
  UTI_CLA_1:1, UTI_CLA_2:1, UTI_CLA_3:1, UTI_CLA_4:1,
  CON_STK:1, ASG_SIE:1, COE:1,
  // constantes hardcodeadas que igual se bloquean por ahora
  ES_OUT:1, FAC_CNV_UND_CBO_MAS_VS_INV:1
};
var _cacheCamposDirectos = null;
// Los identificadores se prueban una sola vez al arrancar, contra un registro
// descartable (validarCamposDirectos): los que no existan se sacan de la lista y
// nunca llegan a tocar un articulo. Este flag evita repetir el mismo error de
// fila en RES una vez por articulo.
var _camposDirectosErrLog = {};

// Flag de la verificacion de una sola vez del costo de flete. Va aca arriba y no
// al lado de su funcion: las asignaciones de var no se hoistean y el loop la usa.
var _cosFleteVerificado = 0;

// ================= RESULTADOS =================
var contadorRegistroOK = 0;
var contadorRegistroKO = 0;
var detallesError      = "";
var inicioImportMs     = new Date().getTime();
alert("Inicio de importacion: " + (new Date(inicioImportMs)).toString());

// ================= ENCABEZADOS DEL CLIENTE =================
// El WebApp manda las claves del JSON con el nombre CANONICO segun la posicion
// de la columna, y aparte, en meta.encabezados, como llamo el cliente a las que
// renombro (ej. {"Bonif 9": "Comision (%)"}). Nunca se busca un valor por el
// nombre del cliente: se lee por slot y el nombre se usa solo como etiqueta.
var ENCABEZADOS_CLIENTE = {};

function nombreVisible(claveCanonica) {
  var n = ENCABEZADOS_CLIENTE[claveCanonica];
  return (n && ("" + n).trim() !== "") ? ("" + n).trim() : claveCanonica;
}

// ================= CACHES =================
var cacheMarca     = {};
var cacheLinea     = {};
var cacheUndMed    = {};
var cacheProveedor = {};
var cacheBonif     = {};
var cacheFpg       = {};
var cacheFamilia   = {};
var cacheCotiz     = {};
var cacheFamiliaNivel1       = {};
var cacheFamiliaNivel2       = {};
var cacheFamiliaNivel3       = {};
var cacheUltimoFamNivel1     = 99;
var cacheUltimoFamNivel2     = {};
var cacheUltimoFamNivel3     = {};
var cacheFamiliaInicializada = false;

// ================= HELPERS =================
function cellStr(rowObj, key, defVal) {
  var v = (rowObj == null) ? null : rowObj[key];
  if (v === undefined || v === null) return defVal || "";
  v = ("" + v).trim();
  return v ? v : (defVal || "");
}
function cellNum(rowObj, key, defVal) {
  var v = (rowObj == null) ? null : rowObj[key];
  if (v === undefined || v === null || v === "") return (defVal === undefined ? 0 : defVal);

  if (typeof v === "number") {
    return isNaN(v) ? (defVal === undefined ? 0 : defVal) : v;
  }

  var s = ("" + v).trim();
  if (s === "") return (defVal === undefined ? 0 : defVal);

  s = s.replace(/\s/g, "").replace(/%/g, "");

  if (s.indexOf(",") >= 0) {
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    s = s.replace(/,/g, "");
  }

  var n = parseFloat(s);
  return isNaN(n) ? (defVal === undefined ? 0 : defVal) : n;
}
function cellBoolSi(rowObj, key) {
  var s = cellStr(rowObj, key, "");
  if (!s) return 0;
  return (s.toLowerCase() === "si") ? 1 : 0;
}

function safeProcessEvents() {
  try {
    if (root && typeof root.processEvents === "function") {
      root.processEvents();
      return;
    }
  } catch(e) {}

  try {
    if (app && typeof app.processEvents === "function") {
      app.processEvents();
      return;
    }
  } catch(e) {}
}

// ================= HTTP Paginado =================
var _tCounter = 0;

function getArticulosDesdeGooglePage(offset, limit) {
  _tCounter++;
  var url = URL_MACRO;
  url += (url.indexOf("?") > -1 ? "&" : "?") + "t=" + _tCounter;
  url += "&offset=" + offset + "&limit=" + limit;

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.send();

  // FIX (punto 3): reemplazado xhr.processEvents() (no existe en XHR) por safeProcessEvents()
  if (xhr.readyState != 4) {
    while (xhr.readyState != 4) safeProcessEvents();
  }

  if (xhr.status != 200) throw ("Error HTTP " + xhr.status + " -> " + xhr.responseText);

  var text = xhr.responseText;
  if (!text) return { rows: [], meta: {}, done: true, nextOffset: offset };

  var data = JSON.parse(text);
  text = null;

  if (data && data.rows) {
    var rows1 = data.rows || [];
    var no = (data.nextOffset !== undefined && data.nextOffset !== null) ? data.nextOffset : (offset + rows1.length);
    var meta1 = (data.meta && data.meta.encabezados) ? data.meta.encabezados : {};
    return { rows: rows1, meta: meta1, done: (data.done === true) || (rows1.length === 0), nextOffset: no };
  }

  if (data && data.length !== undefined) {
    return { rows: data, meta: {}, done: (data.length === 0), nextOffset: offset + data.length };
  }

  return { rows: [], meta: {}, done: true, nextOffset: offset };
}

// ================= TRANSACCION (SAFE) =================
var hayTrans = root.existTrans();
var manageTrans = !hayTrans;
var nuevaTrans = false;

function beginTrans(msg) {
  if (!manageTrans) return false;
  nuevaTrans = true;
  return root.beginTrans(msg);
}
function commitCada(processedTotal) {
  if (!manageTrans) return;
  if ((processedTotal % BLOQUE_TRANSACCION) === 0) {
    root.commitTrans();
    beginTrans("Importando datos bloque " + (processedTotal / BLOQUE_TRANSACCION));
  }
}


// ================= OPT: actualizar tarifas (version robusta) =================
function valorNumericoConAlias(rowObj, claves, defVal) {
  if (!rowObj) return defVal;

  for (var i = 0; i < claves.length; i++) {
    var k = claves[i];
    if (rowObj[k] !== undefined && rowObj[k] !== null && rowObj[k] !== "") {
      return cellNum(rowObj, k, defVal);
    }
  }

  return defVal;
}

function leerRentLista(rowObj, nroLista) {
  return valorNumericoConAlias(
    rowObj,
    [
      "Rent. Lista " + nroLista,
      "Rent. lista " + nroLista,
      "Rent Lista " + nroLista
    ],
    0
  );
}

function leerPrecioLista(rowObj, nroLista) {
  return valorNumericoConAlias(
    rowObj,
    [
      "Precio Lista " + nroLista,
      "Precio lista " + nroLista
    ],
    0
  );
}

function actualizarListasPrecios(codigoArticulo, codigoUndMedInv, codigoUndMedCos, registoJson) {
  var rentas = [];
  var precios = [];
  var hay = false;

  for (var l = 1; l <= 6; l++) {
    var rentL = leerRentLista(registoJson, l);
    var precL = leerPrecioLista(registoJson, l);

    rentas[l] = rentL;
    precios[l] = precL;

    if (rentL !== 0 || precL !== 0) {
      hay = true;
    }
  }

  if (!hay) return;

  var listaTar = new VRegisterList(root);
  listaTar.setTable(T_VTA_TAR_ART);

  for (var l2 = 1; l2 <= 6; l2++) {
    var rent = rentas[l2];
    var prec = precios[l2];

    if (rent === 0 && prec === 0) continue;

    listaTar.load("ART_VTA_TAR", [codigoArticulo, String(l2)]);

    // Sin fila de tarifa el precio se PIERDE. Antes era un continue mudo: los
    // precios de una lista entera podian descartarse sin dejar rastro en ningun
    // lado. Se avisa una vez por numero de lista. (PENDIENTES 19, 07/09/2026.)
    if (listaTar.size() <= 0) {
      if (!_avisadoTarifa[l2]) {
        _avisadoTarifa[l2] = 1;
        if (detallesError.length < 8000) {
          detallesError += "[LISTA] la lista " + l2 + " no tiene fila en VTA_TAR_ART_G"
            + " para el articulo " + cellStr(registoJson, "SKU Propio", "") + " (y"
            + " probablemente para ninguno). Revisar que exista en VTA_TAR_G con ID "
            + l2 + ". Los precios y rentabilidades de esa lista se estan"
            + " descartando.\n";
        }
      }
      continue;
    }

    var rr = listaTar.readAt(0);

    if (rent !== 0) {
      rr.setField("POR_REN", rent * 100);
    }

    if (prec > 0) {
      if (codigoUndMedInv != codigoUndMedCos) rr.setField("IMP_CAL_EQI", 1);
      rr.setField("PRE", (precioConIva ? (prec / DIV_IVA) : prec));
    }

    rr.modifyRegister();
  }
}

// ================= MAIN IMPORT =================
var processedTotal = 0;
var pageOffset     = 0;

var asgSieEmpresa = EMP_ASG_SIE ? 1 : 0;

var listasPrecioInicializadas = false;

try {
  if (manageTrans) beginTrans("Importando datos bloque 0");

  while (true) {

    var page = getArticulosDesdeGooglePage(pageOffset, PAGE_LIMIT);
    var filas = page.rows;
    var filasLen = (filas ? filas.length : 0);
    var nextOffset = page.nextOffset;
    var done = (page.done === true);

    if (!filasLen) break;

    // El meta es igual en todas las paginas: se toma el de la primera.
    if (!listasPrecioInicializadas && page.meta) {
      ENCABEZADOS_CLIENTE = page.meta;
    }

    if (!listasPrecioInicializadas) {
      try {
        crearListasPrecioFaltantes(filas);
      } catch (eListas) {
        detallesError += "ERROR creando listas de precios: " + eListas + "\n";
      }
      // Aparte y en su propio try/catch: si esto falla, las listas 1-6 ya
      // quedaron creadas y la importacion sigue normal.
      try {
        crearListasExtraFaltantes(filas[0]);
      } catch (eExtra) {
        logListaExtra("error creando las listas extra: " + eExtra);
      }
      // Prueba los identificadores de campo directo antes de tocar el primer
      // articulo. Aislado: si esto falla, la importacion sigue igual.
      try {
        validarCamposDirectos(filas[0]);
      } catch (eCD) {
        logCampoDirecto("error validando los campos directos: " + eCD);
      }
      listasPrecioInicializadas = true;
    }

    for (var i = 0; i < filasLen; i++) {

      var registoJson = filas[i];

      try {
        // ================= PROVEEDOR =================
        var nomProv = cellStr(registoJson, "Proveedor", "");
        var idProv  = cellStr(registoJson, "Codigo proveedor", "");
        var codigoProveedor;
        if (nomProv) {
          codigoProveedor = verificarProveedorCache(nomProv, idProv);
        } else if (idProv) {
          codigoProveedor = verificarProveedorCache("Proveedor #" + idProv, idProv);
        } else {
          codigoProveedor = verificarProveedorCache("Sin proveedor", "0");
        }

        // ================= MARCA =================
        var codigoMarca = verificarMarcaCache(cellStr(registoJson, "Marca", "Sin marca"));

        // ================= FAMILIA =================
        var fam  = cellStr(registoJson, "Categoria", "Sin familia");
        var sfam = cellStr(registoJson, "Sub-Categoria", "Sin subFamilia");
        var ssf  = cellStr(registoJson, "Sub-Categoria 2", "Sin subSubFamilia");
        var codigoFamilia = verificarFamiliaCache(fam, sfam, ssf);

        // ================= LINEA =================
        var codigoLinea = verificarLineaCache(cellStr(registoJson, "Linea", "Sin linea"));

        // ================= UNIDADES =================
        var codigoUndMedInv = verificarUnidadMedidaCache(cellStr(registoJson, "Unidad de precio/inventario", "und"));
        var codigoUndMedCos = verificarUnidadMedidaCache(cellStr(registoJson, "Unidad de costo", "und"));
        var codigoUndMedDes = verificarUnidadMedidaCache(cellStr(registoJson, "Unidad de despacho", "und"));

        // ================= ALTA ART_M =================
        var registroArticulo = new VRegister(root);
        registroArticulo.setTable(T_ART_M);

        registroArticulo.setField("EMP","1");
        registroArticulo.setField("EMP_DIV","11");
        registroArticulo.setField("REG_IVA_COM","G");
        registroArticulo.setField("REG_IVA_VTA","G");
        registroArticulo.setField("PRV", codigoProveedor);
        registroArticulo.setField("MAR_M", codigoMarca);
        registroArticulo.setField("FAM", codigoFamilia);
        registroArticulo.setField("LIN_M", codigoLinea);
        registroArticulo.setField("UND_MED_INV", codigoUndMedInv);
        registroArticulo.setField("UND_MED_CBO_COS", codigoUndMedCos);
        registroArticulo.setField("UND_MED_DES", codigoUndMedDes);
        registroArticulo.setField("ES_OUT", 0);

        registroArticulo.setField("NAME", cellStr(registoJson, "Nombre / Descripcion", ""));
        registroArticulo.setField("REF",  cellStr(registoJson, "SKU Propio", ""));
        registroArticulo.setField("SKU_FAB", cellStr(registoJson, "SKU Fabricante", ""));
        registroArticulo.setField("COD_BAR", cellStr(registoJson, "Codigo de barras", ""));
        registroArticulo.setField("CAL", cellStr(registoJson, "Calidad", "1"));

        registroArticulo.setField("ALT_CM", cellNum(registoJson, "Alto (cm)", 0));
        registroArticulo.setField("ANC_CM", cellNum(registoJson, "Ancho (cm)", 0));
        registroArticulo.setField("LAR_CM", cellNum(registoJson, "Largo (cm)", 0));
        registroArticulo.setField("PESO",   cellNum(registoJson, "Peso (kg)", 0));

        registroArticulo.setField("UTI_CLA_1", cellStr(registoJson, "Utiliza LOTES", ""));
        registroArticulo.setField("UTI_CLA_2", cellStr(registoJson, "Clasificador 2", ""));
        registroArticulo.setField("UTI_CLA_3", cellStr(registoJson, "Clasificador 3", ""));
        registroArticulo.setField("UTI_CLA_4", cellStr(registoJson, "Clasificador 4", ""));

        // Condicion de stock. Antes comparaba === "Con stock" con la mayuscula
        // exacta, y la validacion de la planilla acepta cualquier capitalizacion:
        // un cliente que escribiera "con stock" pasaba la validacion y el articulo
        // entraba como BAJO PEDIDO, en silencio. (PENDIENTES 3, 07/09/2026.)
        //
        // El toLowerCase() arregla eso. El aviso cubre lo que el toLowerCase no
        // puede: cualquier otro texto ("Con stok", "disponible") sigue cayendo en
        // "2" por defecto, y antes tampoco se enteraba nadie.
        var _conStk = cellStr(registoJson, "Condicion de stock", "").toLowerCase();
        var _valConStk = (_conStk === "con stock") ? "3" : "2";

        if (_conStk !== "" && _conStk !== "con stock" && _conStk !== "bajo pedido") {
          if (!_avisadoConStk[_conStk]) {
            _avisadoConStk[_conStk] = 1;
            if (detallesError.length < 8000) {
              detallesError += "[CON_STK] valor no reconocido: \"" + _conStk + "\"."
                + " Se importo como BAJO PEDIDO. Los unicos valores validos son"
                + " \"con stock\" y \"bajo pedido\" (en cualquier capitalizacion)."
                + " Primer caso: SKU " + cellStr(registoJson, "SKU Propio", "") + ".\n";
            }
          }
        }

        registroArticulo.setField("CON_STK", _valConStk);

        var _asgRaw = registoJson ? registoJson["No reserva stock vendido"] : undefined;
        var _asgVal = (_asgRaw === undefined || _asgRaw === null || ("" + _asgRaw).trim() === "")
          ? asgSieEmpresa
          : cellNum(registoJson, "No reserva stock vendido", asgSieEmpresa);
        registroArticulo.setField("ASG_SIE", _asgVal);
		var facCnv = cellNum(registoJson, "Conversion de u.costo a u.precio", 0);
		registroArticulo.setField("FAC_CNV_UND_CBO_MAS_VS_INV", 1);
        registroArticulo.setField("COE", cellNum(registoJson, "Coeficiente unidad de inventario/precio", 1));

        // Campos directos de ART_M (columnas ART_M.<CAMPO> al final de la
        // planilla). Va ANTES del addRegister: son campos de este mismo registro.
        aplicarCamposDirectos(registroArticulo, registoJson);

        if (!registroArticulo.addRegister()) {
          contadorRegistroKO++;
        } else {
          contadorRegistroOK++;
          var codigoArticulo = registroArticulo.fieldToInt("ID");

          // ================= FORMA DE PAGO =================
          var nombreFormaPago = cellStr(registoJson, "Forma de pago proveedor", "Sin forma de pago");
          var porcentajeDescuento = cellNum(registoJson, "% Dto FdP", 0);

          var codigoFormaPago = verificarFormaPagoProveedorCache(
            codigoProveedor,
            nombreFormaPago,
            porcentajeDescuento
          );

          // ================= ART_PRV_G =================
          var registroArticuloProveedor = new VRegister(root);
          registroArticuloProveedor.setTable(T_ART_PRV_G);

          registroArticuloProveedor.setField("ART", codigoArticulo);
          registroArticuloProveedor.setField("PRV", codigoProveedor);
          registroArticuloProveedor.setField("FPG_PRV_M", codigoFormaPago);

          registroArticuloProveedor.setField("REF_PRV", cellStr(registoJson, "SKU Proveedor", ""));
          registroArticuloProveedor.setField("DEM_DIA", cellNum(registoJson, "Demora en dias", 0));
          registroArticuloProveedor.setField("DIS", cellBoolSi(registoJson, "Discontinuado"));
          registroArticuloProveedor.setField("REP_SUS", cellBoolSi(registoJson, "Reposicion suspendida"));

          var costoBase = cellNum(registoJson, "Costo base en $", 0);
          registroArticuloProveedor.setField("COS", (costoConIva ? (costoBase / DIV_IVA) : costoBase));

          var costoUSD = cellNum(registoJson, "Costo base en USD", 0);
if (costoUSD > 0) {
  registroArticuloProveedor.setField("COS_MON_EXT", costoUSD);
  registroArticuloProveedor.setField("APL_COS_MON_EXT", 1);

  var mon = cellStr(registoJson, "Tipo de USD", "");
  if (mon) mon = mon.split(" - ")[0];

  var cotizacion = verificarCotizacionCache(mon);

  registroArticuloProveedor.setField("MON", mon);

  if (cotizacion > 0) {
    registroArticuloProveedor.setField("COT", cotizacion);

    // FIX: calcular COS en pesos segun logica de unidades
    var cosEnPesos;
    if (codigoUndMedInv === codigoUndMedCos) {
      cosEnPesos = Math.round(costoUSD * cotizacion * 100) / 100;
    } else {
      cosEnPesos = (facCnv > 0)
        ? Math.round(costoUSD / facCnv * cotizacion * 100) / 100
        : Math.round(costoUSD * cotizacion * 100) / 100;
    }
    registroArticuloProveedor.setField("COS", cosEnPesos);

  } else {
    if (detallesError.length < 8000) {
      detallesError += "Sin cotizacion valida para MON=" + mon + " (SKU=" + cellStr(registoJson, "SKU Propio", "") + ")\n";
    }
  }
}

          // La columna de la planilla se llama "Costo flete", sin el (%).
          var cosFlt = cellNum(registoJson, "Costo flete", 0);
          registroArticuloProveedor.setField("COS_FLT", cosFlt);

          // COS_FLE_MAN=1 marca el flete como MANUAL. Sin ese flag, para Velneo
          // COS_FLT es un valor CALCULADO: CHG_COS_ART_PRV corre justo despues
          // del alta, lo recalcula y lo deja en 0. Es la causa por la que el
          // flete no se importo nunca hasta el 06/09/2026.
          //
          // Solo se marca cuando HAY flete. Si la columna viene vacia no hay que
          // forzar el modo manual: dejaria el articulo con un 0 "puesto a mano"
          // en vez de con lo que Velneo calcule para el.
          if (cosFlt !== 0) {
            registroArticuloProveedor.setField("COS_FLE_MAN", 1);
          }

          registroArticuloProveedor.setField("PRN", 1);

          if (!registroArticuloProveedor.addRegister()) {
            throw "No se pudo crear ART_PRV_G";
          }

          var codigoArticuloProveedor = registroArticuloProveedor.fieldToInt("ID");

          // Corremos el proceso de cambio de costo
          var proceso = new VProcess(root);
          proceso.setProcess("sygemat_corralon_dat/CHG_COS_ART_PRV");
          proceso.setVar("ART_PRV", codigoArticuloProveedor);
          proceso.exec(VProcess.RunInServer);

          if (cosFlt !== 0) {
            verificarCosFleteUnaVez(codigoArticuloProveedor, cosFlt,
              cellStr(registoJson, "SKU Propio", ""));
          }

          // ================= BONIFICACIONES =================
          // Se recorren los 10 slots por nombre CANONICO, asi una bonificacion
          // nunca se saltea por como se llame la columna en la planilla.
          // El nombre del cliente se usa solo como etiqueta del maestro BON_M.
          for (var b = 1; b <= 10; b++) {
            var keyB = "Bonif " + b;
            var boni = cellNum(registoJson, keyB, 0);
            if (boni !== 0) {
              var nomBon = nombreVisible(keyB);
              var codBon = verificarBonificacionCache(nomBon, codigoProveedor);

              var regBon = new VRegister(root);
              regBon.setTable(T_ART_BON_M);
              regBon.setField("BON_M", codBon);
              regBon.setField("NAME", nomBon);
              regBon.setField("ART_PRV_G", codigoArticuloProveedor);
              regBon.setField("BON", boni * 100);
              // FIX (punto 1): verificar si addRegister falló
              if (!regBon.addRegister()) {
                throw "No se pudo crear ART_BON_M para " + nomBon;
              }
            }
          }

          // ================= LISTAS DE PRECIOS (OPT) =================
          actualizarListasPrecios(codigoArticulo, codigoUndMedInv, codigoUndMedCos, registoJson);

          // Listas 7 en adelante, aisladas: un fallo aca no toca el articulo,
          // ni las listas 1-6, ni el contador de KO.
          try {
            actualizarListasExtra(codigoArticulo, codigoUndMedInv, codigoUndMedCos, registoJson);
          } catch (eLE) {
            logListaExtra("fila (offset=" + pageOffset + " i=" + i + "): " + eLE);
          }
        }

      } catch (eReg) {
        contadorRegistroKO++;
        if (detallesError.length < 8000) {
          detallesError += "Error en fila (offset=" + pageOffset + " i=" + i + "): " + eReg + "\n";
        }
      }

      processedTotal++;
      commitCada(processedTotal);

      if ((processedTotal % EVENTS_EVERY) === 0) safeProcessEvents();

      filas[i] = null;
    }

    pageOffset = (nextOffset !== undefined && nextOffset !== null) ? nextOffset : (pageOffset + filasLen);

    filas = null;
    page.rows = null;
    page = null;

    safeProcessEvents();

    if (done) break;
  }

} catch (eMain) {
  detallesError += "ERROR GENERAL: " + eMain + "\n";
}

// ================= CIERRE TRANSACCION =================
if (manageTrans && nuevaTrans) {
  root.commitTrans();
}

// ================= DEVOLVER RESULTADOS =================
root.setVar("CON_OK", contadorRegistroOK);
root.setVar("CON_KO", contadorRegistroKO);
root.setVar("RES", detallesError);

var finImportMs = new Date().getTime();
var totalSeg = Math.round((finImportMs - inicioImportMs) / 1000);
var totalMin = (totalSeg / 60).toFixed(2);
alert("Fin de importacion. Tiempo total: " + totalSeg + " seg (" + totalMin + " min). OK=" + contadorRegistroOK + " KO=" + contadorRegistroKO);

// RES viaja por setVar y NO aparece en la consola de mensajes de vAdmin: si el
// proceso llamador no lo muestra, los errores quedan invisibles. Se vuelca por
// alert en tramos, que es lo unico que la consola muestra siempre.
if (detallesError) {
  var _resto = detallesError;
  var _parte = 1;
  while (_resto.length > 0) {
    alert("RES (" + _parte + "): " + _resto.substring(0, 900));
    _resto = _resto.substring(900);
    _parte++;
  }
}

// =======================================================================
// =================== FUNCIONES CON CACHE ===============================
// =======================================================================

// ---------- PROVEEDOR ----------
function verificarProveedorCache(nombreProveedor, idProveedor) {
  var nombre = (nombreProveedor || "").toString().trim();
  if (!nombre) nombre = "Sin proveedor";

  var id = (idProveedor || "").toString().trim();
  if (id === "0") id = "";

  if (id !== "") {
    var kId = "ID|" + id;
    if (kId in cacheProveedor) return cacheProveedor[kId];
  }

  var kNom = "NOM|" + nombre;
  if (kNom in cacheProveedor) return cacheProveedor[kNom];

  var res = verificarProveedor(nombre, id);

  cacheProveedor[kNom] = res;
  if (id !== "") cacheProveedor["ID|" + id] = res;

  return res;
}

function verificarProveedor(nombreProveedor, idProveedor) {
  var id = (idProveedor == null ? "" : ("" + idProveedor)).trim();

  var listaProveedor = new VRegisterList(root);
  listaProveedor.setTable(T_ENT_M);

  if (id !== "") {
    listaProveedor.load("ID_ENT_IMP_ES_PRV", [id]);
  } else {
    listaProveedor.load("NOM_ES_PRV", [nombreProveedor]);
  }

  if (listaProveedor.size() > 0) {
    return listaProveedor.readAt(0).fieldToInt("ID");
  }

  var registroProveedor = new VRegister(root);
  app.setGlobalVar("sygemat_corralon_dat/EMP_ID", "11");

  registroProveedor.setTable(T_ENT_M);
  registroProveedor.setField("EMP", "1");
  registroProveedor.setField("EMP_DIV", "11");
  registroProveedor.setField("ES_PRV", 1);
  registroProveedor.setField("NOM_COM", nombreProveedor);
  registroProveedor.setField("NOM_FIS", nombreProveedor);
  registroProveedor.setField("ID_ENT_IMP", id);

  if (!registroProveedor.addRegister()) {
    app.setGlobalVar("sygemat_corralon_dat/EMP_ID", "");
    throw "No se pudo crear proveedor";
  }

  app.setGlobalVar("sygemat_corralon_dat/EMP_ID", "");
  return registroProveedor.fieldToInt("ID");
}

// ---------- MARCA ----------
function verificarMarcaCache(nombreMarca) {
  nombreMarca = (nombreMarca || "Sin marca").toString().trim();
  if (!nombreMarca) nombreMarca = "Sin marca";

  if (nombreMarca in cacheMarca) return cacheMarca[nombreMarca];

  var id = verificarMarca(nombreMarca);
  cacheMarca[nombreMarca] = id;
  return id;
}
function verificarMarca(nombreMarca) {
  var listaMarcas = new VRegisterList(root);
  listaMarcas.setTable(T_MAR_M);
  listaMarcas.load("NAME", [nombreMarca]);

  if (listaMarcas.size() > 0) return listaMarcas.readAt(0).fieldToInt("ID");

  var registroMarca = new VRegister(root);
  registroMarca.setTable(T_MAR_M);
  registroMarca.setField("NAME", nombreMarca);
  // FIX (punto 1): verificar si addRegister falló
  if (!registroMarca.addRegister()) {
    throw "No se pudo crear marca: " + nombreMarca;
  }
  return registroMarca.fieldToInt("ID");
}

// ---------- LINEA ----------
function verificarLineaCache(nombreLinea) {
  nombreLinea = (nombreLinea || "Sin linea").toString().trim();
  if (!nombreLinea) nombreLinea = "Sin linea";

  if (nombreLinea in cacheLinea) return cacheLinea[nombreLinea];

  var id = verificarLinea(nombreLinea);
  cacheLinea[nombreLinea] = id;
  return id;
}
function verificarLinea(nombreLinea) {
  var listaLineas = new VRegisterList(root);
  listaLineas.setTable(T_LIN_M);
  listaLineas.load("NAME", [nombreLinea]);

  if (listaLineas.size() > 0) return listaLineas.readAt(0).fieldToInt("ID");

  var registroLinea = new VRegister(root);
  registroLinea.setTable(T_LIN_M);
  registroLinea.setField("NAME", nombreLinea);
  // FIX (punto 1): verificar si addRegister falló
  if (!registroLinea.addRegister()) {
    throw "No se pudo crear linea: " + nombreLinea;
  }
  return registroLinea.fieldToInt("ID");
}

// ---------- UNIDAD MEDIDA ----------
function verificarUnidadMedidaCache(unidadMedida) {
  unidadMedida = (unidadMedida || "und").toString().trim();
  if (unidadMedida in cacheUndMed) return cacheUndMed[unidadMedida];
  var id = verificarUnidadMedida(unidadMedida);
  cacheUndMed[unidadMedida] = id;
  return id;
}
function verificarUnidadMedida(unidadMedida) {
  if (!unidadMedida) unidadMedida = "und";
  unidadMedida = unidadMedida.toString().trim();

  var listaUndMedidas = new VRegisterList(root);
  listaUndMedidas.setTable(T_UND_MED_M);
  listaUndMedidas.load("CLV", [unidadMedida]);

  if (listaUndMedidas.size() > 0) return listaUndMedidas.readAt(0).fieldToInt("ID");

  var registroUndMedida = new VRegister(root);
  registroUndMedida.setTable(T_UND_MED_M);
  registroUndMedida.setField("CLV", unidadMedida);
  registroUndMedida.setField("NAME", unidadMedida);
  // FIX (punto 1): verificar si addRegister falló
  if (!registroUndMedida.addRegister()) {
    throw "No se pudo crear unidad de medida: " + unidadMedida;
  }
  return registroUndMedida.fieldToInt("ID");
}

// ---------- FAMILIA ----------
function normalizarNombreFamilia(nombre) {
  return (nombre || "").toString().trim().toUpperCase();
}

function inicializarCacheFamilias() {
  if (cacheFamiliaInicializada) return;

  var listaFamilias = new VRegisterList(root);
  listaFamilias.setTable(T_FAM_M);
  listaFamilias.load("ID", []);

  for (var i = 0; i < listaFamilias.size(); i++) {
    var reg = listaFamilias.readAt(i);
    var id = reg.fieldToString("ID");
    if (!id) continue;

    var nombreNorm = reg.fieldToString("NAME_SIN_ESP");
    if (!nombreNorm) nombreNorm = normalizarNombreFamilia(reg.fieldToString("NAME"));

    var largo = id.length;
    var idNum = parseInt(id, 10);

    if (largo === 3) {
      cacheFamiliaNivel1[nombreNorm] = id;
      if (!isNaN(idNum) && idNum > cacheUltimoFamNivel1) cacheUltimoFamNivel1 = idNum;
      continue;
    }

    if (largo === 6) {
      var idPadre1 = id.substring(0, 3);
      cacheFamiliaNivel2[idPadre1 + "||" + nombreNorm] = id;
      if (!(idPadre1 in cacheUltimoFamNivel2) || (!isNaN(idNum) && idNum > cacheUltimoFamNivel2[idPadre1])) {
        cacheUltimoFamNivel2[idPadre1] = idNum;
      }
      continue;
    }

    if (largo === 9) {
      var idPadre2 = id.substring(0, 6);
      cacheFamiliaNivel3[idPadre2 + "||" + nombreNorm] = id;
      if (!(idPadre2 in cacheUltimoFamNivel3) || (!isNaN(idNum) && idNum > cacheUltimoFamNivel3[idPadre2])) {
        cacheUltimoFamNivel3[idPadre2] = idNum;
      }
    }
  }

  if (cacheUltimoFamNivel1 < 100) cacheUltimoFamNivel1 = 99;
  cacheFamiliaInicializada = true;
}

function siguienteIdFamiliaNivel1() {
  var siguiente = cacheUltimoFamNivel1 + 1;
  if (siguiente < 100) siguiente = 100;
  cacheUltimoFamNivel1 = siguiente;
  return String(siguiente);
}

function siguienteIdFamiliaNivel2(idPadreNivel1) {
  var ult = cacheUltimoFamNivel2[idPadreNivel1];
  var siguiente = (ult && ult > 0) ? (ult + 1) : parseInt(idPadreNivel1 + "100", 10);
  cacheUltimoFamNivel2[idPadreNivel1] = siguiente;
  return String(siguiente);
}

function siguienteIdFamiliaNivel3(idPadreNivel2) {
  var ult = cacheUltimoFamNivel3[idPadreNivel2];
  var siguiente = (ult && ult > 0) ? (ult + 1) : parseInt(idPadreNivel2 + "100", 10);
  cacheUltimoFamNivel3[idPadreNivel2] = siguiente;
  return String(siguiente);
}

function altaFamilia(idFamilia, nombreFamilia, setEmpDiv) {
  var regAltaFam = new VRegister(root);
  regAltaFam.setTable(T_FAM_M);

  if (setEmpDiv) regAltaFam.setField("EMP_DIV", "11");

  regAltaFam.setField("ID", idFamilia);
  regAltaFam.setField("NAME", nombreFamilia);
  regAltaFam.setField("NAME_SIN_ESP", normalizarNombreFamilia(nombreFamilia));

  if (!regAltaFam.addRegister()) throw "No se pudo crear familia";
  return regAltaFam.fieldToString("ID");
}

function buscarOCrearFamiliaNivel1(nombreFamilia) {
  var nom = normalizarNombreFamilia(nombreFamilia);
  if (nom in cacheFamiliaNivel1) return cacheFamiliaNivel1[nom];

  var idReal = altaFamilia(siguienteIdFamiliaNivel1(), nombreFamilia, true);
  cacheFamiliaNivel1[nom] = idReal;

  var idNum = parseInt(idReal, 10);
  if (!isNaN(idNum) && idNum > cacheUltimoFamNivel1) cacheUltimoFamNivel1 = idNum;

  return idReal;
}

function buscarOCrearFamiliaNivel2(idPadreNivel1, nombreSubFamilia) {
  var nom = normalizarNombreFamilia(nombreSubFamilia);
  var k = idPadreNivel1 + "||" + nom;
  if (k in cacheFamiliaNivel2) return cacheFamiliaNivel2[k];

  var idReal = altaFamilia(siguienteIdFamiliaNivel2(idPadreNivel1), nombreSubFamilia, false);
  cacheFamiliaNivel2[k] = idReal;

  var idNum = parseInt(idReal, 10);
  if (!isNaN(idNum) && (!(idPadreNivel1 in cacheUltimoFamNivel2) || idNum > cacheUltimoFamNivel2[idPadreNivel1])) {
    cacheUltimoFamNivel2[idPadreNivel1] = idNum;
  }

  return idReal;
}

function buscarOCrearFamiliaNivel3(idPadreNivel2, nombreSubSubFamilia) {
  var nom = normalizarNombreFamilia(nombreSubSubFamilia);
  var k = idPadreNivel2 + "||" + nom;
  if (k in cacheFamiliaNivel3) return cacheFamiliaNivel3[k];

  var idReal = altaFamilia(siguienteIdFamiliaNivel3(idPadreNivel2), nombreSubSubFamilia, false);
  cacheFamiliaNivel3[k] = idReal;

  var idNum = parseInt(idReal, 10);
  if (!isNaN(idNum) && (!(idPadreNivel2 in cacheUltimoFamNivel3) || idNum > cacheUltimoFamNivel3[idPadreNivel2])) {
    cacheUltimoFamNivel3[idPadreNivel2] = idNum;
  }

  return idReal;
}

function verificarFamiliaCache(fam, sfam, ssf) {
  var f1 = (fam || "").toString().trim();
  var f2 = (sfam || "").toString().trim();
  var f3 = (ssf || "").toString().trim();

  var key = f1 + "|" + f2 + "|" + f3;
  if (key in cacheFamilia) return cacheFamilia[key];

  inicializarCacheFamilias();

  if (!f1) {
    cacheFamilia[key] = "";
    return "";
  }

  var idFam1 = buscarOCrearFamiliaNivel1(f1);
  if (!f2 || f2 === "Sin subFamilia") {
    cacheFamilia[key] = idFam1;
    return idFam1;
  }

  var idFam2 = buscarOCrearFamiliaNivel2(idFam1, f2);
  if (!f3 || f3 === "Sin subSubFamilia") {
    cacheFamilia[key] = idFam2;
    return idFam2;
  }

  var idFam3 = buscarOCrearFamiliaNivel3(idFam2, f3);
  cacheFamilia[key] = idFam3;
  return idFam3;
}

// ---------- FORMA PAGO ----------
function verificarFormaPagoProveedorCache(codigoProveedor, nombreFormaPago, porcentajeDescuento) {
  // FIX (punto 2): la key ahora incluye nombreFormaPago para evitar colisiones
  var key = codigoProveedor + "|" + porcentajeDescuento + "|" + nombreFormaPago;
  if (key in cacheFpg) return cacheFpg[key];

  var id = verificarFormaPagoProveedor(codigoProveedor, nombreFormaPago, porcentajeDescuento);
  cacheFpg[key] = id;
  return id;
}
function verificarFormaPagoProveedor(codigoProveedor, nombreFormaPago, porcentajeDescuento) {
  var listaFormaPagoPrv = new VRegisterList(root);
  listaFormaPagoPrv.setTable(T_FPG_PRV_M);
  listaFormaPagoPrv.load("POR_DTO_PRV", [porcentajeDescuento, codigoProveedor]);

  if (listaFormaPagoPrv.size() > 0) return listaFormaPagoPrv.readAt(0).fieldToInt("ID");

  var registroFormaPagoPrv = new VRegister(root);
  registroFormaPagoPrv.setTable(T_FPG_PRV_M);
  registroFormaPagoPrv.setField("PRV", codigoProveedor);
  registroFormaPagoPrv.setField("NAME", nombreFormaPago);
  registroFormaPagoPrv.setField("POR_DTO", porcentajeDescuento);
  registroFormaPagoPrv.setField("PPA", 1);
  // FIX (punto 1): verificar si addRegister falló
  if (!registroFormaPagoPrv.addRegister()) {
    throw "No se pudo crear forma de pago: " + nombreFormaPago;
  }
  return registroFormaPagoPrv.fieldToInt("ID");
}

// ---------- BONIFICACIONES ----------
function verificarBonificacionCache(nombreBonificacion, codigoProveedor) {
  var key = codigoProveedor + "|" + nombreBonificacion;
  if (key in cacheBonif) return cacheBonif[key];

  var id = verificarBonificacion(nombreBonificacion, codigoProveedor);
  cacheBonif[key] = id;
  return id;
}
function verificarBonificacion(nombreBonificacion, codigoProveedor) {
  var listaBonificaciones = new VRegisterList(root);
  listaBonificaciones.setTable(T_BON_M);
  listaBonificaciones.load("PRV_DSC", [codigoProveedor, nombreBonificacion]);

  if (listaBonificaciones.size() > 0) return listaBonificaciones.readAt(0).fieldToInt("ID");

  var registroBonificacion = new VRegister(root);
  registroBonificacion.setTable(T_BON_M);
  registroBonificacion.setField("DSC", nombreBonificacion);
  registroBonificacion.setField("PRV", codigoProveedor);
  // FIX (punto 1): verificar si addRegister falló
  if (!registroBonificacion.addRegister()) {
    throw "No se pudo crear bonificacion: " + nombreBonificacion;
  }
  return registroBonificacion.fieldToInt("ID");
}

// ---------- LISTAS DE PRECIOS ----------
function leerNombreLista(rowObj, nroLista) {
  var claves = [
    "Nombre Lista " + nroLista,
    "Nombre lista " + nroLista,
    "Nombre de Lista " + nroLista,
    "Nombre de lista " + nroLista
  ];
  for (var ci = 0; ci < claves.length; ci++) {
    var v = rowObj[claves[ci]];
    if (v !== undefined && v !== null && ("" + v).trim() !== "") {
      return ("" + v).trim();
    }
  }
  return "Lista " + nroLista;
}

/**
 * Crea en VTA_TAR_G las listas 1 a 6 que la planilla usa y todavia no existen.
 *
 * Recibe TODAS las filas de la primera pagina, no una sola. Antes miraba unicamente
 * filas[0]: si ese primer articulo no traia precio en la lista 3, la lista 3 no se
 * creaba y se descartaban en silencio los precios de lista 3 de TODO el lote.
 * Con PAGE_LIMIT en 1000 la muestra es de mil articulos y no cuesta un viaje extra,
 * porque las filas ya estan en memoria. (PENDIENTES 19, 07/09/2026.)
 */
function crearListasPrecioFaltantes(filas) {
  if (!filas) return;
  if (!filas.length) filas = [filas];   // tolera que le pasen una sola fila

  // Que listas usa la planilla, mirando todas las filas de la pagina.
  var conDato = {};
  var nombreDe = {};
  var f, l;
  for (f = 0; f < filas.length; f++) {
    if (!filas[f]) continue;
    for (l = 1; l <= 6; l++) {
      if (conDato[l]) continue;
      if (leerRentLista(filas[f], l) !== 0 || leerPrecioLista(filas[f], l) !== 0) {
        conDato[l] = true;
        nombreDe[l] = leerNombreLista(filas[f], l);
      }
    }
  }

  var listaTar = new VRegisterList(root);
  listaTar.setTable(T_VTA_TAR_G);
  listaTar.load("EMP", ["1"]);

  var existentes = {};
  var hayPrincipal = false;
  for (var ei = 0; ei < listaTar.size(); ei++) {
    var regEx = listaTar.readAt(ei);
    existentes[regEx.fieldToInt("ID")] = true;
    if (regEx.fieldToInt("PRN") === 1) hayPrincipal = true;
  }

  for (l = 1; l <= 6; l++) {
    if (!conDato[l]) continue;
    if (existentes[l]) continue;

    var nombre = nombreDe[l] || ("Lista " + l);
    var esPrincipal = !hayPrincipal;

    var regLista = new VRegister(root);
    regLista.setTable(T_VTA_TAR_G);
    regLista.setField("EMP", "1");
    regLista.setField("EMP_DIV", "11");

    // ID explicito. El importador busca la tarifa con load("ART_VTA_TAR",
    // [articulo, l]), asi que la lista l TIENE que tener ID l. Dejandolo
    // autonumerar, Velneo asigna el proximo libre y los precios de esa lista se
    // descartan sin error: es exactamente lo que paso con la lista 9 el 23/08/2026,
    // que se creo con ID 13. Mismo criterio que crearListasExtraFaltantes().
    regLista.setField("ID", String(l));

    regLista.setField("NAME", nombre);
    regLista.setField("PRN", esPrincipal ? 1 : 0);

    if (!regLista.addRegister()) {
      throw "No se pudo crear lista de precios " + l + " (" + nombre + ")";
    }

    var idReal = regLista.fieldToInt("ID");
    if (idReal !== l && detallesError.length < 8000) {
      detallesError += "[LISTA] la lista " + l + " se creo con ID " + idReal
        + ", que NO coincide con el numero de lista. Sus precios no se van a aplicar."
        + " Crearla a mano en VTA_TAR_G con ID " + l + ".\n";
    }

    hayPrincipal = true;
  }
}

// =======================================================================
// ============ LISTAS DE PRECIO EXTRA (7 en adelante) ===================
// =======================================================================
// El cliente puede agregar Rent./Precio Lista 7, 8, 9... al final de su
// planilla. Esas columnas NO son parte del contrato de 72: la planilla no las
// valida ni las formatea, el WebApp las emite con el texto literal del
// encabezado y solo las interpreta este bloque.
//
// Todo lo de aca esta AISLADO a proposito:
//   - las listas 1 a 6 siguen pasando por actualizarListasPrecios() sin cambios
//   - cada lista extra va en su propio try/catch
//   - los errores se registran en RES pero NO abortan el articulo ni cuentan KO
// Si algo falla, falla la importacion de estas listas nuevas y nada mas.

// LISTA_EXTRA_MIN, LISTA_EXTRA_MAX y RE_LISTA_EXTRA se declaran arriba de todo,
// junto a las constantes de tabla. Ver el comentario alla: si viven aca, el loop
// principal las lee como undefined.

function logListaExtra(txt) {
  if (detallesError.length < 8000) {
    detallesError += "[LISTA EXTRA] " + txt + "\n";
  }
}

// Numeros de lista >= 7 presentes en el JSON, ordenados.
// Se cachea porque el WebApp arma todas las filas con el mismo juego de claves,
// asi que el resultado es igual para toda la importacion.
// _cacheListasExtra se declara arriba de todo, por el mismo motivo.

function listasExtraPresentes(rowObj) {
  // Chequeo por verdadero, no por "!== null": un array vacio es truthy igual,
  // y asi un undefined inesperado recalcula en vez de salir como valor de retorno.
  if (_cacheListasExtra) return _cacheListasExtra;
  if (!rowObj) return [];

  var res = [];
  var vistos = {};
  for (var k in rowObj) {
    if (!rowObj.hasOwnProperty(k)) continue;
    var m = ("" + k).match(RE_LISTA_EXTRA);
    if (!m) continue;
    var n = parseInt(m[1], 10);
    if (isNaN(n) || n < LISTA_EXTRA_MIN || n > LISTA_EXTRA_MAX) continue;
    if (!vistos[n]) { vistos[n] = true; res.push(n); }
  }
  res.sort(function(a, b) { return a - b; });

  _cacheListasExtra = res;
  return res;
}

// Mismo criterio que parsearNumeroFlexible_() de la planilla: se mira el ULTIMO
// separador. 1 o 2 digitos atras = decimal; exactamente 3 = separador de miles;
// 4 o mas con un unico separador = decimal largo. Devuelve null si no se puede
// interpretar. Se usa SOLO en las listas extra: cellNum() no se toca, porque
// esas columnas no tienen la validacion de formato que si tienen las 1-6.
function numeroFlexibleExtra(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;

  var s = ("" + v).replace(/[^\d.,-]/g, "");
  if (!s || !/\d/.test(s)) return null;

  var negativo = s.charAt(0) === "-";
  s = s.replace(/-/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;

  var ultimo = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  var entero = s;
  var dec = "";

  if (ultimo > -1) {
    var cola = s.substring(ultimo + 1);
    var hayOtro = /[.,]/.test(s.substring(0, ultimo));
    if (/^\d{1,2}$/.test(cola)) {
      entero = s.substring(0, ultimo); dec = cola;
    } else if (/^\d{3}$/.test(cola)) {
      entero = s;
    } else if (/^\d{4,}$/.test(cola) && !hayOtro) {
      entero = s.substring(0, ultimo); dec = cola;
    } else {
      entero = s;
    }
  }

  entero = entero.replace(/[.,]/g, "");
  if (!/^\d+$/.test(entero)) return null;

  var n = parseFloat(entero + (dec ? "." + dec : ""));
  if (isNaN(n)) return null;
  return negativo ? -n : n;
}

function valorListaExtra(rowObj, prefijos, nroLista) {
  if (!rowObj) return 0;
  for (var i = 0; i < prefijos.length; i++) {
    var k = prefijos[i] + nroLista;
    var v = rowObj[k];
    if (v !== undefined && v !== null && v !== "") {
      var n = numeroFlexibleExtra(v);
      if (n !== null) return n;
      logListaExtra("Lista " + nroLista + ': no se pudo interpretar "' + v + '" en la columna "' + k + '", se ignora');
      return 0;
    }
  }
  return 0;
}

function rentListaExtra(rowObj, n) {
  return valorListaExtra(rowObj, ["Rent. Lista ", "Rent. lista ", "Rent Lista ", "Rent lista "], n);
}

function precioListaExtra(rowObj, n) {
  return valorListaExtra(rowObj, ["Precio Lista ", "Precio lista "], n);
}

// Crea en VTA_TAR_G las listas extra que traen datos y todavia no existen.
// Idempotente: si ya hay una lista con ese ID no hace nada, asi que crearlas a
// mano de antemano es seguro y es lo recomendado.
function crearListasExtraFaltantes(filaEjemplo) {
  var nums = listasExtraPresentes(filaEjemplo);
  if (!nums.length) return;

  var listaTar = new VRegisterList(root);
  listaTar.setTable(T_VTA_TAR_G);
  listaTar.load("EMP", ["1"]);

  var existentes = {};
  for (var ei = 0; ei < listaTar.size(); ei++) {
    existentes[listaTar.readAt(ei).fieldToInt("ID")] = true;
  }

  for (var i = 0; i < nums.length; i++) {
    var n = nums[i];
    try {
      if (existentes[n]) continue;
      if (rentListaExtra(filaEjemplo, n) === 0 && precioListaExtra(filaEjemplo, n) === 0) continue;

      var reg = new VRegister(root);
      reg.setTable(T_VTA_TAR_G);
      reg.setField("EMP", "1");
      reg.setField("EMP_DIV", "11");
      // ID explicito: el importador busca la tarifa por numero de lista
      // (load("ART_VTA_TAR", [articulo, n])), asi que el ID TIENE que ser n.
      // Si se deja autonumerar, Velneo asigna el proximo libre y la lista no sirve.
      reg.setField("ID", String(n));
      reg.setField("NAME", "Lista " + n);
      reg.setField("PRN", 0);   // nunca marcar una lista extra como principal

      if (!reg.addRegister()) {
        logListaExtra("Lista " + n + ": no se pudo crear en VTA_TAR_G");
        continue;
      }

      // Velneo asigna el ID solo, pero el importador busca la tarifa por numero
      // de lista. Si no coinciden, los precios de esta lista no se aplican.
      var idReal = reg.fieldToInt("ID");
      if (idReal !== n) {
        logListaExtra("Lista " + n + ": se pidio ID " + n + " pero Velneo asigno " + idReal + ". Los precios de esta lista no se van a aplicar. Borrar ese registro de VTA_TAR_G y crear la lista a mano con ID " + n + ".");
      }
    } catch (e) {
      logListaExtra("Lista " + n + ": error creandola -> " + e);
    }
  }
}

function actualizarListasExtra(codigoArticulo, codigoUndMedInv, codigoUndMedCos, rowObj) {
  var nums = listasExtraPresentes(rowObj);
  if (!nums.length) return;

  var sku = cellStr(rowObj, "SKU Propio", "");
  var listaTar = new VRegisterList(root);
  listaTar.setTable(T_VTA_TAR_ART);

  for (var i = 0; i < nums.length; i++) {
    var n = nums[i];
    try {
      var rent = rentListaExtra(rowObj, n);
      var prec = precioListaExtra(rowObj, n);
      if (rent === 0 && prec === 0) continue;

      listaTar.load("ART_VTA_TAR", [codigoArticulo, String(n)]);
      if (listaTar.size() <= 0) {
        logListaExtra("Lista " + n + ": el articulo no tiene tarifa para esa lista (falta la lista " + n + " en VTA_TAR_G con ID " + n + "). SKU=" + sku);
        continue;
      }

      var rr = listaTar.readAt(0);

      if (rent !== 0) {
        // Estas columnas no pasan por la normalizacion de la planilla, asi que
        // pueden venir como fraccion (0.30) o ya como porcentaje (30).
        rr.setField("POR_REN", (rent > 0 && rent <= 1) ? (rent * 100) : rent);
      }

      if (prec > 0) {
        if (codigoUndMedInv != codigoUndMedCos) rr.setField("IMP_CAL_EQI", 1);
        rr.setField("PRE", (precioConIva ? (prec / DIV_IVA) : prec));
      }

      if (!rr.modifyRegister()) {
        logListaExtra("Lista " + n + ": modifyRegister devolvio false, no se guardo. SKU=" + sku);
      }

    } catch (e) {
      logListaExtra("Lista " + n + " (SKU=" + sku + "): " + e);
    }
  }
}

// ---------- COTIZACION ----------
function verificarCotizacionCache(codigoMoneda) {
  codigoMoneda = (codigoMoneda || "").toString().trim();
  if (!codigoMoneda) return 0;

  if (codigoMoneda in cacheCotiz) return cacheCotiz[codigoMoneda];

  var cot = verificarCotizacion(codigoMoneda);
  cacheCotiz[codigoMoneda] = cot;
  return cot;
}
function verificarCotizacion(codigoMoneda) {
  var listaDivisa = new VRegisterList(root);
  listaDivisa.setTable(T_DIV_COT_M);
  listaDivisa.load("MON_ORI_DES", [codigoMoneda, 2]);

  listaDivisa.sort("FCH");
  var sz = listaDivisa.size();
  if (sz > 0) {
    var cotRaw = listaDivisa.readAt(sz - 1).fieldToString("COT");
    return cellNum({ COT: cotRaw }, "COT", 0);
  }
  return 0;
}

// =======================================================================
// ============ CAMPOS DIRECTOS DE ART_M (columnas de paso) ==============
// =======================================================================
// El cliente agrega al final de su planilla una columna ART_M.<CAMPO> (por
// ejemplo ART_M.UBI para la ubicacion) y su valor se vuelca tal cual sobre el
// registro de ART_M. La planilla no conoce el campo: no lo valida, no lo
// formatea y no toca ningun indice del contrato de 72 columnas.
//
// A diferencia de las listas extra, esto corre ANTES del addRegister y sobre el
// mismo registro, asi que no se puede aislar del todo: un nombre de campo
// invalido podria tumbar el alta. Por eso cada setField va en su try/catch y los
// campos que el importador ya maneja estan en CAMPOS_ART_M_RESERVADOS.
//
// No hay que tocar codigo cuando aparezca el proximo campo.

function logCampoDirecto(txt) {
  if (detallesError.length < 8000) {
    detallesError += "[CAMPO DIRECTO] " + txt + "\n";
  }
}

// Relee de la base el flete del PRIMER articulo que lo traiga y avisa en RES si
// no sobrevivio a CHG_COS_ART_PRV.
//
// Existe porque este dato ya se perdio en silencio una vez, durante un mes: sin
// COS_FLE_MAN el flete es un campo calculado y el proceso lo devuelve a 0, sin
// error y sin KO (ver la nota de COS_FLE_MAN en CLAUDE.md). Si alguien cambia el
// proceso o el modelo del campo, esto lo dice en vez de dejar miles de articulos
// con el flete en cero.
//
// Cuesta UNA lectura por importacion, no una por articulo: con el primero alcanza
// porque todos pasan por el mismo camino.
function verificarCosFleteUnaVez(idArtPrv, esperado, sku) {
  if (_cosFleteVerificado) return;
  _cosFleteVerificado = 1;

  var leido;
  try {
    var lista = new VRegisterList(root);
    lista.setTable(T_ART_PRV_G);
    lista.load("ID", [String(idArtPrv)]);
    leido = (lista.size() > 0)
      ? ("" + lista.readAt(0).fieldToString("COS_FLT"))
      : "(no se pudo releer el ART_PRV_G " + idArtPrv + ")";
  } catch (e) {
    leido = "(excepcion: " + e + ")";
  }

  var n = parseFloat(leido.replace(",", "."));
  if (isNaN(n) || Math.abs(n - esperado) > 0.0001) {
    detallesError += "[COS_FLT] el flete NO quedo guardado (SKU=" + sku
      + ": se escribio " + esperado + " y en la base quedo '" + leido + "')."
      + " Revisar que COS_FLE_MAN siga marcando el flete como manual en ART_PRV_G"
      + " y que CHG_COS_ART_PRV lo respete. Los demas articulos de esta"
      + " importacion probablemente tengan el mismo problema.\n";
  }
}

// Columnas ART_M.<CAMPO> presentes en el JSON, como {clave, campo}. Se cachea
// porque el WebApp arma todas las filas con el mismo juego de claves.
// Los campos que el importador ya maneja se descartan aca mismo.
function camposDirectosPresentes(rowObj) {
  if (_cacheCamposDirectos) return _cacheCamposDirectos;
  if (!rowObj) return [];

  var res = [];
  for (var k in rowObj) {
    if (!rowObj.hasOwnProperty(k)) continue;
    var m = ("" + k).match(RE_CAMPO_DIRECTO);
    if (!m) continue;

    var campo = m[1];
    if (CAMPOS_ART_M_RESERVADOS[campo]) {
      logCampoDirecto("la columna " + k + " se ignora: " + campo + " es un campo que el"
        + " importador ya maneja, y pisarlo dejaria el articulo mal cargado.");
      continue;
    }
    if (res.length >= CAMPO_DIRECTO_MAX) {
      logCampoDirecto("mas de " + CAMPO_DIRECTO_MAX + " columnas de campo directo: el resto se ignora.");
      break;
    }
    res.push({ clave: k, campo: campo });
  }

  _cacheCamposDirectos = res;
  return res;
}

function nombresCamposDirectos(campos) {
  var s = "";
  for (var i = 0; i < campos.length; i++) s += (i ? ", " : "") + campos[i].campo;
  return s || "(ninguna)";
}

// Prueba cada identificador contra un registro de ART_M que NUNCA se da de alta:
// se le escribe el valor de la fila de ejemplo y se relee. Si el campo no existe,
// Velneo tira excepcion o lo ignora, y en cualquiera de los dos casos la columna
// se saca de la lista y no se vuelve a intentar.
//
// El objetivo es que una columna mal escrita (ART_M.PEPE) no pueda hacer fallar el
// alta de ningun articulo: cuando arranca el loop, la lista ya esta depurada.
function validarCamposDirectos(filaEjemplo) {
  var campos = camposDirectosPresentes(filaEjemplo);
  if (!campos.length) return;

  logCampoDirecto("columnas detectadas: " + nombresCamposDirectos(campos));

  var buenos = [];
  for (var i = 0; i < campos.length; i++) {
    var campo = campos[i].campo;
    try {
      // Registro nuevo por campo: si uno queda en mal estado no contamina al
      // siguiente. Y nunca se llama a addRegister(), asi que no se crea nada.
      var prueba = new VRegister(root);
      prueba.setTable(T_ART_M);

      var v = filaEjemplo ? filaEjemplo[campos[i].clave] : null;
      var valor = (v === undefined || v === null || ("" + v).trim() === "")
        ? "1"
        : ((typeof v === "number") ? v : ("" + v).trim());

      prueba.setField(campo, valor);
      var leido = prueba.fieldToString(campo);

      if (leido === undefined || leido === null || ("" + leido) === "") {
        logCampoDirecto("la columna " + campos[i].clave + " se ignora: al campo " + campo
          + " se le escribio " + valor + " y volvio vacio, asi que ese identificador no"
          + " existe en ART_M. Revisar el encabezado contra vDevelop.");
        continue;
      }

      buenos.push(campos[i]);

    } catch (e) {
      logCampoDirecto("la columna " + campos[i].clave + " se ignora: " + campo + " -> " + e);
    }
  }

  if (buenos.length !== campos.length) {
    logCampoDirecto("columnas activas: " + nombresCamposDirectos(buenos));
  }

  _cacheCamposDirectos = buenos;
}

// Vuelca las columnas de campo directo sobre el registro que se va a dar de alta.
// El tipo se resuelve solo: una celda numerica llega como numero y va como numero,
// el resto va como texto trimmeado. Los vacios se saltean para no pisar los
// defaults de Velneo.
//
// Llegado aca la lista ya paso por validarCamposDirectos(), asi que todos los
// identificadores existen. El try/catch queda como red por si un valor puntual de
// una fila no le gusta al campo: se loguea una vez y el articulo se importa igual.
function aplicarCamposDirectos(reg, rowObj) {
  var campos = camposDirectosPresentes(rowObj);
  if (!campos.length) return;

  for (var i = 0; i < campos.length; i++) {
    try {
      var v = rowObj[campos[i].clave];
      if (v === undefined || v === null || ("" + v).trim() === "") continue;
      reg.setField(campos[i].campo, (typeof v === "number") ? v : ("" + v).trim());
    } catch (e) {
      if (!_camposDirectosErrLog[campos[i].campo]) {
        _camposDirectosErrLog[campos[i].campo] = 1;
        logCampoDirecto(campos[i].campo + " fallo en al menos una fila, se sigue: " + e);
      }
    }
  }
}