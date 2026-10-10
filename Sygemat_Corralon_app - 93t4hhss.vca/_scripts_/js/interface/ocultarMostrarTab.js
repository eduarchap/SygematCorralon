#include "(CurrentProject)/js/interface/iconoFormulario.js"

/*
  * Quitar un subformulario de un separador de pestañas
  *
  * {String} separadorId, identificador del separador de pestañas
  * {String} subformIdRef, identificador de referencia del susbformulario
  */
function quitarTab(separadorId, subformIdRef)
{
	var formulario = theRoot.dataView();
	if (formulario)
	{
		var separador  = formulario.control(separadorId);
		if (separador)
		{
			var posTab     = separador.findForm(subformIdRef);
			if (posTab != -1)
			{
				separador.removeForm(posTab);
			};
		};
	};
};

/*
  * Insertar formulario en un separador de pestañas
  *
  * {String} separadorId, identificador del separador de pestañas
  * {String} subformIdRef, identificador de referencia del susbformulario
  * {[String]} subformPosicionIdRef o nº posición, identificador de referencia del susbformulario que indica la posición a insertar (0 = 1ª posición)
  * {[Number]} desplazamiento, número que indica la posición de inserción respecto a la posición del parámetro anterior
  */
function insertarTab(separadorId, subformIdRef, subformPosicionIdRef, desplazamiento)
{
	var formulario = theRoot.dataView();
	
	// Obtenemos el separador de formularios
	var separador  = formulario.control(separadorId);
	if (separador)
	{
		// Buscamos si el subformulario ya existe, en caso contrario se añade
		var posTab = separador.findForm(subformIdRef);
		if (posTab == -1)
		{
			// Obtenemos el subformulario a insertar
			var proyectoInfo = theApp.projectInfo(subformIdRef.split("/")[0]);
			var subformInfo  = proyectoInfo.objectInfo(VObjectInfo.TypeForm, subformIdRef.split("/")[1]);
			if (subformInfo)
			{
				// Preparamos el icono y la posición de inserción
				var icono = iconoFormularioIdRef(subformIdRef);
				if (isNaN(subformPosicionIdRef) == false)
					var posTabInsert = subformPosicionIdRef;
				else
					var posTabInsert = separador.findForm(subformPosicionIdRef);
				if (isNaN(desplazamiento))
					desplazamiento = 0;
				
				// Insertamos el subformulario en el separador
				separador.insertForm(posTabInsert + desplazamiento, subformIdRef, subformInfo.name(), icono);
			};
		};
	};
};
