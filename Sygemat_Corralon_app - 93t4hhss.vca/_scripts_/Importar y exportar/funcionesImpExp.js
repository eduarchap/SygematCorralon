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
// Devuelve un objeto con los diferentes campos de la tabla y su tipo
// 
// @VTableInfo tableInfo: Objeto que representa al tableInfo
// @Objecto mapeoTabla: objeto en el cual mapearemos la tabla
// --------------------------------------------------------------------------------
var mapearTabla = function(tableInfo, mapeoTabla )
{
	// Se consideran contenedores los separadores, pila y caja de subformularios y el splitter
	var mapeoTabla = {};	
	for(var i = 0; i < tableInfo.fieldCount(); i++ ){
		var elemento = {};
		var tipo = tableInfo.fieldType(i);		
		if( tableInfo.fieldType(i) == "11" ){
			tipo = "" + tipo + "" + tableInfo.fieldObjectType(i);
		}
		if( tableInfo.fieldBindType(i) != 0 ){
			tipo = "2" + tipo + "" + tableInfo.fieldBindType(i);
		}
		mapeoTabla[ tableInfo.fieldId(i) ] = tipo
	}	
	return mapeoTabla;
};



// --------------------------------------------------------------------------------
// Genera los registros en la tabla temporal, correspondiente a los campos de la tabla
// pasada como parametros. Funcion recursiva
//
// @idRefTabla idRefTabla: String que contiene el alias y la tabla
// @Objecto mapeoTabla: objeto en el cual mapearemos la tabla
// --------------------------------------------------------------------------------
var generarRegistrosTablaTemporal = function( idRefTabla, tipoObjeto, cadenaBase, registroBase , nombrePadre )
{
	
	var registroInicial = new VRegister( theRoot );	
	var contadorCampos  = 0;
	
	registroInicial.setTable( idRefTabla );
	var tablaInfoPrincipal = registroInicial.tableInfo();
	var mapeoTablaPrincipal = mapearTabla( tablaInfoPrincipal , mapeoTablaPrincipal );	
	var tablaInfo = proyectoInfo.objectInfo(VObjectInfo.TypeTable, idRefTabla.split("/")[1] );
	
	var numObjetos  = tablaInfo.subObjectCount(tipoSubobjetos);
	//Si ya ha insertado la cantidad maxima de niveles, rompe
	if( (cadenaBase.length / cantidadDigitosNivel) >= numeroMaximoNivel){
		numObjetos = 0;		
	}
	// Ciclo que repite la accion en base a la cantidad de campos de la tabla
	for (var numObjeto = 0; numObjeto < numObjetos; numObjeto++)
	{
		var objeto = tablaInfo.subObjectInfo(tipoSubobjetos, numObjeto);			
		if (objeto.isPrivate() == false)
		{	
			// Se preparan los datos
			var objetoId   = objeto.id();
			var objetoName = objeto.name();
			contadorCampos += 1;
			
			// Se crear el registro en la tabla en memoria
			var registro = registroBase;			
			registro.setField("ID" , cadenaBase + "" + theRoot.calcFormulaVelneo("rightJustified(\"" + contadorCampos.toString() + "\",3,0)") );
			registro.setField("NAME" , nombrePadre + "" + objetoId + " - " + objetoName);
			registro.setField("TIP" , mapeoTablaPrincipal[objetoId].toString() );			
			registro.addRegister();	
			
			// Verificamos si el registro recien ingresado es de tipo enlace a maestro
			// para cargar sus campos tambien			
			var arrayTipoMapeado = mapeoTablaPrincipal[objetoId].toString().split("");	
			
			if( ( arrayTipoMapeado[0].toString() == "2") && ( typeof arrayTipoMapeado[1] != "undefined")){
				//Generamos los nuevos datos a enviarse a si misma (llamado recursivo)
				var subCadenaBase = cadenaBase + "" + theRoot.calcFormulaVelneo("rightJustified(\"" + contadorCampos.toString() + "\",3,0)");
				var subNombrePadre = "" + objetoId + ".";
				if( arrayTipoMapeado[2] == "2" ){//Es una tabla estatica, por ende añadimos 2 elementos
					//Agregamos el elemento del ID
					registro = registroBase;			
					registro.setField("ID" , subCadenaBase + "001"  );
					registro.setField("NAME" , subNombrePadre + "ID" );
					registro.setField("TIP" , "0" );					
					registro.addRegister();	
					
					//Agregamos el elemento del NAME
					registro = registroBase;			
					registro.setField("ID" , subCadenaBase + "002"  );
					registro.setField("NAME" , subNombrePadre + "NAME" );
					registro.setField("TIP" , "0" );					
					registro.addRegister();						
				}else{// Si es maestro normal, vamos a su tabla y la recorremos de forma recursiva
					var subIdRefTabla = tablaInfoPrincipal.fieldBoundedTableId( numObjeto ).replace(/@/g,"/");					
					generarRegistrosTablaTemporal( subIdRefTabla, tipoObjeto, subCadenaBase, registroBase, subNombrePadre);
				}
			}
			
		};
	};
};
