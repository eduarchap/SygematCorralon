#include "(CurrentProject)/js/database/velneoNumero.js"

/**
 * @file Funciones de base de datos
 * @author jarboleya (Velneo)
 */
var velneoDB = {};

/**
 * Regeneración del área de datos e índices de tablas
 *
 * @description Regenera todas las tablas, en función de la selección
 * @version 2013-03-04
 * @param {String} sOpcion Opción a aplicar:
                       - confirmar: Solicita confirmación de tarea a realizar
                       - autoSoloAreaDatos: Regenera sólo el área de datos
                       - autoSoloIndices: Regenera sólo el área de índices
                       - autoTodo: Regenera el área de datos y los índices
 * @returns {Boolean} True si finaliza correctamente o false en caso contrario
 */
velneoDB.regenTablas = function (opcion) {

    // VARIABLES: Declaración de las variables
    var regenerarAreaDatos,
        regenerarIndices,
        indice = 0,
        msgError = "",
		proyectoPrincipal,
        retorno,
        tabla,
        tablaInfo;

    // SELECCION: Se preparan las variables en función del parámetro recibido
    switch (opcion) {
    case "confirmar":
        regenerarAreaDatos = confirm("¿Desea regenerar el área de datos de todas las tablas?", "Confirmación");
        regenerarIndices = confirm("¿Desea regenerar los índices de todas las tablas?", "Confirmación");
        break;

    case "autoSoloAreaDatos":
        regenerarAreaDatos = true;
        regenerarIndices = false;
        break;

    case "autoSoloIndices":
        regenerarAreaDatos = false;
        regenerarIndices = true;
        break;

    case "autoTodo":
        regenerarAreaDatos = true;
        regenerarIndices = true;
        break;
    }

    // PROCESO: Se leen todas las tablas de la aplicación incluídas las heredadas
    if (regenerarAreaDatos || regenerarIndices) {
        proyectoPrincipal = theApp.mainProjectInfo();
        if (proyectoPrincipal) {
            for (indice; indice < proyectoPrincipal.allTableCount(); indice += 1) {

                // Leer la información de la tabla y el idRef
                tablaInfo = proyectoPrincipal.allTableInfo(indice);
                tabla = tablaInfo.idRef();

                // Sólo se regenera el área de datos de las tablas en disco
                if (regenerarAreaDatos && (tablaInfo.isInMemory() === false)) {
                    if (!theApp.regenDataArea(tabla, true)) {
                        msgError += "Falló la regeneración del área de datos de la tabla " + tabla + "\n";
                    }
                }

                // Se regeneran los índices de todas las tablas sean en disco o en memoria
                if (regenerarIndices) {
                    if (!theApp.regenIndexes(tabla, true)) {
                        msgError += "Falló la regeneración de índices de la tabla " + tabla + "\n";
                    }
                }
            }
        }
    }

    // RETORNO: Mensaje final del resultado de las regeneraciones y retorno
    if ( msgError.toString().length === 0 ) {
        alert( "El proceso de regeneración ha finalizado correctamente", "Notificación" );
        retorno = true;
    } else {
        alert( "Se han producido los siguientes errores: \n" + msgError, "¡Atención!" );
        retorno = false;
    }
    return retorno;
};


/**
 * Eliminar todos los plurales de un registro
 *
 * @version 2013-03-04
 * @param {Object} root Objeto desde el que se ejecuta  la función
 * @param {VRegister} registro Registro del que se desean eliminar los plurales
 * @returns {Boolean} True si se han eliminado todos los pluarales o false en caso contrario
 */
velneoDB.eliminarPlurales = function (root, registro) {

    // VARIABLES: Declaración de las variables
    var listaPlurales,
        indice = 0,
        numPlurales,
        numRegistro = 0,
        numRegistros,
        pluralId,
        registroPlural,
        retorno = true,
        tablaInfo,
        transActiva,
        transNueva;

    // PROCESO: Se leen todas las tablas de la aplicación incluídas las heredadas
    if (root) {

        // Si no hay transacción se crea una nueva      
        transActiva = theRoot.existTrans();
        if (transActiva === false) {
            transNueva = theRoot.beginTrans("Eliminando históricos de la tabla " + tablaInfo.name());
        }
        if (transActiva || transNueva) {

            // Se analiza la tabla para recorrer sus plurales
            tablaInfo = registro.tableInfo();
            numPlurales = tablaInfo.pluralCount();

            // Se recorren los plurales de la tabla
            for (indice; indice < numPlurales; indice += 1) {
                pluralId = tablaInfo.pluralId(indice);
                listaPlurales = theRegisterIn.loadPlurals(pluralId);
                numRegistros = listaPlurales.size();

                // Se eliminan los registros plurales
                if (numRegistros > 0) {
                    for (numRegistro; numRegistro < numRegistros; numRegistro += 1) {
                        registroPlural = listaPlurales.readLockingAt(numRegistro);
                        if (registroPlural.deleteRegister() === false) {
                            retorno = false;
                        }
                    }
                }
            }

            // Si se ha creado una transacción nueva, se cierra
            if (transNueva === true) {
                theRoot.commitTrans();
            }
        }
    }

    // RETORNO: Retornor true si se han podido eliminar todos los plurales
    return retorno;
};


/**
 * Devuelve información de los registros plurales de un registro
 *
 * @version 2015-03-08
 * @param {Object} root Objeto desde el que se ejecuta  la función
 * @param {VRegister} registro Registro del que se desean eliminar los plurales
 * @returns {Boolean} True si se han eliminado todos los pluarales o false en caso contrario
 */
velneoDB.infoPlurales = function (registro)
{
	// Se analiza la tabla para recorrer sus plurales
	var tablaInfo = registro.tableInfo();
	var numPlurales = tablaInfo.pluralCount();
	var retorno = "";
	
	// Se recorren los plurales de la tabla
	for (var numPlural = 0; numPlural < numPlurales; numPlural++)
	{
		var pluralId = tablaInfo.pluralId(numPlural);
		var listaPlurales = theRegisterIn.loadPlurals(pluralId);
		var numRegistros = listaPlurales.size();
		
		// Se añade la información al retorno
		retorno += "" + pluralId + " (" + numRegistros + ")\n";
	};

    // Se retorna la cadena con la información de los plurales del registro
    return retorno;
};


/**
 * Lista de valores de un campo en una lista de registros
 *
 * @description Devuelve un array con la lista de valores diferentes encontrados en un campo de una lista de registros
 * @version 2013-03-04
 * @param {VRegisterLis} lista Lista de registros a encarpetar
 * @param {String} szCampoId Identificador del campo por el que se encarpeta
 * @returns {Array} Lista de campos con el formato (szValor + "|" + nIndice)
 */
velneoDB.listaValoresUnicosCampo = function ( lista, szCampoId ) {

    // Multipartir la lista por el campo seleccionado
	var listas = lista.multiSplit( szCampoId );
	nNumListas = listas.length;		
		
	// Preparar los valores de la tabla y el tipo de campo
	var tabla = lista.tableInfo();	
	var nNumCampo = tabla.findField( szCampoId );
	var szTipoCampo = tabla.fieldType( nNumCampo );
	var szTipoEnlaceCampo = tabla.fieldBindType( nNumCampo );
	var bOrdenar = 0;
	
	// Se recorre el array de listas de registros para generar las pestañas
	var aValoresCampo = new Array();
	for( var nIndice = 0; nIndice < nNumListas; nIndice++ )
	{			
		// Se lee el primer registro de la lista para atrapar el valor del campo
		var registro = listas[ nIndice ].readAt( 0 );
		
		// En función del tipo de enlace y de tipo de campo se devuelve un valor u otro
		if ( szTipoEnlaceCampo == VTableInfo.BindTypeMaster )
		{
			bOrdenar = 1;
			var szCampoIdNombreMaestro = szCampoId + ".NAME";
			var szValor = registro.fieldToString( szCampoIdNombreMaestro );
		} 
		else 
		{			
			if ( szTipoCampo == VTableInfo.FieldTypeNumeric )
			{
				var szValor = velneoNumero.formatear( registro.fieldToString( szCampoId ) );
			}
			else
			{
				var szValor = registro.fieldToString( szCampoId );
			}
		}
		
		// Añadir el valor al array
		aValoresCampo[ nIndice ] = szValor + "|" + nIndice;
	}
	
	// Se ordena la lista de retorno si el tipo de campo es maestro y se devuelve el nombre
	if ( bOrdenar == 1 )
		aValoresCampo.sort();
	
	// Se retorna el array de valores del campo	
	return aValoresCampo
};


/**
 * Lista de campos de una tabla
 *
 * @description Devuelve un array con la campos que tiene una tabla
 * @version 2013-03-04
 * @param {VTableInfo} tabla Objeto que se corresponde con la tabla a procesar
 * @returns {Array} Lista de campos de la tabla con el formato (Nombre_Campo | Identificador_Campo)
 */
velneoDB.tablaCampos = function ( tabla ) {

    // Si hay objeto root
	if ( tabla != "undefined" )
	{
		// Si el objeto tiene tabla de entrada se cargan sus campos en un array a retonar
		if ( tabla )
		{
			var nNumCampos = tabla.fieldCount();
			var aCampos = new Array();
			for ( var nIndice = 0; nIndice < nNumCampos; nIndice++ )
			{ 
				var szValores = tabla.fieldName( nIndice ).concat( "|", tabla.fieldId( nIndice ) );
				aCampos[ nIndice ] = szValores;
			}
			
			// Se retorna el array de campos
			return aCampos;
		}
	}
};


/**
 * Lista de índices de una tabla
 *
 * @description Devuelve un array con los índices de la tabla de origen de un objeto. No se incluyen los índices de palabras y trozos
 * @version 2013-03-04
 * @param {VRoot} root Objeto que se corresponde con el objeto cuyo tabla de origen es la tabla a procesar
 * @returns {Array} Lista de índices de la tabla con el formato (Nombre_Indice | Identificador_Indice)
 */
velneoDB.tablaIndices = function ( root ) {
    
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
				var tabla = objeto.inputTable();
				
				// Si el objeto tiene tabla de entrada se cargan sus índices en el array
				if ( tabla )
				{
					var nNumIndices = tabla.indexCount();
					var aIndices = new Array();
					for ( var nIndice = 0; nIndice < nNumIndices; nIndice++ ) { 
						if ( ( tabla.indexType( nIndice ) != VTableInfo.IndexTypeWordParts ) &&
							( tabla.indexType( nIndice ) != VTableInfo.IndexTypeWords ) )
						{
							var szNombreIdIndice = tabla.indexName( nIndice ).concat( "|", tabla.indexId( nIndice ) );
							aIndices[ nIndice ] = szNombreIdIndice;
						}
					}
					
					// Se retorna el array de índices
					return aIndices
				}
			}
		}
	}
};


/**
 * Lista de campos de una tabla con persistencia en disco
 *
 * @description Devuelve un array con los identificadores de los campos que tienen persistencia en disco.
 * @version 2013-03-04
 * @param {VTableInfo} Tabla a procesar
 * @returns {Array} Identificadores de los campos de la tabla con persistencia en disco
 */
velneoDB.tablaIdCamposDisco = function (tabla) {

    // VARIABLES: Declaración de las variables
    var campos = [],
        numCampo = 0;

    // PROCESO: Se recorren los campos de la tabla y si tiene persistencia se guarda en el array de retorno
    if (tabla) {
        for (numCampo; numCampo < tabla.fieldCount(); numCampo += 1) {
            if (tabla.fieldBufferLen(numCampo) > 0) {
                campos.push(tabla.fieldId(numCampo));
            }
        }
    }

    // RETORNO: Se retorna el array de campos
    return campos;
};


/**
 * Determinar si hemos recibido una ficha o una lista
 *
 * @description Devuelve el texto "ficha" o "lista" en función del tipo de objeto recibido.
 * @version 2015-03-03
 * @param {VTableInfo} Tabla a procesar
 * @returns {Array} Identificadores de los campos de la tabla con persistencia en disco
 */
velneoDB.esFichaOLista = function (origen) {

	/* ---------------------------------------------------------------------
 	 * TUBO DE FICHA O LISTA: Se determina si es un tubo de ficha o de lista
 	 * --------------------------------------------------------------------- */
	var tipoTubo = null;
	var lista = new VRegisterList(theRoot);
	try {
		if (origen.exist() === true) {
			tipoTubo = "ficha";
		};
	} catch( err ) {
		tipoTubo = "lista";
	};
	
	return tipoTubo;
};


/**
 * Ejecutar función anónima
 *
 * @description Ejecuta una función anónima que se le pasa como parámetro
 * @version 2015-03-03
 * @param {function} Función a ejecutar
 * @returns {variant} Devuelve el valor calculado por la función que se le pasa
 */
velneoDB.ejecutarFuncion = function (funcion, registro)
{	
	var retorno = eval(funcion);
	return retorno;
};


/**
 * Tubo de ficha/lista
 *
 * @description Crear uno o una lista de registros en una tabla de destino a partir de uno o una lista de registro de una tabla de origen.
 * @version 2013-03-06 17:02
 * @author jarboleya (Velneo)
 * @param {VRegister|VRegisterList} origen Lista o registro de la tabla de origen
 * @param {String} tablaDestinoIdRef Identificador de referencia de la tabla de destino (Si se deja vacía asuma la misma de origen)
 * @param {Array} capilaresParam Array de objetos que representan la lista de capilares (campos origen y destino) a traspasar
 * @description Un capilar con "*" significa que se desean pasar los campos comunes (mismo identificador)
 * @description Si sólo se pasa un identificador de campo se asume que el campo destino tiene el mismo identificador
 * @description El campo de origen también puede ser una función que recibirá el registro de origen y devolverá el valor
 * @returns {Array} Lista o registro añadidos a la tabla de destino
 * @requires velneoDB.tablaIdCamposDisco - Devuelve un array con los identificadores de los campos que tienen persistencia en disco
 */
velneoDB.tubo = function (origen, tablaDestinoIdRef, capilaresParam) { 
	
	/* ---------------------------------------------------------------------
 	 * TUBO DE FICHA O LISTA: Se determina si es un tubo de ficha o de lista
 	 * --------------------------------------------------------------------- */
	var tipoTubo = null;
	var lista = new VRegisterList(theRoot);
	try {
		if (origen.exist() === true) {
			lista.setTable(origen.tableInfo().idRef());
			lista.append(origen);
			tipoTubo = "ficha";
		}
	} catch(err) {
		lista = origen;
		tipoTubo = "lista";
	};
	
	/* ------------------------------------------------------------------- *
 	 * TABLA DESTINO: Si la tabla destino está vacía se asume la de origen *
 	 * ------------------------------------------------------------------- */
	var infoTablaOrigen = lista.tableInfo();
	if ( tablaDestinoIdRef === "" ) {
		tablaDestinoIdRef = infoTablaOrigen.idRef()
	}

	/* ---------------------------------------------------------------------------- *
 	 * LISTA DESTINO: Se preparan los registros de trabajo y los objetos de retorno *
 	 * ---------------------------------------------------------------------------- */
	var registroOrigen = new VRegister( theRoot );
	var registroTablaDestino = new VRegister( theRoot );
	registroTablaDestino.setTable( tablaDestinoIdRef );
	var listaRetorno = new VRegisterList( theRoot );
	listaRetorno.setTable( tablaDestinoIdRef );

	/* ------------------------------------------------------------------------------ *
	 * CAPILARES: Se repasan los capilares para crear la lista de capilares definitva *
 	 * ------------------------------------------------------------------------------ */
	var capilares = [];
	for ( var numCapilar = 0; numCapilar < capilaresParam.length; numCapilar += 1 ) {

		// Si el capilar es un "*" se pasan los campos comunes sino el capilar recibido
		if ( capilaresParam[ numCapilar ].origen === "*" ) {
			var camposOrigen = velneoDB.tablaIdCamposDisco( lista.tableInfo() );
			var camposDestino = velneoDB.tablaIdCamposDisco( registroTablaDestino.tableInfo() );
			
			for ( var numCampo = 0; numCampo < camposOrigen.length; numCampo += 1 ) {
				if ( camposOrigen[ numCampo ].indexOf( camposDestino ) ) {
					capilar = {};
					capilar.origen = camposOrigen[ numCampo ];
					capilar.destino = camposOrigen[ numCampo ];
					capilares.push( capilar ); 
				}
			}	
		} else {
			capilares.push( capilaresParam[ numCapilar ] );
		}
	}
	
	/* --------------------------------------------------------------------------------------------- *
	 * TIPOS DE CAMPO Y OBJETO: Se repasan los capilares para leer el tipo de campo y tipo de objeto *
 	 * --------------------------------------------------------------------------------------------- */
	var tipoCampo = [];
	var tipoObjeto = [];
	for ( var numCapilar = 0; numCapilar < capilares.length; numCapilar += 1 ) {
		
		// Se atrapa el tipo de campo u objeto salvo que sea una función
		if ((capilares[ numCapilar ].origen.substr(0, 2) !== "%%") && (capilares[ numCapilar ].origen.substr(0, 2) !== "@@")) {
			var campoOrigenId = capilares[ numCapilar ].origen;
			var tipoCampoOrigen = infoTablaOrigen.fieldType( infoTablaOrigen.findField( campoOrigenId ) );
			tipoCampo[ numCapilar ] = tipoCampoOrigen;
			
			if ( tipoCampoOrigen === VTableInfo.FieldTypeObject ) {
				tipoObjeto[ numCapilar ] = infoTablaOrigen.fieldObjectType( infoTablaOrigen.findField( capilares[ numCapilar ].origen ) );
			}
		}
	}
	
	/* ------------------------------------------------------------- *
	 * TRANSACCION: Se comprueba si hay en curso o se crea una nueva *
 	 * ------------------------------------------------------------- */
	var hayTrans = theRoot.existTrans();
	if ( hayTrans === false ) 
	{	
		var nuevaTrans = theRoot.beginTrans( "Tubo a tabla " + tablaDestinoIdRef );
	}
	if ( hayTrans || nuevaTrans )
	{		
	
		// PROCESO: Se procesan los registros de la lista o ficha y se crean los de destino
		for ( var numRegistro = 0; numRegistro < lista.size(); numRegistro += 1 ) {
			var registroOrigen = lista.readAt( numRegistro );
			var registroDestino = new VRegister( theRoot );
			registroDestino.setTable( tablaDestinoIdRef );
			
			// Se recorren los capilares y se rellenan los valores de los campos de destino
			for ( var numCapilar = 0; numCapilar < capilares.length; numCapilar += 1 ) {

				// Si el primer parámetro es una función se ejecuta y se pasa el valor al campo destino
				if ( capilares[ numCapilar ].origen.substr(0, 2) == "%%" )
				{
					var funcion = capilares[ numCapilar ].origen.substr(2);
					var valor = velneoDB.ejecutarFuncion(funcion, registroOrigen);
					registroDestino.setField( capilares[ numCapilar ].destino, valor );
				} else
				{
					// Si es un valor constante se asigna directamente al campo de destino
					if ( capilares[ numCapilar ].origen.substr(0, 2) == "@@" )
					{
						var valor = capilares[ numCapilar ].origen.substr(2);
						registroDestino.setField( capilares[ numCapilar ].destino, valor );
					} else
					{	
						// Si se ejecuta este código es un capilar de identificadores de campos origen y destino
						var campoOrigenId =  capilares[ numCapilar ].origen;

						// Si no hay identificador de campo destino se asume que es igual que el del campo origen
						if ( !capilares[ numCapilar ].destino ) {
							var campoDestinoId =  capilares[ numCapilar ].origen;
						}	else {
							var campoDestinoId =  capilares[ numCapilar ].destino;
						}
						
						// Se recupera el valor del campo origen en función del tipo
						switch ( tipoCampo[ numCapilar ] )
						{
							case VTableInfo.FieldTypeAlpha128:
							case VTableInfo.FieldTypeAlpha256:
							case VTableInfo.FieldTypeAlpha40:
							case VTableInfo.FieldTypeAlpha64:
							case VTableInfo.FieldTypeAlphaLatin1:
							case VTableInfo.FieldTypeAlphaUtf16:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToString( campoOrigenId ) );
								break;
							
							case VTableInfo.FieldTypeBool:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToInt( campoOrigenId ) );
								break;
							
							case VTableInfo.FieldTypeNumeric:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToDouble( campoOrigenId ) );
								break;
							
							case VTableInfo.FieldTypeDate:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToString( campoOrigenId ) );
								break;
							
							case VTableInfo.FieldTypeDateTime:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToDateTime( campoOrigenId ) );
								break;
							
							case VTableInfo.FieldTypeTime:
								registroDestino.setField( campoDestinoId, registroOrigen.fieldToTime( campoOrigenId ) );
								break;
							
							// Los campos de tipos objeto se pasan según su tipo
							case VTableInfo.FieldTypeObject:
								switch ( tipoObjeto[ numCapilar ] )
								{
									case VTableInfo.ObjectTypeText:
									case VTableInfo.ObjectTypeRichText:
									case VTableInfo.ObjectTypeFormula:
										registroDestino.setField( campoDestinoId, registroOrigen.fieldToString( campoOrigenId ) );
										break;
									
									case VTableInfo.ObjectTypePicture: // Actualmente no está operativo este tipo de campo
										break;
									
									case VTableInfo.ObjectTypeBinary: // Actualmente no está operativo este tipo de campo
										break; 
								}
						};
					};
				};
			};

            // Se crea el registro en la tabla de destino y se añade a la lista de retorno
			registroDestino.addRegister();
			listaRetorno.append( registroDestino );
		}
		
	    // TRANSACCION: Si se creó una nueva transacción, se cierra
		if ( nuevaTrans ) {
			theRoot.commitTrans();
		}
	}
	
	/* ----------------------------------------------------------- *
	 * RETORNO: Se retorna la ficha o lista de registros generados *
 	 * ----------------------------------------------------------- */
    if (listaRetorno.size() > 0) {
		retorno = (tipoTubo === "lista") ? listaRetorno : listaRetorno.readAt(0);
		return retorno;
	}
};
