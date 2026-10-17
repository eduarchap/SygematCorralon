////////////////////////////////////////////////////////////
// Funciones para la ejecución de acciones
//
var velneoAccion = {};

//////////////////////////////////////////////////////////////////////////////////
// Ejecutar la acción del proyecto actual o del personalizado si existe 
//
// Parámetros:
//     - szAccionId: Identificador de la acción
//     - szAccionIdRef: Identificador de referencia de la acción en el proyecto por defecto
//
velneoAccion.exePersonalizadaEstandar = function ( szAccionId, szAccionIdRef )
{
	// Se verifica si existe una acción FRM_INI para el proyecto personalizado
	var proyectoPersonalizado = theApp.mainProjectInfo();
	var accionProyectoPersonalizado = proyectoPersonalizado.objectInfo( VObjectInfo.TypeAction, szAccionId );
	if ( accionProyectoPersonalizado.name() != "" )
	{
		// Si existe la acción en el proyecto personalizado se ejecuta
		theMainWindow.runAction( proyectoPersonalizado.alias() + "/" + szAccionId );
	}
	else {
		// Si no la acción en el proyecto personalizado se ejecuta la del proyecto en curso
		theMainWindow.runAction( szAccionIdRef );
	}
}