////////////////////////////////////////////////////////////
// Funciones que operan con formularios
//
var velneoFormulario = {};

// Importamos las clases
importClass( "VQuery" );

////////////////////////////////////////////////////////////
// Cambiar el registro mostrado en un formulario 
//
// Parámetros:
//     - szBusquedaIdRef: Identificador de referencia de la búsqueda.
//     - szParamId: Identificador del campo código
//     - vParamValue: Valor del código
//
velneoFormulario.cambiarRegistro = function ( root, szBusquedaIdRef, szParamId, vParamValue )
{
	// Se crea el objeto búsqueda
	var busqueda = new VQuery( root );
	busqueda.setQuery( szBusquedaIdRef );

	// Se alimenta el paŕametro y se ejecuta la búsqueda, se selecciona el primer registro y se muestra
	busqueda.setVar( szParamId, vParamValue );
	if ( busqueda.exec() ) {
		if ( busqueda.result().size() > 0 ) {
			var register = new VRegister( root )
			register = busqueda.result().readAt( 0 )
			root.dataView().setRegister( register )
		} else
			alert( "El código " + vParamValue + " no existe" );
	}
}


////////////////////////////////////////////////////////////
// Carga el registro siguiente o anterior por el índice seleccionado en el formulario
//
// Parámetros:
//     - root: Objeto.
//     - nNumIndiceSeleccionado: Número de índice seleccionado para el movimiento
//     - direccion = "ANT" -> anterior, "SIG" -> Siguiente
//
velneoFormulario.nuevoRegistroPorIndice = function ( root, nNumIndiceSeleccionado, szSentido )
{	
	// Si hay objeto root
	if ( root )
	{
		var vista = root.dataView();
		
		// Si el objeto tiene vista de datos
		if ( vista )
		{
			var objeto = vista.mainForm().objectInfo();
			
			// Si obtenemos la información del objeto
			if ( objeto )
			{	
				// Leemos el registro de la vista de datos
				var tabla = objeto.inputTable();
				var szIndiceId = tabla.indexId( nNumIndiceSeleccionado );
				var registro = new VRegister( root );
				vista.mainForm().getRegister( registro );
									
				// En función de la dirección anterior o siguiente nos posicionamos
				switch ( szSentido ) {
					case "ANT":
						registro.readPrevRegister( szIndiceId );
						break;
					case "SIG":
						registro.readNextRegister( szIndiceId );
						break;
				}
			
				// Fijamos el nuevo registro en la vista de datos y refrescamos los controles
				vista.mainForm().setRegister( registro );
				vista.mainForm().updateControls();
			}
		}
	}
}