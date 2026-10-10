importClass("XMLHttpRequest");

// =======================================================================
// ============ RECONCILIACION POST-IMPORTACION (SOLO LECTURA) ===========
// =======================================================================
// Relee de la base lo que quedo despues de importar y lo manda al WebApp, que
// lo compara contra la planilla y escribe el reporte en la hoja
// "Comparacion_Importacion".
//
// ⚠️ ESTE PROCESO NO ESCRIBE NADA EN LA BASE. No hay un solo addRegister ni
// modifyRegister en todo el archivo. Es a proposito: puede correrse cuantas
// veces se quiera sin ningun riesgo.
//
// ⚠️ ES UN PROCESO APARTE del importador. El script de importacion no se toca:
// por eso reconciliar no puede alterar ni demorar una importacion.
//
// CONFIGURACION: igual que la importacion. El boton de Sygemat pide UNA URL y se
// pega la que genera el menu de la planilla:
//
//   Importacion -> Datos para reconciliacion
//
// Esa URL ya trae adentro el spreadsheetId y el token, asi que no hay nada que
// configurar en el script y nada que cambiar al reconciliar otra planilla.
//
// La segunda URL (la del POST) NO se pide: se deriva de la primera cambiando
// tipo=articulos por tipo=reconciliacion. Ver derivarUrls().
//
// Variables reconocidas:
//   URL         - la unica obligatoria
//   MUESTRA     - cuantos articulos reconciliar. 0 = TODOS. Vacio o invalido = 500.
//                 Se carga desde el mismo boton que la URL. La corrida informa en
//                 RES cual quedo activa, para no confundir "vi 500" con "vi todo"
//   PAGE_LIMIT  - filas por pagina del GET. Default 500
//   URL_POST    - opcional, si se quiere forzar en vez de derivarla
//   COS_TIE_IVA / PRE_TIE_IVA - opcionales, ver mas abajo
//
// SALIDA:
//   CON_VER - articulos verificados
//   CON_DIF - diferencias volcadas al reporte. -1 = no se pudo leer la respuesta
//             del WebApp (pasa siempre en Velneo por el redirect de Apps Script):
//             el reporte se escribio igual, hay que mirar la hoja
//   CON_ERR - problemas DEL PROCESO. 0 = corrio limpio
//   RES     - detalle en texto. Lineas [INFO] (informativas) y [AVISO] (problemas)
//
// Para el mensaje del boton alcanza con CON_ERR y CON_DIF; RES es para el detalle.
// OJO: RES puede traer lineas [INFO] en una corrida perfecta, asi que "RES no
// vacio" NO significa que algo fallo. Para eso esta CON_ERR.

// ================= CONFIG =================
// TODAS las var de nivel superior van ACA, arriba del flujo principal. Las
// funciones se hoistean pero las asignaciones de var NO: una constante declarada
// al lado de su bloque todavia vale undefined cuando el loop la usa. Ya rompio
// las listas de precio extra del importador el 23/08/2026.
var root = theRoot;
var app  = theApp;

// ================= DEFAULTS =================
// En uso normal la URL llega por la variable del proceso, cargada desde el boton
// de Sygemat. URL_FIJA existe solo para poder ejecutar el proceso a mano desde
// vDevelop mientras se prueba: si la variable viene cargada, la variable gana.
var URL_FIJA = "";

var MUESTRA_FIJA  = 500;   // 0 = todos los articulos
var PAGE_LIMIT_FIJA = 1000;   // alineado con POST_CADA: una pagina por POST

// Los flags de IVA los setea el proceso que llama a la IMPORTACION, no este. Si
// la reconciliacion corre suelta no hay de donde sacarlos, y adivinarlos seria
// peor que no saberlos: el reporte compararia contra el flag equivocado y todos
// los costos saldrian como diferencia.
//
// Vacio  = desconocido, el reporte NO hace el chequeo cruzado de IVA.
// "si" / "no" = lo que uso la importacion; el reporte lo cruza contra F1/F2 de
//               la hoja Verificaciones y avisa si no coinciden.
var COS_TIE_IVA_FIJO = "";
var PRE_TIE_IVA_FIJO = "";

// ================= RESOLUCION =================
// La variable del proceso gana sobre el valor fijo. Asi el mismo script sirve
// suelto y encadenado detras de la importacion sin tocar una linea.
// De donde sale la URL se registra en el momento de leerla: despues ya no se
// puede distinguir, y es la primera pregunta cuando el guard salta.
var _urlDeVariable = textoDeVar("URL", "");
var URL_MACRO = _urlDeVariable ? _urlDeVariable : ("" + (URL_FIJA || "")).trim();
var _origenUrl = _urlDeVariable
  ? "la variable URL del proceso"
  : (URL_MACRO ? "URL_FIJA (valor fijo del script)" : "NINGUNA PARTE");

// La del POST se deriva, salvo que la pasen explicitamente.
var URL_POST = textoDeVar("URL_POST", "");
var _urls = derivarUrls(URL_MACRO);
if (!URL_POST) URL_POST = _urls.post;
URL_MACRO = _urls.get;

// El spreadsheetId no se configura: se saca de la URL, y solo para poder
// nombrarlo en el alert final.
var SPREADSHEET_ID = idDePlanilla(URL_MACRO);

// De donde salio la muestra, por el mismo motivo que la URL: un campo vacio en el
// boton cae al default de 500, y sin decirlo alguien podria creer que reconcilio
// las 20.000 filas cuando en realidad vio 500.
var _muestraDeVariable = textoDeVar("MUESTRA", "");
var MUESTRA = enteroDeVar("MUESTRA", MUESTRA_FIJA);
if (MUESTRA < 0) MUESTRA = 0;
var _origenMuestra = (_muestraDeVariable !== "" && !isNaN(parseInt(_muestraDeVariable, 10)))
  ? "la variable MUESTRA del proceso"
  : "MUESTRA_FIJA (el boton no mando un numero valido)";

var PAGE_LIMIT = enteroDeVar("PAGE_LIMIT", PAGE_LIMIT_FIJA);
if (isNaN(PAGE_LIMIT) || PAGE_LIMIT < 100) PAGE_LIMIT = 500;

// Cada cuantos articulos se manda un POST.
//
// MEDIDO el 07/09/2026: el costo de un doPost es casi todo FIJO (~5 s), no por
// articulo. Seis POSTs de 200 tardaron 4.4 a 5.3 s cada uno, contra 5.8 a 8.4 s
// de POSTs de 100. O sea que llevar mas articulos por viaje sale gratis, y lo que
// se paga es la cantidad de viajes: cada POST relee los encabezados, la columna A
// completa de la planilla y el bloque del lote.
//
// Con 1000: 20.000 articulos son 21 POSTs en vez de 101, y la corrida baja de unos
// 13 minutos a unos 7. Se alinea con PAGE_LIMIT para que cada pagina del GET
// alimente exactamente un POST.
//
// No conviene subirlo mucho mas: el body pasa a pesar ~0.5 MB con 1000 items, y la
// mejora se aplana porque el piso pasa a ser el tiempo de lectura de Velneo
// (~9.6 s por cada 1000 articulos, que no depende de esto).
var POST_CADA = 1000;

// ================= TABLAS =================
var T_ART_M       = "sygemat_corralon_dat/ART_M";
var T_ART_PRV_G   = "sygemat_corralon_dat/ART_PRV_G";
var T_ART_BON_M   = "sygemat_corralon_dat/ART_BON_M";
var T_VTA_TAR_ART = "sygemat_corralon_dat/VTA_TAR_ART_G";
var T_VTA_TAR_G   = "sygemat_corralon_dat/VTA_TAR_G";
var T_FPG_PRV_M   = "sygemat_corralon_dat/FPG_PRV_M";
var T_UND_MED_M   = "sygemat_corralon_dat/UND_MED_M";

// ================= INDICES =================
// Los cuatro verificados contra vDevelop el 06/09/2026. No adivinar: un nombre de
// indice equivocado devuelve 0 resultados o tira excepcion, y las dos cosas son
// indistinguibles de "este articulo no tiene registros relacionados".
var IDX_ART_REF    = "REF";          // ART_M por REF
var IDX_ARTPRV_ART = "ART_PRV";     // ART_PRV_G. Ver la nota de abajo
var IDX_BON_ARTPRV = "ART_PRV_G";    // ART_BON_M por el ID de ART_PRV_G
var IDX_TARIFA     = "ART_VTA_TAR";  // VTA_TAR_ART_G por [articulo, lista]

// ⚠️ IDX_ARTPRV_ART es un indice COMPUESTO de dos partes: ART + PRV. Se lo usa con
// UN solo valor (el articulo), aprovechando la busqueda por clave parcial de
// Velneo. Es correcto asi: NO agregarle un segundo valor "para completarlo", porque
// entonces habria que conocer el proveedor de antemano y es justo lo que se quiere
// averiguar.

// Tope de columnas ART_M.<CAMPO> que se leen por articulo, igual que el
// CAMPO_DIRECTO_MAX del importador.
var CAMPO_PASO_MAX = 30;
var RE_CAMPO_PASO_R = /^ART_M\.([A-Z][A-Z0-9_]*)$/;
var _camposPaso = null;

// ================= ESTADO =================
var runId        = new Date().getTime();
var inicioMs     = runId;
var buffer       = [];
var lotesEnviados = 0;
var verificados  = 0;
var difTotales   = 0;
var noEncontrados = 0;
var detalles     = "";
// Cuenta SOLO los problemas del proceso, no las diferencias encontradas. Es lo
// que sale en CON_ERR y lo que le permite al proceso llamador decidir el mensaje
// sin tener que parsear RES.
var problemas    = 0;
// El XMLHttpRequest de Velneo sigue el redirect de Apps Script re-POSTeando, y
// googleusercontent devuelve 405. El doPost YA CORRIO (el reporte se escribe),
// pero la respuesta se pierde y con ella el conteo de diferencias. Este flag
// evita informar "0 diferencias" cuando en realidad no lo sabemos.
var respuestaLeida = false;
var encabezadosCliente = {};
var listasExistentes = [];
var unidadesUsadas   = [];
var _tCounter = 0;
var _fallosIndice = { art: 0, artprv: 0, bon: 0 };

// Si alguno queda desconocido no se manda, y el WebApp saltea el chequeo cruzado.
var flagsVelneo = {};
var _fCos = flagDeVar("COS_TIE_IVA", COS_TIE_IVA_FIJO);
var _fPre = flagDeVar("PRE_TIE_IVA", PRE_TIE_IVA_FIJO);
if (_fCos !== null) flagsVelneo.costoConIva  = _fCos;
if (_fPre !== null) flagsVelneo.precioConIva = _fPre;

alert("Inicio de reconciliacion: " + (new Date(inicioMs)).toString()
  + (MUESTRA > 0 ? (" (muestra de " + MUESTRA + ")") : " (completa)"));

// Sin las URLs no hay nada que hacer. Se distinguen las DOS causas posibles porque
// se arreglan de forma distinta, y un mensaje generico obliga a adivinar.
var _faltaUrl = "";

if (!URL_MACRO) {
  _faltaUrl = "no llego ninguna URL."
    + " El boton de Sygemat tiene que cargar la variable URL (asi, en mayusculas)"
    + " con la que genera el menu de la planilla: Importacion -> Datos para"
    + " reconciliacion. Si el proceso se corre a mano desde vDevelop, cargar"
    + " URL_FIJA arriba de este script.";

} else if (!URL_POST) {
  _faltaUrl = "la URL recibida no tiene tipo=articulos ni tipo=reconciliacion, asi que"
    + " no se pudo derivar la del POST. Recibida: " + URL_MACRO
    + " -- Hay que pegar la URL COMPLETA que da el menu de la planilla, que ya trae"
    + " ?tipo=articulos&spreadsheetId=...&token=... . La URL pelada del deployment"
    + " (la que termina en /exec y nada mas) no alcanza: no dice que planilla mirar"
    + " ni lleva el token.";
}

if (_faltaUrl) {
  alert("RECONCILIACION NO CONFIGURADA: " + _faltaUrl
    + " || La URL se busco en: la variable URL del proceso, y despues en URL_FIJA."
    + " Ninguna de las dos trajo nada usable.");
}

// ================= FLUJO PRINCIPAL =================
try {
  if (_faltaUrl) throw _faltaUrl;

  informar("URL tomada de " + _origenUrl + ": " + URL_MACRO);
  informar("muestra: " + (MUESTRA > 0 ? ("los primeros " + MUESTRA + " articulos")
    : "TODOS los articulos") + ", segun " + _origenMuestra + ".");

  listasExistentes = leerListasVtaTarG();
  unidadesUsadas   = leerUnidadesMedida();

  var pageOffset = 0;
  var primerLote = true;

  while (true) {

    var page = getPagina(pageOffset, PAGE_LIMIT);
    var filas = page.rows;
    var filasLen = (filas ? filas.length : 0);
    if (!filasLen) break;

    if (primerLote && page.meta) encabezadosCliente = page.meta;
    var esUltimaPagina = (page.done === true);

    for (var i = 0; i < filasLen; i++) {

      if (MUESTRA > 0 && verificados >= MUESTRA) break;

      var sku = cellStrR(filas[i], "SKU Propio", "");
      if (!sku) continue;

      try {
        buffer.push(readbackArticulo(sku, filas[i]));
      } catch (eArt) {
        buffer.push({ sku: sku, encontrado: false });
        avisar("no se pudo leer el articulo " + sku + ": " + eArt);
      }

      verificados++;

      if (buffer.length >= POST_CADA) {
        enviarLote(false, primerLote);
        primerLote = false;
      }

      filas[i] = null;
    }

    if (MUESTRA > 0 && verificados >= MUESTRA) break;

    pageOffset = (page.nextOffset !== undefined && page.nextOffset !== null)
      ? page.nextOffset : (pageOffset + filasLen);

    filas = null;
    page.rows = null;
    page = null;

    safeProcessEventsR();

    // Corta sin pedir una pagina vacia de mas, igual que el importador.
    if (esUltimaPagina) break;
  }

  // Lote final: cierra el reporte aunque el buffer haya quedado vacio.
  enviarLote(true, primerLote);

} catch (eMain) {
  avisar("ERROR GENERAL: " + eMain);
}

// ================= AVISOS DE INDICE MAL NOMBRADO =================
// Si NINGUN articulo se encontro, lo mas probable no es que falten todos: es que
// el nombre del indice esta mal. Vale la pena decirlo en vez de dejar un reporte
// con 20.000 "falta el articulo".
if (verificados > 0 && noEncontrados === verificados) {
  avisar("no se encontro NINGUN articulo de la planilla en ART_M. Si los SKU SI estan"
    + " importados, revisar el indice '" + IDX_ART_REF + "' en vDevelop.");
}
if (_fallosIndice.artprv > 0 && _fallosIndice.artprv === verificados) {
  avisar("ningun articulo tuvo ART_PRV_G. Revisar el indice '" + IDX_ARTPRV_ART
    + "' en vDevelop: tiene que ser compuesto ART+PRV, con ART primero.");
}
if (_fallosIndice.bon > 0 && _fallosIndice.bon === verificados) {
  avisar("ningun articulo tuvo bonificaciones. Si esperabas alguna, revisar el indice"
    + " '" + IDX_BON_ARTPRV + "' en ART_BON_M.");
}

// ================= RESULTADOS =================
root.setVar("CON_VER", verificados);
// -1 = desconocido. Un 0 aca significaria "no hay diferencias", y no es lo mismo
// que "no pudimos leer cuantas hay".
root.setVar("CON_DIF", respuestaLeida ? difTotales : -1);
root.setVar("CON_ERR", problemas);
root.setVar("RES", detalles);

var finMs = new Date().getTime();
var seg = Math.round((finMs - inicioMs) / 1000);
var porSeg = (seg > 0) ? (Math.round(verificados / seg * 10) / 10) : verificados;

// Se nombra la planilla a proposito: si alguien se olvido de cambiar el
// SPREADSHEET_ID, esto es lo que lo delata antes de creerle al reporte.
alert("Fin de reconciliacion. " + verificados + " articulos en " + seg + " seg ("
  + porSeg + " art/seg). Diferencias: "
  + (respuestaLeida ? difTotales : "ver la hoja Comparacion_Importacion (no se pudo"
      + " leer la respuesta del WebApp, ver RES)")
  + ". Problemas del proceso: " + problemas
  + ". Planilla: " + (SPREADSHEET_ID || "(por URL completa)") + ".");

// RES viaja por setVar y NO se ve en la consola de mensajes de vAdmin. Se vuelca
// por alert en tramos, que es lo unico que la consola muestra siempre.
if (detalles) {
  var resto = detalles;
  var parte = 1;
  while (resto.length > 0) {
    alert("RES (" + parte + "): " + resto.substring(0, 900));
    resto = resto.substring(900);
    parte++;
  }
}

// =======================================================================
// =========================== FUNCIONES =================================
// =======================================================================

// ---------- Mensajes de salida ----------
// Dos canales sobre el mismo RES, distinguidos por prefijo:
//   informar() - contexto util, no es un problema. No toca CON_ERR.
//   avisar()   - algo salio mal. Incrementa CON_ERR.
// El tope de 6000 evita que un error por articulo haga crecer RES sin control.
function informar(txt) {
  if (detalles.length < 6000) detalles += "[INFO] " + txt + "\n";
}

function avisar(txt) {
  problemas++;
  if (detalles.length < 6000) detalles += "[AVISO] " + txt + "\n";
}

// ---------- URLs ----------
/**
 * De la URL que pego el operador saca las dos que hacen falta.
 *
 * Se pide UNA sola, igual que en la importacion, y se acepta cualquiera de los
 * dos tipos: la del GET (tipo=articulos) o la del POST (tipo=reconciliacion).
 * La otra sale de cambiar ese parametro, conservando el spreadsheetId y el token
 * que ya vienen adentro.
 *
 * Si la URL no trae ninguno de los dos tipos devuelve vacio, y el flujo principal
 * corta con un mensaje claro. Antes que adivinar, avisar: una URL sin tipo caeria
 * en el doGet por defecto y el POST se perderia sin error.
 */
function derivarUrls(u) {
  u = ("" + (u || "")).trim();
  if (!u) return { get: "", post: "" };

  if (u.indexOf("tipo=articulos") >= 0) {
    return { get: u, post: u.replace("tipo=articulos", "tipo=reconciliacion") };
  }
  if (u.indexOf("tipo=reconciliacion") >= 0) {
    return { get: u.replace("tipo=reconciliacion", "tipo=articulos"), post: u };
  }
  return { get: u, post: "" };   // sin tipo: no se puede derivar
}

/** El spreadsheetId de la URL, solo para poder nombrarlo en el alert final. */
function idDePlanilla(u) {
  var m = ("" + (u || "")).match(/[?&]spreadsheetId=([^&]+)/);
  return m ? m[1] : "";
}

// ---------- Lectura de variables del proceso ----------
// root.varToString devuelve "" tanto si la variable no existe como si esta
// vacia: los dos casos caen al valor fijo, que es lo que queremos.
function textoDeVar(nombre, fijo) {
  var s = "";
  try { s = root.varToString(nombre); } catch (e) { s = ""; }
  s = ("" + (s || "")).trim();
  return s ? s : (("" + (fijo || "")).trim());
}

function enteroDeVar(nombre, fijo) {
  var s = textoDeVar(nombre, "");
  var n = parseInt(s, 10);
  return isNaN(n) ? fijo : n;
}

// Devuelve true, false, o null si no se sabe. El null es importante: hace que el
// chequeo cruzado de IVA no se haga, en vez de hacerse contra un valor inventado.
function flagDeVar(nombre, fijo) {
  var s = textoDeVar(nombre, fijo).toLowerCase();
  if (!s) return null;
  return (s === "1" || s === "si" || s === "s" || s === "true" || s === "y");
}

// ---------- Helpers de celda (mismos criterios que el importador) ----------
function cellStrR(rowObj, key, defVal) {
  var v = (rowObj == null) ? null : rowObj[key];
  if (v === undefined || v === null) return defVal || "";
  v = ("" + v).trim();
  return v ? v : (defVal || "");
}

function cellNumR(rowObj, key) {
  var v = (rowObj == null) ? null : rowObj[key];
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  var s = ("" + v).trim().replace(/\s/g, "").replace(/%/g, "");
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(/,/g, ".");
  else s = s.replace(/,/g, "");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function safeProcessEventsR() {
  try { if (root && typeof root.processEvents === "function") { root.processEvents(); return; } } catch (e) {}
  try { if (app && typeof app.processEvents === "function") { app.processEvents(); return; } } catch (e) {}
}

// ---------- HTTP ----------
function getPagina(offset, limit) {
  _tCounter++;
  var url = URL_MACRO;
  url += (url.indexOf("?") > -1 ? "&" : "?") + "t=" + _tCounter;
  url += "&offset=" + offset + "&limit=" + limit;

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.send();

  if (xhr.readyState != 4) { while (xhr.readyState != 4) safeProcessEventsR(); }
  if (xhr.status != 200) throw ("Error HTTP " + xhr.status + " en el GET -> " + xhr.responseText);

  var data = JSON.parse(xhr.responseText);
  if (data && data.error) throw ("El WebApp devolvio error: " + data.message);

  var rows = (data && data.rows) ? data.rows : [];
  var meta = (data && data.meta && data.meta.encabezados) ? data.meta.encabezados : {};
  var no = (data && data.nextOffset !== undefined && data.nextOffset !== null)
    ? data.nextOffset : (offset + rows.length);

  var done = (data && data.done === true) || (rows.length === 0);
  return { rows: rows, meta: meta, nextOffset: no, done: done };
}

/**
 * POST que sobrevive al redirect de Apps Script.
 *
 * Un WebApp de Apps Script NO responde el POST directo: ejecuta doPost y devuelve
 * un 302 hacia script.googleusercontent.com, donde esta el cuerpo de la respuesta.
 * Lo verificado con curl contra la implementacion nueva:
 *
 *   POST /exec   -> 302 Found, Location: https://script.googleusercontent.com/...
 *   GET  <esa>   -> {"ok":true,...}
 *
 * Segun como maneje redirects el XMLHttpRequest de Velneo puede pasar cualquiera
 * de tres cosas, y las tres se cubren aca:
 *   a) los sigue solo y convierte a GET  -> status 200, no hace falta nada
 *   b) no los sigue                      -> status 302, se sigue a mano
 *   c) los sigue pero re-POSTea          -> status 405, se reintenta con GET
 *
 * OJO: en los casos b) y c) el doPost YA SE EJECUTO. El GET al Location solo
 * recupera la respuesta, no vuelve a escribir nada, asi que no hay riesgo de
 * duplicar el reporte.
 */
function postearConRedirect(url, cuerpo) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, false);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(cuerpo);
  if (xhr.readyState != 4) { while (xhr.readyState != 4) safeProcessEventsR(); }

  if (xhr.status == 200) return { status: 200, text: xhr.responseText };

  // 3xx o 405: la respuesta esta en otra URL. Se busca el Location.
  if (xhr.status == 301 || xhr.status == 302 || xhr.status == 303 || xhr.status == 405) {
    var loc = "";
    try { loc = xhr.getResponseHeader("Location") || ""; } catch (e) { loc = ""; }

    if (!loc) {
      // Sin Location no hay a donde ir, pero el doPost corrio igual: se avisa y se
      // sigue en vez de abortar la reconciliacion entera.
      informar("el POST devolvio HTTP " + xhr.status + " y no hay Location para seguir."
        + " Es el comportamiento esperado en Velneo: el XHR sigue el redirect de Apps"
        + " Script re-POSTeando y googleusercontent responde 405. EL doPost YA SE"
        + " EJECUTO y el reporte se escribio; lo unico que se pierde es el conteo de"
        + " diferencias, que hay que mirar en la hoja Comparacion_Importacion.");
      return { status: 200, text: "{}" };
    }

    var g = new XMLHttpRequest();
    g.open("GET", loc, false);
    g.setRequestHeader("Accept", "application/json");
    g.send();
    if (g.readyState != 4) { while (g.readyState != 4) safeProcessEventsR(); }
    return { status: g.status, text: g.responseText };
  }

  return { status: xhr.status, text: xhr.responseText };
}

/**
 * Manda el buffer al WebApp. Cada POST es independiente: el WebApp no guarda
 * estado entre llamadas, asi que no hay limite de 6 minutos que respetar.
 */
function enviarLote(esUltimo, esPrimero) {
  if (!esUltimo && !buffer.length) return;

  var payload = {
    runId: runId,
    done: esUltimo === true,
    primerLote: esPrimero === true,
    muestra: (MUESTRA > 0) ? MUESTRA : 0,
    totalArticulos: verificados,
    // Segundos transcurridos hasta este lote. En el ultimo (done:true) es
    // practicamente el total de la corrida, y queda escrito en el reporte: asi el
    // dato de rendimiento no depende de encontrar un alert en la consola de vAdmin.
    segundos: Math.round((new Date().getTime() - inicioMs) / 1000),
    flagsVelneo: flagsVelneo,
    encabezados: encabezadosCliente,
    listasVtaTarG: listasExistentes,
    undMedUsadas: unidadesUsadas,
    items: buffer
  };

  try {
    var resp = postearConRedirect(URL_POST, JSON.stringify(payload));

    if (resp.status != 200) {
      avisar("el POST fallo con HTTP " + resp.status + ": " + resp.text);
    } else {
      var r = JSON.parse(resp.text);
      if (r && r.error) {
        avisar("el WebApp rechazo el lote: " + r.message);
      } else if (r) {
        respuestaLeida = true;
        difTotales = (r.totalEnHoja !== undefined) ? r.totalEnHoja : difTotales;
        if (r.sinContraparte > 0) {
          avisar(r.sinContraparte + " articulo(s) del lote no se encontraron en la planilla."
            + " Revisar que la URL apunte a la planilla correcta.");
        }
      }
    }
  } catch (ePost) {
    avisar("excepcion enviando el lote: " + ePost);
  }

  lotesEnviados++;
  buffer = [];
  safeProcessEventsR();
}

// ---------- Columnas de paso ART_M.<CAMPO> ----------
// Se descubren una sola vez: el WebApp arma todas las filas con el mismo juego
// de claves. El proceso NO decide cual comparar ni cual ignorar: lee todas las
// que encuentra y esa decision la toma el WebApp, que es donde vive la lista de
// campos reservados y donde se puede cambiar sin redeployar Velneo.
function camposPasoDe(filaJson) {
  if (_camposPaso !== null) return _camposPaso;

  var res = [];
  var k, m;
  for (k in filaJson) {
    if (!filaJson.hasOwnProperty(k)) continue;
    m = ("" + k).match(RE_CAMPO_PASO_R);
    if (!m) continue;
    if (res.length >= CAMPO_PASO_MAX) break;
    res.push(m[1]);
  }

  _camposPaso = res;
  // Informativo a proposito: que se hayan detectado columnas de paso NO es un
  // problema, y verlas listadas es lo que delata un identificador mal escrito.
  if (res.length) informar("columnas de paso a verificar: " + res.join(", "));
  return res;
}

/**
 * Lee del registro de ART_M los campos de las columnas de paso. Cada uno en su
 * try/catch: si el identificador no existe, Velneo tira excepcion o devuelve
 * vacio, y en los dos casos el WebApp lo reporta como diferencia.
 */
function leerCamposPaso(regArt, filaJson) {
  var campos = camposPasoDe(filaJson);
  var out = {};
  for (var i = 0; i < campos.length; i++) {
    try {
      out[campos[i]] = regArt.fieldToString(campos[i]);
    } catch (e) {
      out[campos[i]] = "";
    }
  }
  return out;
}

// ---------- Readback de un articulo ----------
/**
 * Lee de la base todo lo que la reconciliacion necesita de un articulo.
 * SOLO LECTURA. Devuelve el objeto que espera Reconciliacion.txt.
 */
function readbackArticulo(sku, filaJson) {
  var it = { sku: sku, encontrado: false, refCount: 0 };

  // ART_M por REF. Puede haber varios: el importador nunca hace upsert, asi que
  // cada corrida crea uno nuevo. Se toma el de ID mas alto (el ultimo importado)
  // y se reporta la cantidad, que es informacion que hoy no tenemos.
  var lArt = new VRegisterList(root);
  lArt.setTable(T_ART_M);

  lArt.load(IDX_ART_REF, [sku]);

  var n = lArt.size();
  it.refCount = n;
  if (n <= 0) {
    noEncontrados++;
    return it;
  }

  var idArt = 0;
  for (var i = 0; i < n; i++) {
    var cand = lArt.readAt(i).fieldToInt("ID");
    if (cand > idArt) idArt = cand;
  }
  it.encontrado = true;
  it.artId = idArt;

  // Se relee el ART_M por ID para quedarse con el registro correcto: el load por
  // REF puede haber traido varios y readAt(i) no viene ordenado por ID.
  var lArtId = new VRegisterList(root);
  lArtId.setTable(T_ART_M);
  lArtId.load("ID", [String(idArt)]);
  if (lArtId.size() > 0) {
    it.camposDirectos = leerCamposPaso(lArtId.readAt(0), filaJson);
  }

  // ART_PRV_G
  var lPrv = new VRegisterList(root);
  lPrv.setTable(T_ART_PRV_G);

  // Clave parcial: solo el articulo, sobre el indice compuesto ART+PRV.
  lPrv.load(IDX_ARTPRV_ART, [String(idArt)]);

  if (lPrv.size() > 0) {
    var rp = lPrv.readAt(0);
    it.artPrvId  = rp.fieldToInt("ID");
    it.cos       = rp.fieldToString("COS");
    it.cosMonExt = rp.fieldToString("COS_MON_EXT");
    it.cosFlt    = rp.fieldToString("COS_FLT");

    var idFpg = rp.fieldToInt("FPG_PRV_M");
    if (idFpg > 0) it.fpg = leerFormaPago(idFpg);

    it.bonif = leerBonificaciones(it.artPrvId);
  } else {
    it.artPrvId = 0;
    it.bonif = [];
    _fallosIndice.artprv++;
  }

  // Tarifas: SOLO de las listas que la planilla trae con dato. Velneo crea una
  // fila por cada lista existente con la rentabilidad base parametrizada, asi que
  // leer las que la planilla dejo vacias no aportaria nada y costaria lecturas.
  it.listas = leerTarifas(idArt, filaJson);

  return it;
}

function leerFormaPago(idFpg) {
  var l = new VRegisterList(root);
  l.setTable(T_FPG_PRV_M);
  l.load("ID", [String(idFpg)]);
  if (l.size() <= 0) return null;
  var r = l.readAt(0);
  return { porDto: r.fieldToString("POR_DTO"), name: r.fieldToString("NAME") };
}

function leerBonificaciones(idArtPrv) {
  var res = [];
  if (!idArtPrv) return res;

  var l = new VRegisterList(root);
  l.setTable(T_ART_BON_M);

  l.load(IDX_BON_ARTPRV, [String(idArtPrv)]);

  var n = l.size();
  if (n <= 0) { _fallosIndice.bon++; return res; }

  for (var i = 0; i < n; i++) {
    var r = l.readAt(i);
    res.push({ name: r.fieldToString("NAME"), bon: r.fieldToString("BON") });
  }
  return res;
}

/** Numeros de lista que la fila de la planilla trae con precio o rentabilidad. */
function listasConDato(filaJson) {
  var nums = [];
  var vistos = {};
  var k, m, num;

  for (k in filaJson) {
    if (!filaJson.hasOwnProperty(k)) continue;
    m = ("" + k).match(/^(?:Rent\.?|Precio)\s+[Ll]ista\s+(\d+)$/);
    if (!m) continue;
    num = parseInt(m[1], 10);
    if (isNaN(num) || num < 1 || num > 50) continue;
    if (vistos[num]) continue;
    if (cellNumR(filaJson, k) === 0) continue;
    vistos[num] = true;
    nums.push(num);
  }

  // La lista 1 usa "Precio Lista 1" con L mayuscula; el regex ya la cubre.
  nums.sort(function (a, b) { return a - b; });
  return nums;
}

function leerTarifas(idArt, filaJson) {
  var res = [];
  var nums = listasConDato(filaJson);
  if (!nums.length) return res;

  var l = new VRegisterList(root);
  l.setTable(T_VTA_TAR_ART);

  for (var i = 0; i < nums.length; i++) {
    var nro = nums[i];
    try {
      l.load(IDX_TARIFA, [idArt, String(nro)]);
      if (l.size() <= 0) {
        res.push({ n: nro, existeTarifa: false });
        continue;
      }
      var r = l.readAt(0);
      res.push({
        n: nro, existeTarifa: true,
        porRen: r.fieldToString("POR_REN"),
        pre:    r.fieldToString("PRE")
      });
    } catch (e) {
      res.push({ n: nro, existeTarifa: false });
    }
  }
  return res;
}

// ---------- Contexto global (una lectura por corrida, no por articulo) ----------
function leerListasVtaTarG() {
  var res = [];
  try {
    var l = new VRegisterList(root);
    l.setTable(T_VTA_TAR_G);
    l.load("EMP", ["1"]);
    for (var i = 0; i < l.size(); i++) res.push(l.readAt(i).fieldToInt("ID"));
    res.sort(function (a, b) { return a - b; });
  } catch (e) {
    avisar("no se pudieron leer las listas de VTA_TAR_G: " + e);
  }
  return res;
}

function leerUnidadesMedida() {
  var res = [];
  try {
    var l = new VRegisterList(root);
    l.setTable(T_UND_MED_M);
    l.load("CLV", []);
    for (var i = 0; i < l.size(); i++) {
      var c = l.readAt(i).fieldToString("CLV");
      if (c) res.push(c);
    }
  } catch (e) {
    avisar("no se pudieron leer las unidades de UND_MED_M: " + e);
  }
  return res;
}
