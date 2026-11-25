/**
 * Localizar los procesos personalizados
 *
 * @description Buscar en todos los proyectos procesos personalizados.
 * @version 2014-09-26
 * @return {String} Se guarda en la variable global PRS_PRO los ideRef de los procesos personalizados
 */

// ------------------------------------------------
// Función buscarProyectos
// Recorre el árbol de proyectos heredados
// ------------------------------------------------
var buscarProyectos = function (proyecto)
{
	// Se guarda el proyecto en el array
	listaProyectos.push(proyecto);
	
    // Se leen los proyectos heredados
	var numProyectosHeredados = proyecto.legacyProjectCount();
	
	for (var numProyecto = 0; numProyecto < numProyectosHeredados; numProyecto++)
	{
		var proyectoHeredado = proyecto.legacyProjectInfo(numProyecto);
		
		// Se busca el proyecto en el array, si no se encuentra se lanza la función de búsqueda
		if (listaProyectos.indexOf(proyectoHeredado) == -1)
		{
			buscarProyectos(proyectoHeredado);
		};
    };
};

// --------------------------------------------------------------------------------------
// Función buscarProcesosPersonalizados
// Recorre los procesos de un proyecto buscando los procesos personalizados
// --------------------------------------------------------------------------------------
var buscarProcesosPersonalizados = function ()
{
    // Se leen los procesos del proyecto
	var proyecto = theApp.mainProjectInfo();
	var numProcesos = proyecto.allObjectCount(VObjectInfo.TypeProcess);
	
	for (var numProceso = 0; numProceso < numProcesos; numProceso++)
	{
		var proceso = proyecto.allObjectInfo(VObjectInfo.TypeProcess, numProceso);
		
		// Si el identificador del proceso empieza por "___" es personalizable y se guarda el alias
		if (proceso.id().substring(0, 3) == "___")
		{
			listaProcesos.push(proceso.idRef());
		};
    };
};

// --------------------------------------------------------------------------------------
// Se recorren todos los proyectos buscando procesos personalizados
// Se lee el proyecto principal para arrancar la búsqueda desde ese proyecto
// La función listaProyectos devuelve un array con los proyectos encontrados
// --------------------------------------------------------------------------------------
// var listaProyectos = [];
// var proyectos = buscarProyectos(proyecto);
var listaProcesos = [];
var listaProcesosPersonalizados = buscarProcesosPersonalizados();
