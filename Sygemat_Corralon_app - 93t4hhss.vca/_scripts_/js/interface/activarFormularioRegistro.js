// ----------------------------------------------------------------------------------
// Controla si el registro ya está abierto en este formulario, si es así lo activamos
// En caso contrario no hacemos nada y el formulario con el registro se abrirá
// ----------------------------------------------------------------------------------

// Valor por defecto
theRoot.setVar( "FRM_REG_ACT", false );

// Solo se realiza el control si el formulario en curso no está en cuadro de diálogo
if ( theRoot.dataView().isInDialog() === false )
{
	// Variables
	var numVistas = theMainWindow.viewsCount(),
		vista,
		vistaIdRef,
		vistaTipo,
		vistaTabla,
		vistaIdRegistro,
		vistaRegistro,
		objetoInfo       = theRoot.objectInfo(),
		objetoIdRef      = objetoInfo.idRef(),
		objetoTipo       = objetoInfo.type(),
		objetoTabla      = objetoInfo.inputTable().idRef(),
		objetoIdRegistro = theRegisterIn.fieldToString("ID"),
		index;
	
	// Recorrer las vistas
	for ( var index = 0; index < numVistas; index++ )
	{	
		// Leer la vista
		vista = theMainWindow.getViewAt( index )
		
		// Leemos la información del objeto contenido en la pestaña
		vistaInfo       = vista.centralWidget().objectInfo();
		vistaIdRef      = vistaInfo.idRef();
		vistaTipo       = vistaInfo.type();
		vistaTabla      = vistaInfo.inputTable().idRef();
		
		// Solo procesamos la vista si es de tipo formulario
		if ( vistaTipo === VObjectInfo.TypeForm )
		{
			// Creamos un registro vacío de la tabla de la vista y lo leemos de la vista
			vistaRegistro   = new VRegister( theRoot );
			vista.centralWidget().getRegister( vistaRegistro );
			vistaIdRegistro = vistaRegistro.fieldToString( "ID" );
			
			// Comparar si ese objeto es el mismo que queremos abrir
			if ( ( vistaTipo === objetoTipo ) && ( vistaIdRef === objetoIdRef ) && 
				 ( vistaTabla === objetoTabla ) && ( vistaIdRegistro === objetoIdRegistro ) )
			{	
				// Activar la vista
				theMainWindow.setCurrentView( vista );
			
				// Fijamos el retorno de la función a true = está activa
				theRoot.setVar( "FRM_REG_ACT", true );
			}
		}
	}
}