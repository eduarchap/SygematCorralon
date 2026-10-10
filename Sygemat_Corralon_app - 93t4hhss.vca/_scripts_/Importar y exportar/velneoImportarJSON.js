// -----------------------------------------------
// Importar una lista de registros en formato JSON
// -----------------------------------------------
importClass("VFile");
importClass("VTextFile");

// Preparar variables de trabajo
var senda       = theRoot.varToString("SND");
var fichero     = new VTextFile(senda);
var ficheroInfo = new VFile(senda);

// Control de transacción
var hayTrans = theRoot.existTrans();
if (hayTrans == false)
{
	var newTrans = theRoot.beginTrans("Importar registro de la tabla " + tablaIdRef);
};
	
// Se abre el fichero en modo de sólo lectura
if (fichero.open(VFile.OpenModeReadOnly) )
{
	// Fijamos la codificación del fichero
	fichero.setCodec("UTF-8");
	
	// Leemos el contenido del fichero en disco y extraemos su cabecera y datos
	var contenido      = fichero.readAll();
	var contenidoJSON  = JSON.parse(contenido);
	var cabeceraJSON   = contenidoJSON[0];
	var registros      = contenidoJSON[1];
	var registrosJSON  = registros.datos;
	
	// Leer la información de cabecera
	var tablaIdRef   = cabeceraJSON.tablaIdRef;
	var indiceId     = cabeceraJSON.indiceId;
	var indicePartes = cabeceraJSON.indicePartes;
	var registro     = new VRegister(theRoot);
	registro.setTable(tablaIdRef);
	var tablaInfo    = registro.tableInfo();

	// Obtenemos el array de objetos JSON de los datos importados
	var numRegistros            = registrosJSON.length;
	var numRegistrosNuevos      = 0;
	var numRegistrosModificados = 0;
	
	// me pongo a recorrer el arbol de permisos
	for (var numRegistro = 0; numRegistro < numRegistros; numRegistro++)
	{	
		// Leemos el registro en base al índice UID o ID dependiendo de si recibimos un UID o no.
		var registroJSON = registrosJSON[numRegistro];
		
		claves = [];
		for (var parte in indicePartes)
		{
			claves.push(registroJSON[indicePartes[parte]]);
		};
		
		var existe = registro.readRegister(indiceId, claves, VRegister.SearchThis);
		
		// Si no existe se crea
		if (existe == false)
		{
			// Leer los campos del objeto registro JSON
			var nuevoRegistro = new VRegister(theRoot);
			nuevoRegistro.setTable(tablaIdRef);
			
			// Recorremos los campos asignando valores
			for (var campoId in registroJSON)
			{
				nuevoRegistro.setField(campoId, registroJSON[campoId]);
			};

			// Grabar el registro
			nuevoRegistro.addRegister();
			numRegistrosNuevos++;
		}
		else
		{
			// Si existe, se comprueba si ha sido modificado en una versión posterior
			// y en ese caso se modifican los datos con los valores recibidos
			versionRegistro = registro.fieldToString("VER_ULT_ACT");
			versionJSON     = registroJSON["VER_ULT_ACT"];
			if (versionJSON > versionRegistro)
			{
				// Recorremos los campos asignando valores
				for (var campoId in registroJSON)
				{
					registro.setField(campoId, registroJSON[campoId]);
				};

				// Modificar el registro
				registro.modifyRegister();
				numRegistrosModificados++;					
			}
		};
	};

	// Se cierra el fichero
	fichero.close();
	
	// Mensaje de confirmación de importación correcta
	alert("Tabla " + ficheroInfo.info().baseName() + " se han añadido " + numRegistrosNuevos + " registro(s) y se han modificado " + numRegistrosModificados + " registro(s)");
} else {
	// Si no ha sido posible abrir el fichero se muestra error
	alert( "No se pudo abrir el fichero " + fichero.fileName() + ", error " + fichero.error(), "Error" );
};

// Finalizar transacción
if (newTrans) {
	theRoot.commitTrans();
};
