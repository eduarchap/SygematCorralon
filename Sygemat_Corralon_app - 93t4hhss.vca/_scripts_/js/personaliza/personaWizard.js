// --------------------------------------------------------------------------------
// Devuelve un array con el objetctInfo del proyecto y todos sus heredados
// 
// @VProjectInfo proyecto: Proyecto a procesar
// @Array proyectosInfo: Array de VProjectInfo de los proyectos y sus heredados
// @Array proyectosAlias: Array de String con los Alias de los proyectos y sus heredados
// @Array proyectosId: Array de String con los Id de los proyectos y sus heredados
// --------------------------------------------------------------------------------
var getProyectosHeredadosInfo = function(proyecto, proyectosInfo, proyectosAlias, proyectosId)
{
	// Si el proyecto no está en el array se añade y se cargan sus heredados para procesarlos
	if (proyectosAlias.indexOf(proyecto.alias()) == -1)
	{
		// Se añade el proyecto a los arrays
		proyectosInfo.push(proyecto);
		proyectosAlias.push(proyecto.alias());
		proyectosId.push(proyecto.id());
		
		// Se cargan los proyectos heredados del proyecto para procesarlos
		for(var numProyecto = 0; numProyecto < proyecto.legacyProjectCount(); numProyecto++)
		{
			var proyectoHeredado = proyecto.legacyProjectInfo(numProyecto);
			getProyectosHeredadosInfo(proyectoHeredado, proyectosInfo, proyectosAlias, proyectosId);
		};
	};
};

// --------------------------------------------------------------------------------
// Devuelve un array con los objetctInfo de los objetos de un tipo 
// 
// @VProjectInfo proyectoInfo: Proyecto a procesar
// @String tipoObjeto: Tipo de objeto
// @Array return: Devuelve un array de VObjectInfo de los objetos del tipo
// --------------------------------------------------------------------------------
var getObjetosProyectoTipoInfo = function(proyectoInfo, tipoObjeto)
{
	// Se cargan los proyectos heredados del proyecto para procesarlos
	var objetosInfo = [];
	for(var numObjeto = 0; numObjeto < proyectoInfo.objectCount(tipoObjeto); numObjeto++)
	{
		objetosInfo.push(proyectoInfo.objectInfo(tipoObjeto, numObjeto));
	};
	
	// Devolver el array de objetos
	return objetosInfo;
};

// --------------------------------------------------------------------------------
// Devuelve un array con los objetctInfo de los subobjetos de un objeto
// 
// @VProjectInfo objetoInfo: Objeto a procesar
// @Number tipoSubobjetos: Valor numérico del tipo de subobjetos a procesar
// @Array tiposControles: Array con los valores de los tipos de controles a retornar
// @Array return: Devuelve un array de controles
// --------------------------------------------------------------------------------
var getSubobjetosObjeto = function(objetoInfo, tipoSubobjetos, tiposControles)
{
	// Se consideran contenedores los separadores, pila y caja de subformularios y el splitter
	var controles = [];
		
	// Se recorren los controles del formulario para almacenar en el array los contenedores de subformularios
    for (var numControl = 0; numControl < objetoInfo.subObjectCount(tipoSubobjetos); numControl++)
	{
		var control = objetoInfo.subObjectInfo(tipoSubobjetos, numControl);
			
		if (control)
		{
			var tipoControl = control.propertyData(0);
			if ((tiposControles.length == 0) | (tiposControles.indexOf(control.propertyData(0)) != -1))
			{
				controles.push(control);
			};
		};
	};
	
	// Devolver el array de objetos
	return controles;
};

// --------------------------------------------------------------------------------
// Devuelve un array con los subformularios contenidos en  los  contenedores de un formulario
// 
// @VProjectInfo objetoInfo: Objeto a procesar
// @Number tipoSubobjetos: Valor numérico del tipo de subobjetos a procesar
// @Array tiposControles: Array con los valores de los tipos de controles a retornar
// @Array return: Devuelve un array de controles
// --------------------------------------------------------------------------------
var getSubformulariosObjeto = function(objetoInfo, tipoSubobjetos, tiposControles)
{
	// Se consideran contenedores los separadores, pila y caja de subformularios y el splitter
	var subformularios = [];
		
	// Se recorren los controles del formulario para almacenar en el array los contenedores de subformularios
    for (var numControl = 0; numControl < objetoInfo.subObjectCount(tipoSubobjetos); numControl++)
	{
		var control = objetoInfo.subObjectInfo(tipoSubobjetos, numControl);
			
		if (control)
		{
			var tipoControl = control.propertyData(0);
			if ((tiposControles.length == 0) | (tiposControles.indexOf(control.propertyData(0)) != -1))
			{
				var numSubformularios = control.subObjectCount(VObjectInfo.TypeSubcontrol);
				for (var numSubformulario = 0; numSubformulario < numSubformularios; numSubformulario++)
				{
					subformularios.push(control.subObjectInfo(VObjectInfo.TypeSubcontrol, numSubformulario));
				};
			};
		};
	};
	
	// Devolver el array de objetos
	return subformularios;
};
