// ----------------------------
// Cargar el menú dinámico
// ----------------------------
var cargarMenu = function(prefijoMenu)
{
	importClass("VImage");
	importClass("VQuery");

	// Si no hay menú especificado se asume el general
	if (prefijoMenu == null) {
		prefijoMenu = "GEN";
	};
	
	//obtenmos el ancho del formulario
	var ancho = theRoot.dataView().width;
	
	//obtenemos los iconos
	var iconoFlechaReducida = new VImage();
	iconoFlechaReducida.loadResource("sygemat_corralon_app/DER");
	var iconoFlechaAbierta = new VImage();
	iconoFlechaAbierta.loadResource("sygemat_corralon_app/AMP");
	
	// Preparar el control de menú
	var formulario = theRoot.dataView();
	var menu = formulario.control("MEN_APP");
	
	// Configuración general del menú
	menu.setHeaderLabel(0, "Menú General");
	menu.setHeaderLabel(1, "Tipo");
	menu.setHeaderLabel(2, "idRef");
	menu.setHeaderLabel(3, "IMG");
	menu.hideColumn(1);
	menu.hideColumn(2);
	menu.hideColumn(3);
	menu.clear();	
	
	// Preparar variables de trabajo
	var opcionPadre009 = "";
	var opcionPadre012 = "";
	var opcionPadre015 = "";
	var usuarioGruposUsuarios = theApp.globalVarToString("sygemat_corralon_dat/CUR_USR_GRP").split(",");
	usuarioGruposUsuarios.sort();
	var usuarioGruposUsuariosNum = usuarioGruposUsuarios.length;
	var grupo = "";
	
	// Cargar todas las opciones del menú
	var listaMenu = new VRegisterList(theRoot);
	listaMenu.setTable("sygemat_corralon_dat/PRS_MEN_W");
	var busMenu = new VQuery(theRoot);
	busMenu.setQuery("sygemat_corralon_app/PRS_MEN_W_MEN");
	busMenu.setVar("OPC_MEN_DES", prefijoMenu);
	busMenu.setVar("OPC_MEN_HAS", prefijoMenu + "zzzzzzzzzzzz");
	if (busMenu.exec()) {
		listaMenu.append(busMenu.result());
	};
	
	// Leer las opciones del menú y cargar el control del árbol
	for (var numRegistro = 0; numRegistro < listaMenu.size(); numRegistro++ ) {
		
		//alert(opcionTEST);
		
		// Lectura de los datos de la opción de menú
		var registro = listaMenu.readAt(numRegistro);
		
		// Control de permisos de los grupos de usuario para añadir la opción de menú
		var opcionGruposTodos = registro.fieldToBool("USR_GRP_ALL");
		var opcionTEST = registro.fieldToBool("TST");
		var opcionGruposUsuarios = registro.fieldToString("USR_GRP").split(",");
		opcionGruposUsuarios.sort();
		var opcionGruposUsuariosNum = opcionGruposUsuarios.length;
		var opcionGrupoEncontrado = false;
		// Carga el menu si TST esta en false
	    if(opcionTEST == false){
		// Se busca si el usuario está en alguno de los grupos marcados
		if (usuarioGruposUsuariosNum < opcionGruposUsuariosNum)	{
			for (grupo in usuarioGruposUsuarios) {
				var pos = opcionGruposUsuarios.indexOf(usuarioGruposUsuarios[grupo]);
				if (pos != -1) {
					opcionGrupoEncontrado = true;
					break;
				};
			};
		}
		else {
			for (grupo in opcionGruposUsuarios) {
				var pos = usuarioGruposUsuarios.indexOf(opcionGruposUsuarios[grupo]);
				if (pos != -1) {
					opcionGrupoEncontrado = true;
					break;
				};
			};
		};
		
		// Si la opción está permitida se añade al menú
		if (((opcionGruposTodos == true) && (opcionGrupoEncontrado == false)) || 
			((opcionGruposTodos == false) && (opcionGrupoEncontrado == true)))
		{

			// Preparar las variables con los datos del registro
			var opcionId = registro.fieldToString("ID");
			var nivel = opcionId.length;
			var opcionTexto = registro.fieldToString("NAME");
			var opcionToolTip = registro.fieldToString("TOO_TIP");
			var opcionStatusTip = registro.fieldToString("STA_TIP");
			var opcionWhatsThis = registro.fieldToString("WHA_THI");
			var opcionTipo = registro.fieldToString("MEN_OBJ");
			if (opcionTipo == "C")
				var opcionAccion = registro.fieldToString("PRF_MEN");
			else
				var opcionAccion = registro.fieldToString("OBJ_ID_REF");
			if (registro.fieldToString("ICO_ID_REF") != "" ) {
				var icono = new VImage();
				icono.loadResource(registro.fieldToString("ICO_ID_REF"));
			} else {
				var icono = registro.fieldToImage("ICO");
			};

			switch (nivel)
			{
				case 6:	// Opción de nivel principal de arbolado
					// Se configura la opción
					item = menu.addTopLevelItem();
					item.setText(0, opcionTexto);
					item.setText(1, opcionTipo);
					item.setText(2, opcionAccion);
					item.setToolTip(0, opcionToolTip);
					item.setStatusTip(0, opcionStatusTip);
					item.setWhatsThis(0, opcionWhatsThis);
					item.setIcon(0, icono);
					break;
				
				case 9: // Opción de 2º nivel de arbolado
					opcion = item.addChild();
					item.setIcon(3,iconoFlechaReducida);
					var opcionPadre009 = opcion;
					break;

				case 12: // Opción de 3º nivel de arbolado
					opcion = opcionPadre009.addChild();
					opcionPadre009.setIcon(3,iconoFlechaReducida);
					var opcionPadre012 = opcion;
					break;
				
				case 15: // Opción de 4º nivel de arbolado
					opcion = opcionPadre012.addChild();
					opcionPadre012.setIcon(3,iconoFlechaReducida);
					var opcionPadre015 = opcion;
					break;
				
				case 18: // Opción de 5º nivel de arbolado
					opcion = opcionPadre015.addChild();
					opcionPadre015.setIcon(3,iconoFlechaReducida);
					break;
			};
						
			// Si nivel es mayor de 6 es una opción de 2º, 3º, 4º ó 5º nivel
			if (nivel > 6)
			{
				// Se configura la opción
				opcion.setText(0, opcionTexto);
				opcion.setText(1, opcionTipo);
				opcion.setText(2, opcionAccion);
				opcion.setToolTip(0, opcionToolTip);
				opcion.setStatusTip(0, opcionStatusTip);
				opcion.setWhatsThis(0, opcionWhatsThis);
				opcion.setIcon(0, icono);
			};
		};
	};
	};

	// Preparar visualización del menú por defecto
	menu.headerHidden = true;
	menu.rootIsDecorated = true;
	menu.setColumnWidth(3,ancho * 0.20);
	menu.setColumnWidth(0,ancho * 0.80 );	
};