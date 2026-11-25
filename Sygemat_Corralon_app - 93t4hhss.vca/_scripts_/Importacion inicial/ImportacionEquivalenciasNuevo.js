importClass("VProcess");
importClass("XMLHttpRequest");

var URL_MACRO = theRoot.varToString("URL");

// ================== GET JSON NUEVO (array de objetos) ==================
function getEquivalenciasDesdeGoogle() {

  var url = URL_MACRO;

  // Evitar cache
  url += (url.indexOf("?") > -1 ? "&" : "?") + "t=" + new Date().getTime();

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, false); // síncrono (Velneo)
  xhr.setRequestHeader("Accept", "application/json");
  xhr.send();

  while (xhr.readyState != 4) {
    xhr.processEvents();
  }

  if (xhr.status !== 200) {
    alert("Error HTTP " + xhr.status + " -> " + xhr.responseText);
  }

  var text = xhr.responseText;
  if (!text || text.charAt(0) !== "[") {
    alert("Respuesta inválida, no es JSON array");
  }

  var data = JSON.parse(text);

  // Si viene vacío, devolvemos [] (no es error)
  if (!data || !(data instanceof Array)) {
    alert("JSON vacío o inválido");
  }

  return data; // Array de objetos
}

// ================== Helpers ==================
function cell(rowObj, key) {
  if (!rowObj) return null;
  if (!(key in rowObj)) return null;
  var v = rowObj[key];
  if (v === undefined) return null;
  return v;
}
function cellStr(rowObj, key, defVal) {
  var v = cell(rowObj, key);
  if (v === null) return defVal || "";
  return ("" + v).trim();
}
function cellNum(rowObj, key, defVal) {
  var v = cell(rowObj, key);
  if (v === null || v === "") return (defVal === undefined ? 0 : defVal);

  // soporta coma decimal (7,4)
  var s = ("" + v).trim().replace(",", ".");
  var n = parseFloat(s);

  return isNaN(n) ? (defVal === undefined ? 0 : defVal) : n;
}

// ================== MAIN ==================
var filas;
try {
  filas = getEquivalenciasDesdeGoogle();
} catch (e) {
  alert("No se pudo obtener JSON: " + e);
  theRoot.setVar("CON_OK", 0);
  theRoot.setVar("CON_KO", 0);
  theRoot.setVar("RES", "Error obteniendo JSON: " + e);
  throw e; // cortamos el proceso
}

// Claves del JSON (fila 2 del Sheet)
var K_ref        = "SKU Articulo";
var K_uniMedOri  = "Unidad de medida origen";
var K_uniMedDes  = "Unidad de medida destino";
var K_valConv    = "Valor de conversion";

var bloqueTranscacion  = 500;
var contadorRegistroOK = 0;
var contadorRegistroKO = 0;
var detallesError      = "";

var nuevaTrans = false;
var hayTrans = theRoot.existTrans();
if (!hayTrans) {
  nuevaTrans = theRoot.beginTrans("Importando equivalencias bloque 0");
}

if (hayTrans || nuevaTrans) {

  for (var i = 0; i < filas.length; i++) {

    var r = filas[i]; // objeto directo

    var ref         = cellStr(r, K_ref, "");
    var uni_med_ori = cellStr(r, K_uniMedOri, "");
    var uni_med_des = cellStr(r, K_uniMedDes, "");
    var valor       = cellNum(r, K_valConv, 0);

    // Validaciones mínimas
    if (!ref) {
      contadorRegistroKO++;
      detallesError += "Registro " + (i + 1) + " => REF vacío\n";
      continue;
    }
    if (!uni_med_ori || !uni_med_des) {
      contadorRegistroKO++;
      detallesError += "Registro " + (i + 1) + " => REF " + ref + " unidad origen/destino vacía\n";
      continue;
    }
    if (valor <= 0) {
      contadorRegistroKO++;
      detallesError += "Registro " + (i + 1) + " => REF " + ref + " valor conversion inválido: " + valor + "\n";
      continue;
    }

    // Verificar artículo
    var codigoArticulo = verificarArticulo(ref);
    if (codigoArticulo === "") {
      contadorRegistroKO++;
      detallesError += "Registro " + (i + 1) + " => REF no existe en ART_M: " + ref + "\n";
      continue;
    }

    // Alta equivalencia
    var registro = new VRegister(theRoot);
    registro.setTable("sygemat_corralon_dat/ART_EQU_IMP");
    registro.setField("REF", ref);
    registro.setField("UND_MED_DES", uni_med_des);
    registro.setField("UND_MED_ORI", uni_med_ori);
    registro.setField("VAL_CON", valor);
    registro.addRegister();

    contadorRegistroOK++;

    // Commit por bloques
    if ((i % bloqueTranscacion) === 0 && i > 0) {
      theRoot.commitTrans();
      nuevaTrans = theRoot.beginTrans("Importando equivalencias bloque " + (i / bloqueTranscacion));
    }
  }
}

// cerrar transacción si la abrimos nosotros
if (nuevaTrans) {
  theRoot.commitTrans();
}

// resultados
theRoot.setVar("CON_OK", contadorRegistroOK);
theRoot.setVar("CON_KO", contadorRegistroKO);
theRoot.setVar("RES", detallesError);

// ================== Buscar artículo por SKU ==================
function verificarArticulo(codigoArticulo) {
  var listaArticulo = new VRegisterList(theRoot);
  listaArticulo.setTable("sygemat_corralon_dat/ART_M");
  listaArticulo.load("SKU", [codigoArticulo]);
  return (listaArticulo.size() > 0) ? listaArticulo.readAt(0).fieldToString("ID") : "";
}
