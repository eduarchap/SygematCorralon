#include "(CurrentProject)/js/database/velneoNumero.js"

////////////////////////////////////////////////////////////
// Funciones que operan sobre las pestañas de separadores o vista central
//
var velneoTab = {};

// Importamos las clases
importClass( "VImage" );


////////////////////////////////////////////////////////////
// Añade una pestaña a un control de subformularios
//
// Parámetros:
//     - separador: Control contenedor de subformularios donde se añadirá el formulario
//     - szFormularioIdRef: Objeto formulario a añadir
//     - szTitulo: Título de la pestaña
//     - szSendaIdIcono: Senda en disco o idRef del objeto icono para la pestaña
//
velneoTab.addSubformulario = function ( separador, szFormularioIdRef, szTitulo, szSendaIdIcono )
{
	// Si no existe la pestaña del formulario se crea
	if ( separador.findForm( szFormularioIdRef ) == -1 )
	{
		// Preparar el objeto icono
		var icono = new VImage(); 
		if ( icono.loadResource( szSendaIdIcono ) == false ) 
			icono.load( szSendaIdIcono );
				
		// Añadimos subformularios al tab
		var nuevoSubformulario = separador.addForm( szFormularioIdRef, szTitulo, icono );
		
		// Se retorna el subformulario añadido
		return nuevoSubformulario;
	}
}


////////////////////////////////////////////////////////////
// Cargar todos los subformularios que comienen por un prefijo
//
// Parámetros:
//     - separador: Control contenedor de subformularios donde se añadirá el formulario
//     - szPrefijo: Prefijo de los identificador de subformularios a añadir
//     - szIconoIdRef: Identificador de refrerencia del objeto icono para la pestaña
//     - szAliasProyectoNoCargar: Alias del proyecto del formulario original que no se debe volver a cargar
//
velneoTab.addSubformulariosPersonalizados = function ( separador, szPrefijo, szIconoIdRef, szAliasProyectoNoCargar )
{
	// Se controla que el proyecto principal no sea el actual para evitar problemas de recursividad
	if ( theApp.mainProjectInfo().alias() != szAliasProyectoNoCargar )
	{	
		var proyectoPrincipal = theApp.mainProjectInfo();
		var nNumFormularios = proyectoPrincipal.objectCount( VObjectInfo.TypeForm );
		var nLongitudPrefijo = szPrefijo.length;
		var szParamIconoIdRef = szIconoIdRef;
		
		// Recorremos los formularios del proyecto superior y cargamos los que tengan el prefijo
		for ( nIndice = 0; nIndice < nNumFormularios; nIndice++ )
		{
			formulario = proyectoPrincipal.objectInfo( VObjectInfo.TypeForm, nIndice );
			if ( formulario.id().substring( 0, nLongitudPrefijo ) == szPrefijo )
			{
				// Comprobamos si existe un objeto dibujo con el mismo nombre para usarlo como icono
				var iconoFormulario = proyectoPrincipal.objectInfo( VObjectInfo.TypePicture, formulario.id() );
				if ( iconoFormulario.idRef().length > 0 )
					szParamIconoIdRef = iconoFormulario.idRef();
				else
					szParamIconoIdRef = szIconoIdRef;
				
				velneoTab.addSubformulario( separador, formulario.idRef(), formulario.name(), szParamIconoIdRef );
			}
		}
	}
}


////////////////////////////////////////////////////////////
// Cargar el subformulario personalizado y en su defecto el original
// Devuelve true si se ha realizado la sustitución del subformulario
//
// Parámetros:
//     - separador: Control contenedor de subformularios donde se añadirá el formulario
//     - szFormularioIdRef: Objeto formulario a añadir
//     - szTitulo: Título de la pestaña
//     - szIconoIdRef: Identificador de refrerencia del objeto icono para la pestaña
//     - szAliasProyecto: Alias del proyecto del formulario original
//
velneoTab.sustituirSubformulario = function ( separador, szFormularioId, szTitulo, szIconoIdRef, szAliasProyecto )
{	
	// Preparar valor de retorno por defecto y variables de trabajo
	var bValorRetorno = false;
	var proyectoPrincipal = theApp.mainProjectInfo();
	var szFormularioIdRefOriginal = szAliasProyecto + "/"  + szFormularioId;
	
	// Si el alias del proyecto principal es igual que el del proyecto original se carga dicho formulario directamente
	if ( proyectoPrincipal.alias() == szAliasProyecto )
	{
		velneoTab.addSubformulario( separador, szFormularioIdRefOriginal, szTitulo, szIconoIdRef );
		bValorRetorno = true;
	} else 
	{
		// Se repasan todos los formularios del proyecto superior
		var nNumFormularios = proyectoPrincipal.objectCount( VObjectInfo.TypeForm );
		for ( nIndice = 0; nIndice < nNumFormularios; nIndice++ )
		{	
			formulario = proyectoPrincipal.objectInfo( VObjectInfo.TypeForm, nIndice );
			if ( formulario.id() == szFormularioId )
			{	
				// Se añade la pestaña
				velneoTab.addSubformulario( separador, formulario.idRef(), szTitulo, szIconoIdRef );
				bValorRetorno = true;
			}
		}
		
		// Si no se ha encontrado un formulario de sustitución se carga el original
		if ( bValorRetorno == false )
		{
			velneoTab.addSubformulario( separador, szFormularioIdRefOriginal, szTitulo, szIconoIdRef );
			bValorRetorno = true;
		}		
	}
	
	return bValorRetorno;
}


////////////////////////////////////////////////////////////
// Si la vista ya está abierta se situa en la pestaña, en caso 
// contrario ejecuta la acción correspondiente para abrirla
// 
// Parámetros:
//     - szTitulo: Título de la pestaña
//     - szAccionIdRef: IdRef de la acción a ejecutar en caso de que no esté abierta
//
velneoTab.activarTabTitulo = function ( szTitulo, szAccionIdRef )
{	
	// Recorre las vistas abiertas y si la encuentra la abre
	var nNumVistas = theMainWindow.viewsCount();
	var bAbrirTab = true;

	for ( nIndice = 0; nIndice < nNumVistas; nIndice++ )
	{
		vista = theMainWindow.getViewAt( nIndice );
		if ( vista.title() == szTitulo )
		{
			bAbrirTab = false;
			theMainWindow.setCurrentView( vista );
			break;
		}
	}

	// Si no se ha encontrado se lanza la acción para abrir la vista
	if ( bAbrirTab == true )
		theMainWindow.runAction( szAccionIdRef );
}


////////////////////////////////////////////////////////////
// Si el formulario ya está abierto en una vista se activa,
// en caso contrario se ejecuta la acción correspondiente para abrirlo
// 
// Parámetros:
//     - szFormIdRef: IdRef del formulario
//     - szAccionIdRef: IdRef de la acción a ejecutar en caso de que no esté abierta
//
velneoTab.activarTabFormulario = function ( szFormularioIdRef, szAccionIdRef )
{	
	// Recorre las vistas abiertas y si la encuentra la abre
	var nNumVistas = theMainWindow.viewsCount();
	var bAbrirTab = true;
	var vista = null;
	var szFormularioIdRef = "";

	for ( nIndice = 0; nIndice < nNumVistas; nIndice++ )
	{
		vista = theMainWindow.getViewAt( nIndice );
		if ( vista )
		{
			formulario = vista.centralWidget().objectInfo();
			if ( formulario.type() == VObjectInfo.TypeForm )
			{			
				if ( formulario.idRef() == szFormularioId )
				{
					bAbrirTab = false;
					theMainWindow.setCurrentView( vista );
					break;
				}	
			}
		}
	}

	// Si no se ha encontrado se lanza la acción para abrir la vista
	if ( bAbrirTab == true )
		theMainWindow.runAction( szAccionIdRef );
}


////////////////////////////////////////////////////////////////////////////////
// Crea pestaña con vistas de datos visualizando listas encarpetadas de los registros de entrada con multipartir
//
// Parámetros:
//     - listaRegistros: Lista de registros a multipartir y mostrar en pestañas
//     - szTitle: Parte fija del texto a la que será necesario añadir la parte dinámica correspondiente a cada lista
//     - szCampoId: Identificador del campo por el que multiparte
//     - szTipoVista: Código del tipo de objeto de origen que será utilizado para generar las vista de datos
//     - szVistaIdRef: Identificador del objeto de origen que será utilidado para generar las vistas de datos
//
velneoTab.addTabMultipartir = function ( listaRegistros, szTitle, szCampoId, szTipoVista, szVistaIdRef )
{		
	// Multipartir la lista por el campo seleccionado
	var aListasRegistros = listaRegistros.multiSplit( szCampoId );
	var nNumListasRegistros = aListasRegistros.length;
	
	// Se recorre el array de listas de registros para generar las pestañas
	for( var nIndice = 0; nIndice < nNumListasRegistros; nIndice++ )
	{		
		// Mostrar la pestaña con la vista de datos mostrando los registros recibidos y fijando el nuevo título
		var tab = theMainWindow.addDataView( szTipoVista, szVistaIdRef, aListasRegistros[ nIndice ] );
		
		// Preparar y cambiar el título de la pestaña
		var tabla = listaRegistros.tableInfo();
		var nNumCampo = tabla.findField( szCampoId );
		var szTipoCampo = tabla.fieldType( nNumCampo );
		var szTipoEnlaceCampo = tabla.fieldBindType( nNumCampo );
		
		// Se tiene en cuenta el tipo de campo para la preparación del valor a mostrar en la pestaña
		if ( szTipoEnlaceCampo == VTableInfo.BindTypeMaster )
		{
			var szCampoMaestroId = szCampoId + ".NAME";
			var szValor = aListasRegistros[ nIndice ].readAt( 0 ).fieldToString( szCampoMaestroId );
		} 
		else 
		{			
			if ( szTipoCampo == VTableInfo.FieldTypeNumeric )
			{
				var szValor = velneoNumero.formatear( aListasRegistros[ nIndice ].readAt( 0 ).fieldToString( szCampoId ) );
			}
			else
			{
				var szValor = aListasRegistros[ nIndice ].readAt( 0 ).fieldToString( szCampoId );
			}
		}
		
		// Cambiar el título de la pestaña
		var szTituloTab = szTitle + szValor;
		tab.setTitle( szTituloTab );
	}
}


////////////////////////////////////////////////////////////////////////////////
// Crea una pestaña con una vista de datos visualizando la lista de encarpetado de un valor
//
// Parámetros:
//     - listaRegistros: Lista de registros a multipartir y mostrar en pestañas
//     - szTitle: Parte fija del texto a la que será necesario añadir la parte dinámica correspondiente a cada lista
//     - szCampoId: Identificador del campo por el que multiparte
//     - nIndiceValor: Número de índice del valor a encarpetar
//     - szTipoVista: Código del tipo de objeto de origen que será utilizado para generar las vista de datos
//     - szVistaIdRef: Identificador del objeto de origen que será utilidado para generar las vistas de datos
//
velneoTab.addTabMultipartirValor = function ( listaRegistros, szTitle, szCampoId, nIndiceValor, szTipoVista, szVistaIdRef )
{	
	// Multipartir la lista por el campo seleccionado
	var aListasRegistros = listaRegistros.multiSplit( szCampoId );
	var nNumListasRegistros = aListasRegistros.length;
	
	// Mostrar la pestaña con la vista de datos mostrando los registros recibidos y fijando el nuevo título
	var tab = theMainWindow.addDataView( szTipoVista, szVistaIdRef, aListasRegistros[ nIndiceValor ] );
	
	// Preparar el título de la pestaña
	var tabla = listaRegistros.tableInfo();
	var nNumCampo = tabla.findField( szCampoId );
	var szTipoCampo = tabla.fieldType( nNumCampo );
	var szTipoEnlaceCampo = tabla.fieldBindType( nNumCampo );
	var registro = aListasRegistros[ nIndiceValor ].readAt( 0 );
	
	// Se tiene en cuenta el tipo de campo para la preparación del valor a mostrar en la pestaña
	if ( szTipoEnlaceCampo == VTableInfo.BindTypeMaster )
	{
		var szCampoMaestroId = szCampoId + ".NAME";
		var szValor = registro.fieldToString( szCampoMaestroId );
	} 
	else 
	{			
		if ( szTipoCampo == VTableInfo.FieldTypeNumeric )
		{
			var szValor = velneoNumero.formatear( registro.fieldToString( szCampoId ) );
		}
		else
		{
			var szValor = registro.fieldToString( szCampoId );
		}
	}

	// Cambiar el título de la pestaña
	var szTituloTab = szTitle + szValor;
	tab.setTitle( szTituloTab );
}