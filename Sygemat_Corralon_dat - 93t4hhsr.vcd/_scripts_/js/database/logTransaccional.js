/*
 * --------------------------
 * Graba el log transaccional
 * --------------------------
 */

// Leer  y evaluar parámetro LOG_TRN para ver si el módulo está activo
var logTrn = theApp.globalVarToString("sygemat_corralon_dat/LOG_TRN");

if( 0 !== logTrn )
{
	// Leer parámetros de entrada
	var operacion = theApp.globalVarToString("sygemat_corralon_dat/LOG_TRN_OPE");
	var claves    = theApp.globalVarToString("sygemat_corralon_dat/LOG_TRN_CLV");

	// Preparar las variables
	var tablaInfo       = theRegisterIn.tableInfo();
	var tablaIdRef      = tablaInfo.idRef();
	var	numCampos       = tablaInfo.fieldCount();
	var	campoId         = "";
	var fecha           = new Date();
	var fechaFormateada = formateaFecha(fecha);
	var horaFormateada  = fecha.toTimeString();
		horaFormateada  = horaFormateada.split(' ')[0];
	var maquina         = theApp.sysMachineName();
	var usuario         = theApp.userName();
	var cambios         = "[{";

	// Se recorren todos los campos para saber si ha habido cambios
	for (var numCampo = 0; numCampo < numCampos; numCampo++)
	{	
		// Si ha cambiado el campo se añade al log
		if (theRegisterIn.isFieldModified(numCampo))
		{
			/* Se sustituyen, por una etiqueta, los caracteres restringidos por el uso de json para contener el log
			   Lista de caracteres reservados:
				{
				}
				[
				]
				'
				"
				\
				\r\n (salto de línea)
			*/
			campoId    = tablaInfo.fieldId(numCampo);
			campoValor = theRegisterIn.fieldToString(numCampo).replace(/\r?\n/g, "<br>");
			campoValor = campoValor.replace(/{/g, "<llaveOpen>");
			campoValor = campoValor.replace(/}/g, "<llaveClose>");
			campoValor = campoValor.replace(/'/g, "<coma>");
			campoValor = campoValor.replace(/"/g, "<comaDoble>");
			campoValor = campoValor.replace(/\\/g, "<escape>");	
			cambios += '"' + campoId + '":"' + campoValor + '",';
		}
	}
	cambios += "}]";

	// Se prepara el JSON del log de la operación transacional
	var log = "{"                                          + "\n" +
			  "'fecha': '"        + fechaFormateada + "'," + "\n" +
			  "'hora': '"         + horaFormateada  + "'," + "\n" +
			  "'maquina': '"      + maquina         + "'," + "\n" +
			  "'usuario': '"      + usuario         + "'," + "\n" +
			  "'operacion': '"    + operacion       + "'," + "\n" +
			  "'cambios': '"      + cambios         + "'," + "\n" +
			  "},"                                         + "\n";

	// Leer el registro del log
	var registro = new VRegister(theRoot);
	registro.setTable("sygemat_corralon_dat/LOG_TRN_W");
	registro.readRegister("TAB_CLV", [tablaIdRef, claves], VRegister.SearchThis);
	if (registro.exist())
	{
		var campoLog = registro.fieldToString("LOG");
		registro.setField("LOG", log + campoLog);
		registro.modifyRegister();
	}
	else
	{
		registro.setField("LOG", log);
		registro.setField("TAB", tablaIdRef);
		registro.setField("CLV", claves);
		registro.addRegister();
	}
}

// -------------------------------------
// Formatea fecha en dd-mm-aaaa
// -------------------------------------
function formateaFecha(fecha) {
  function pad(s) { return (s < 10) ? '0' + s : s; }
  var d = new Date(fecha);
  return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
}