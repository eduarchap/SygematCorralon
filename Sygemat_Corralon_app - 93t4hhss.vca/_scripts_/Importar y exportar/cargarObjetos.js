#include "(CurrentProject)/Importar y exportar/funcionesImpExp.js"

// Leer el proyecto seleccionado, tabla y obtener los objetos de trabajo
var aliasProyecto      = theRegisterIn.fieldToString("PRY");
var identificadorTabla = theRegisterIn.fieldToString("ID_REF_TAB");
var proyectoPrincipal  = theApp.mainProjectInfo();
var proyectoInfo       = theApp.projectInfo( aliasProyecto );

if ( (proyectoInfo) && ( identificadorTabla != "" ))
{	
	// Leemos la tabla seleccionada		
	var tablaInfo = proyectoInfo.objectInfo(VObjectInfo.TypeTable, identificadorTabla );
	if (tablaInfo)
	{	
		// Se abre transacción si no existe
		transCurso = theRoot.existTrans();
		if (transCurso == false)
		{
			var transNueva = theRoot.beginTrans("Creando los detalles de la plantilla de importacion");
		};
		
		if (transCurso || transNueva)
		{
			// Generar los registros correspondientes a los campos de la tabla
			var tipoSubobjetos          = VObjectInfo.TypeField;			
			var numObjetos              = tablaInfo.subObjectCount(tipoSubobjetos);
			
			for (var numObjeto = 0; numObjeto < numObjetos; numObjeto++)
			{
				var objeto = tablaInfo.subObjectInfo(tipoSubobjetos, numObjeto);			
				if (objeto.isPrivate() == false)
				{	
					// Se preparan los datos
					var objetoId   = objeto.id();
					var objetoName = objeto.name();
					
					// Se crear el registro en la tabla
					var registro = new VRegister(theRoot);
					registro.setTable("sygemat_corralon_dat/DTL_PLA_IMP_D");
					registro.setField("PLA_IMP" , theRegisterIn.fieldToInt("ID") );					
					registro.setField("NAME" , objetoId + " - " + objetoName);
					registro.setField("RES" , "");					
					registro.addRegister();					
				};
			};

			// Se cierra la transacción si se creó una nueva
			if (transNueva)
			{
				theRoot.commitTrans();
			};
		};
	};		
};