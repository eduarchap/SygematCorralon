/*
  * ocultarMostrarColumnaRejillaAlternador.
  *
  * {[String]} alternadorId - Identificador del alternador 
  * {[String]} rejillaId - Identificador del subobjeto rejilla del alterandor 
  * {[Array]} columnasMostrar - Array de identificador de columnas a mostrar
  * {[Array]} columnasOcultar - Array de identificador de columnas a ocultar
  */
function ocultarMostrarColumnaRejillaAlternador(alternadorId, rejillaId, columnasMostrar, columnasOcultar)
{
	// Atrapamos el formulario y alternador
	var formulario = theRoot.dataView();
	var alternador = formulario.control(alternadorId);
	if (alternador)
	{
		// Atrapamos la rejilla del alternador si está como vista activa
		vistaAlternador     = alternador.dataViewActive();
		vistaAlternadorInfo = vistaAlternador.objectInfo();
		if (vistaAlternadorInfo.id() == rejillaId)
		{
			// Leemos las columnas y comprobamos si coincide con las que queremos mostrar u ocultar
			for (numColumna = 0; numColumna < vistaAlternador.columnCount(); numColumna++)
			{
				var columna = vistaAlternadorInfo.subObjectInfo(VObjectInfo.TypeGridCol, numColumna);
				if (columnasMostrar.indexOf(columna.id()) != -1)
				{
					// Mostramos la columna
					vistaAlternador.setColumnVisible(numColumna, true);
				};
				if (columnasOcultar.indexOf(columna.id()) != -1)
				{
					// Ocultamos la columna
					vistaAlternador.setColumnVisible(numColumna, false);
				};
			};
		};
		
	};
};