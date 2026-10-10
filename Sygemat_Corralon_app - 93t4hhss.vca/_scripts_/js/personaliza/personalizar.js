// ----------------------------------------
// Ejecutar script de personalización
// ----------------------------------------
var personalizar = function ()
{
	// --------------------------------------------------------------
	// Lectura de los registros de personalización del objeto
	// --------------------------------------------------------------
	var lista = new VRegisterList(theRoot);
	lista.setTable("sygemat_corralon_dat/PRS_OBJ_MEM_W");	
	var claves = [];
	claves.push(theRoot.dataView().objectInfo().type());
	claves.push(theRoot.dataView().objectInfo().idRef());
	lista.load("OBJ_TIP_ID_REF", claves);
	var numRegistros = lista.size();

	// ---------------------------------------------------------------------------------------------------------
	// Añadimos el acceso al objeto al log de sesión (Solo si el log está activo y el objeto no está amalgamado)
	// ---------------------------------------------------------------------------------------------------------
	if (theApp.globalVarToInt("sygemat_corralon_dat/LUC_LOG_ON") === 1) {
		if (theRoot.dataView().parentDataView() == null) {
			var fecha           = new Date();
			var fechaFormateada = formateaFecha(fecha);
			var horaFormateada  = fecha.toTimeString();
				horaFormateada  = horaFormateada.split(' ')[0];
			var maquina         = theApp.sysMachineName();
			var usuario         = theApp.userName();
			var tipo_id         = theRoot.dataView().objectInfo().type();
			var tipo_name       = nombreTipoObjeto(theRoot.dataView().objectInfo().type());
			var objeto_name     = theRoot.dataView().objectInfo().name();
			var objeto_idref    = theRoot.dataView().objectInfo().idRef();
			var id              = 0;
			var name            = "";
			if (theRoot.dataView().objectInfo().inputType() != VObjectInfo.IONone )
			{
				if (theRoot.dataView().isListType() == true) {
					id     = theRegisterListIn.listSize();
				} else {
					id     = theRegisterIn.fieldToString("ID");
					name   = theRegisterIn.fieldToString("NAME");
				};
			};
			
			var logSesion = "{"                                          + "\n" +
							"'fecha': '"        + fechaFormateada + "'," + "\n" +
							"'hora': '"         + horaFormateada  + "'," + "\n" +
							"'maquina': '"      + maquina         + "'," + "\n" +
							"'usuario': '"      + usuario         + "'," + "\n" +
							"'tipo_id': '"      + tipo_id         + "'," + "\n" +
							"'tipo_name': '"    + tipo_name       + "'," + "\n" +
							"'objeto_name': '"  + objeto_name     + "'," + "\n" +
							"'objeto_idref': '" + objeto_idref    + "'," + "\n" +
							"'id': '"           + id              + "'," + "\n" +
							"'name': '"         + name            + "'," + "\n" +
							"},"                                         + "\n" +
							theApp.globalVarToString("sygemat_corralon_dat/LOG_SES");

			theApp.setGlobalVar("sygemat_corralon_dat/LOG_SES", logSesion);	
		}
	}
	
	// --------------------------------------------------------------------------------------------
	// Preparar variables de trabajo para el control de permisos por grupos de usuario
	// --------------------------------------------------------------------------------------------
	var usuarioGruposUsuarios = theApp.globalVarToString("sygemat_corralon_dat/CUR_USR_GRP").split(",");
	usuarioGruposUsuarios.sort();
	var usuarioGruposUsuariosNum = usuarioGruposUsuarios.length;

	// ------------------------------------------------------------------------------
	// Se recorren los registros de personalización aplicándolos si procede
	// ------------------------------------------------------------------------------
	for (var numRegistro = 0; numRegistro < numRegistros; numRegistro++)
	{
		var registro = lista.readAt(numRegistro);

		// -----------------------------------
		// Control de proyecto existente
		// -----------------------------------
		var proyecto = registro.fieldToString("PRY");
		var proyectoNuevo = registro.fieldToString("PRY_NEW");
		if ((theApp.projectInfo(proyecto).alias() == proyecto) && 
			((proyectoNuevo == "") || (theApp.projectInfo(proyectoNuevo).alias() == proyectoNuevo)))
		{
			// --------------------------------------------------------------------------------------
			// Control de permisos de los grupos de usuario para añadir la opción de menú
			// --------------------------------------------------------------------------------------
			var opcionGruposTodos = registro.fieldToBool("USR_GRP_ALL");
			var opcionGruposUsuarios = registro.fieldToString("USR_GRP").split(",");
			opcionGruposUsuarios.sort();
			var opcionGruposUsuariosNum = opcionGruposUsuarios.length;
			var opcionGrupoEncontrado = false;
				
			if (usuarioGruposUsuariosNum < opcionGruposUsuariosNum)
			{
				for (grupo in usuarioGruposUsuarios)
				{
					var pos = opcionGruposUsuarios.indexOf(usuarioGruposUsuarios[grupo]);
					if (pos != -1) {
						opcionGrupoEncontrado = true;
						break;
					};
				};
			} else 
			{
				for (grupo in opcionGruposUsuarios)
				{
					var pos = usuarioGruposUsuarios.indexOf(opcionGruposUsuarios[grupo]);
					if (pos != -1) {
						opcionGrupoEncontrado = true;
						break;
					};
				};
			};

			// ---------------------------------------------------
			// Si la opción está permitida se añade al menú
			// ---------------------------------------------------
			if ((opcionGruposTodos == false && opcionGrupoEncontrado == true)  ||
				(opcionGruposTodos == true && opcionGrupoEncontrado == false))
			{
				// ---------------------------------------
				// Preparar las variables de trabajo
				// ---------------------------------------
				var objeto = theRoot.dataView();
				var controles = [];
				if( registro.fieldToString("SUB_OBJ") != "" ){
					controles = registro.fieldToString("SUB_OBJ").split(",");
					
				}
				// --------------------------------------------------------------------------------
				// Se ejecuta el código apropiado en función del tipo de personalización
				// --------------------------------------------------------------------------------
				switch (registro.fieldToString("PRS_TIP"))
				{
					case "0": // Ocultar controles
						// Se personaliza diferente el formulario que la rejilla
						switch (registro.fieldToString("PRS_OBJ_TIP"))
						{
							case "F": // Formulario
								
								for (var numControl = 0; numControl < controles.length; numControl++)
								{
									
									var controlOcultar = objeto.control(controles[numControl]);									
									controlOcultar.visible = false;									
								};
								break;
							case "R": // Rejilla
								for (var numControl = 0; numControl < controles.length; numControl++)
								{
									objeto.setColumnVisible(controles[numControl], false);
								};
								break;
						};
						break;
					case "1": // Deshabilitar controles
						for (var numControl = 0; numControl < controles.length; numControl++)
						{
							var controlDesactivar = objeto.control(controles[numControl]);
							controlDesactivar.enabled = false;
						};
						break;
					case "2": // Añadir subformulario
						var contenedor = objeto.control(registro.fieldToString("CNT_ID"));
						var proyectoNuevo = theApp.projectInfo(registro.fieldToString("PRY_NEW"));
						var formularioId = registro.fieldToString("OBJ_NEW_ID_REF").slice(registro.fieldToString("OBJ_NEW_ID_REF").indexOf("/") + 1);
						var subformularioNuevo = proyectoNuevo.objectInfo(VObjectInfo.TypeForm, formularioId);
						var icono = iconoFormulario(subformularioNuevo);
						var indice = registro.fieldToInt("POS_NEW");
						contenedor.insertForm(indice, registro.fieldToString("OBJ_NEW_ID_REF"), subformularioNuevo.name(), icono);
						// Si la pestaña es la primera la convertimos en la seleccionada
						if (indice == 0)
						{
							contenedor.setCurrentIndex(0);
						};					
						break;
					case "3": // Sustituir subformulario					
						// Primero se quita el subformulario origen
						var contenedor = objeto.control(registro.fieldToString("CNT_ID"));
						var indice = contenedor.findForm(registro.fieldToString("SUB_OBJ_ID_REF"));
						contenedor.removeForm(indice);
						
						// Se añade el subformulario que lo sustituye
						var proyectoNuevo = theApp.projectInfo(registro.fieldToString("PRY_NEW"));
						var formularioId = registro.fieldToString("OBJ_NEW_ID_REF").slice(registro.fieldToString("OBJ_NEW_ID_REF").indexOf("/") + 1);
						var subformularioNuevo = proyectoNuevo.objectInfo(VObjectInfo.TypeForm, formularioId);
						var icono = iconoFormulario(subformularioNuevo);
						contenedor.insertForm(indice, registro.fieldToString("OBJ_NEW_ID_REF"), subformularioNuevo.name(), icono);
						// Si la pestaña es la primera la convertimos en la seleccionada y situamos el cursor en el primer control dentro de la pestaña
						if (indice == 0)
						{
							contenedor.setCurrentIndex(0);
							contenedor.form(0).setFocusToFirst();
							contenedor.form(0).setFocusToNext();
						};
						break;
					case "4": // Quitar subformulario						
						// Buscar el subformulario y quitarlo
						var contenedor = objeto.control(registro.fieldToString("CNT_ID"));
						var indice = contenedor.findForm(registro.fieldToString("SUB_OBJ_ID_REF"));
						contenedor.removeForm(indice);
						break;
					case "5": // Ejecutar script
						var script = registro.fieldToString("SCR");
						eval(script);
						break;
				};
			};
		};
	};
};

/**
 * Devuelve el icono de un formulario
 *
 * @param {VObjectInfo} formulario Objeto de la clase VObjectInfo del formulario
  * @return {VImage} icono Objeto de la clase VImage con el icono del formulario
 */
var iconoFormulario = function (formulario)
{
	if (formulario)
	{
		importClass("VImage");
		var icono = new VImage();
		var iconoIdRef = formulario.propertyData(6).replace("@", "/");
		icono.loadResource(iconoIdRef);
		return icono;
	};
};

// -------------------------------------
// Formatea fecha en dd-mm-aaaa
// -------------------------------------
function formateaFecha(fecha) {
  function pad(s) { return (s < 10) ? '0' + s : s; }
  var d = new Date(fecha);
  return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
}

// -----------------------------------------------
// Devuelve el nombre de un tipo de objeto
// -----------------------------------------------
function nombreTipoObjeto(tipo)
{
	var name ="";

	switch (tipo)
	{
		case 0:
			name = "tabla";
			break;
		case 7:
			name = "indicecomplejo";
			break;
		case 9:
			name = "variable";
			break;
		case 10:
			name = "tablaestatica";
			break;
		case 13:
			name = "dibujo";
			break;
		case 14:
			name = "rejilla";
			break;
		case 16:
			name = "arbol";
			break;
		case 17:
			name = "casillero";
			break;
		case 18:
			name = "formulario";
			break;
		case 22:
			name = "impresora";
			break;
		case 23:
			name = "informe";
			break;
		case 28:
			name = "busqueda";
			break;
		case 30:
			name = "lupa";
			break;
		case 31:
			name = "localizador";
			break;
		case 33:
			name = "cesta";
			break;
		case 34:
			name = "proceso";
			break;
		case 35:
			name = "funcion";
			break;
		case 40:
			name = "dll";
			break;
		case 41:
			name = "action";
			break;
		case 42:
			name = "menu";
			break;
		case 43:
			name = "toolbar";
			break;
		case 45:
			name = "tubolista";
			break;
		case 46:
			name = "tuboficha";
			break;
		case 47:
			name = "tcp";
			break;
		case 49:
			name = "menuarbol";
			break;
		case 51:
			name = "constante";
			break;
		case 52:
			name = "marco";
			break;
		case 54:
			name = "bloc";
			break;
		case 56:
			name = "cola";
			break;
		case 57:
			name = "esquema";
			break;
		case 59:
			name = "multipanel";
			break;
		case 62:
			name = "dispositivoserie";
			break;
		case 64:
			name = "ficheroadjunto";
			break;
		case 70:
			name = "coverflow";
			break;
		case 71:
			name = "alternadorlista";
			break;
		case 72:
			name = "comboview";
			break;
		case 73:
			name = "listview";
			break;
		case 74:
			name = "pvclistaqml";
			break;
		case 77:
			name = "rejillaavanzada";
			break;
		default:
			name = "desconocido";
	}

	return name;
};
