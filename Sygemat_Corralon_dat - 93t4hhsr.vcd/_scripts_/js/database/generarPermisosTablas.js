// -------------------------------------------------------------------------------------
// Generar permisos de tablas con prefijo, sufijo y descripción configurable
// -------------------------------------------------------------------------------------
// Leer los parámetros que nos pasan en variables locales del proceso
var prefijo     = theRoot.varToString("PRE"); 
var sufijo      = theRoot.varToString("SUF");
var descripcion = theRoot.varToString("DSC");
var idioma		= theRoot.varToString("IDI");

// Control de transacción
var hayTrans = theRoot.existTrans();
if (hayTrans == false) {
	var newTrans = theRoot.beginTrans("Generar permisos de tablas en el diccionario");
}
// Si hay transacción activa se ejecuta la generación de permisos del diccionario
if (hayTrans || newTrans)
{
	// Generamos el registro del permiso del diccionario
	var registroPermiso = new VRegister(theRoot);
	registroPermiso.setTable("sygemat_corralon_dat/PRM_DIC_W");
	
	// Recorremos todas las tablas
	var proyectoPrincipal = theApp.mainProjectInfo();
	var numTablas         = proyectoPrincipal.allTableCount();
	
	for (numTabla = 0; numTabla < numTablas; numTabla++)
	{
		// Leemos los datos de la tabla
		var tablaInfo   = proyectoPrincipal.allTableInfo(numTabla);
		var tablaIdRef  = tablaInfo.idRef();
		var tablaNombre = tablaInfo.name(idioma);
		
		// Generamos en el registro del permiso en el diccionario
		registroPermiso.setField("ID",  "" + prefijo + tablaIdRef + sufijo);
		registroPermiso.setField("NAME", "" + descripcion + " " + tablaNombre);
		registroPermiso.addRegister();
	};
};

// Finalizar transacción
if (newTrans)
	theRoot.commitTrans();
