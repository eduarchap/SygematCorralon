/* ===========================================================================
 * permiso_alta_masiva.js
 *
 * S30-81 (ronda 2, E3 / RN-9): el permiso del alta masiva de articulos tiene
 * que frenar tambien en el servidor, no solo esconder la opcion del menu.
 *
 * Un usuario puede usar el alta masiva si cumple CUALQUIERA de estas dos:
 *
 *   1) Tiene el permiso "sygemat_corralon_dat/ArticulosAltaMasiva" (el mismo
 *      con el que el formulario ART_M_MEN_NUE muestra el boton "Alta masiva").
 *      Se lee del campo PRM de USR_M, igual que la funcion PRM_USR: etiquetas
 *      "@proyecto/Etiqueta" separadas por espacios.
 *      (Agregado por el caso ETRURIA: el usuario veia el boton pero el
 *      servidor lo rechazaba porque no habia opcion de menu dinamico.)
 *
 *   2) VE en su menu alguna opcion dinamica (PRS_MEN_W, no TEST) cuya accion
 *      sea ART_ALT_MAS, ART_GEN_PLA o ART_IMP_PLA. Se evalua con la MISMA
 *      regla que js/interface/menu.js:
 *        - USR_GRP_ALL = 0: la opcion es de los grupos listados en USR_GRP.
 *        - USR_GRP_ALL = 1: la opcion es de todos MENOS los grupos listados.
 *      Los grupos del usuario salen de USR_GRP_USR_M (indice USR_USR_GRP).
 *
 * Es un solo permiso para generar la planilla y para importarla.
 * Si no se puede saber quien es el usuario, o no cumple ninguna de las dos,
 * se rechaza (ante la duda no se deja pasar).
 *
 * Uso:  var perm = permisoAltaMasiva();  if (!perm.ok) { ... perm.msj ... }
 * =========================================================================== */

var PERM_PROY_DAT = "sygemat_corralon_dat";
var PERM_ACCIONES = ["ART_ALT_MAS", "ART_GEN_PLA", "ART_IMP_PLA"];
var PERM_ETQ = "sygemat_corralon_dat/ArticulosAltaMasiva";
var PERM_MSJ = "Sin permiso para el alta masiva de artículos";

function permTrim(v) { return String(v == null ? "" : v).replace(/^\s+|\s+$/g, ""); }

/** Normaliza un ID numerico: "2", "2.000000" y " 2 " dan "2". */
function permNormId(v) {
	var s = permTrim(v);
	var n = parseFloat(s);
	return isNaN(n) ? s : String(n);
}

/** ¿El texto (idRef o id de objeto de la opcion de menu) es una de las acciones del alta masiva? */
function permEsAccion(texto) {
	var s = permTrim(texto);
	if (s === "") return false;
	for (var i = 0; i < PERM_ACCIONES.length; i++) {
		var a = PERM_ACCIONES[i];
		if (s === a) return true;
		if (s.length > a.length && s.substring(s.length - a.length - 1) === "@" + a) return true;
	}
	return false;
}

/** ID del usuario que ejecuta: por su nombre (theApp.userName) y, si no, por la variable global CUR_USR_ID. */
function permUsuario() {
	var res = { nombre: permTrim(theApp.userName()), id: "" };
	if (res.nombre !== "") {
		var lu = new VRegisterList(theRoot);
		lu.setTable(PERM_PROY_DAT + "/USR_M");
		if (lu.load("NAME", [res.nombre])) {
			for (var i = 0; i < lu.size() && res.id === ""; i++) {
				var r = lu.readAt(i);
				if (permTrim(r.fieldToString("NAME")).toLowerCase() === res.nombre.toLowerCase()) res.id = permNormId(r.fieldToString("ID"));
			}
		}
	}
	if (res.id === "") res.id = permNormId(theApp.globalVarToString(PERM_PROY_DAT + "/CUR_USR_ID"));
	if (res.id === "0") res.id = "";
	return res;
}

/** ¿El usuario tiene el permiso ArticulosAltaMasiva? Misma lectura que la funcion PRM_USR (campo PRM de USR_M). */
function permTieneEtiqueta(usrId) {
	var lu = new VRegisterList(theRoot);
	lu.setTable(PERM_PROY_DAT + "/USR_M");
	if (!lu.load("ID", [usrId]) || lu.size() < 1) return false;
	var partes = String(lu.readAt(0).fieldToString("PRM")).split(/\s+/);
	for (var i = 0; i < partes.length; i++) {
		if (permTrim(partes[i]) === "@" + PERM_ETQ) return true;
	}
	return false;
}

/** { ok, usuario, msj }: ok = el usuario puede usar el alta masiva. */
function permisoAltaMasiva() {
	var res = { ok: false, usuario: "", msj: PERM_MSJ };
	var usr = permUsuario();
	res.usuario = usr.nombre;
	if (usr.id === "") {
		res.msj = PERM_MSJ + " (no se pudo identificar al usuario" + (usr.nombre !== "" ? " '" + usr.nombre + "'" : "") + ")";
		return res;
	}

	// 1) Permiso del boton (ArticulosAltaMasiva): si lo tiene, puede usar el alta masiva.
	if (permTieneEtiqueta(usr.id)) { res.ok = true; return res; }

	// 2) Grupos del usuario
	var misGrupos = {};
	var lg = new VRegisterList(theRoot);
	lg.setTable(PERM_PROY_DAT + "/USR_GRP_USR_M");
	if (lg.load("USR_USR_GRP", [usr.id])) {
		for (var g = 0; g < lg.size(); g++) misGrupos[permNormId(lg.readAt(g).fieldToString("USR_GRP"))] = true;
	}

	// Opciones de menu del alta masiva y regla de grupos de menu.js
	var lm = new VRegisterList(theRoot);
	lm.setTable(PERM_PROY_DAT + "/PRS_MEN_W");
	if (lm.load("ID", [])) {
		for (var i = 0; i < lm.size(); i++) {
			var m = lm.readAt(i);
			var tst = permTrim(m.fieldToString("TST")).toLowerCase();
			if (tst === "1" || tst === "true") continue;
			if (!permEsAccion(m.fieldToString("OBJ_ID_REF")) && !permEsAccion(m.fieldToString("OBJ_ID"))) continue;
			var todos = permTrim(m.fieldToString("USR_GRP_ALL")).toLowerCase();
			todos = (todos === "1" || todos === "true");
			var lista = permTrim(m.fieldToString("USR_GRP")).split(",");
			var encontrado = false;
			for (var k = 0; k < lista.length && !encontrado; k++) {
				if (permTrim(lista[k]) !== "" && misGrupos.hasOwnProperty(permNormId(lista[k]))) encontrado = true;
			}
			if ((todos && !encontrado) || (!todos && encontrado)) { res.ok = true; return res; }
		}
	}

	res.msj = PERM_MSJ + " (al grupo del usuario le falta el permiso Articulos alta masiva)";
	return res;
}