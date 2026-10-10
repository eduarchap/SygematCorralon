/**
 * Lista de campos de una tabla con persistencia en disco
 *
 * @description Devuelve un array con los identificadores de los campos que tienen persistencia en disco.
 * @version 2013-03-04
 * @param {VTableInfo} Tabla a procesar
 * @returns {Array} Identificadores de los campos de la tabla con persistencia en disco
 */
function tablaIdCamposDisco(tabla)
{
    // VARIABLES: Declaración de las variables
    var campos = [],
        numCampo = 0;

    // PROCESO: Se recorren los campos de la tabla y si tiene persistencia se guarda en el array de retorno
    if (tabla) {
        for (numCampo; numCampo < tabla.fieldCount(); numCampo += 1) {
            if (tabla.fieldBufferLen(numCampo) > 0) {
                campos.push(tabla.fieldId(numCampo));
            };
        };
    };

    // RETORNO: Se retorna el array de campos
    return campos;
};


/**
 * Tubo JSON
 *
 * @description Crear uno o una lista de registros en una tabla de destino a partir de uno o una lista de registros de una tabla de origen.
 * @version 2015-04-09 11:00
 * @author jarboleya (Velneo)
 * @param {VRegister|VRegisterList} origen Lista o registro de la tabla de origen
 * @param {String} tablaDestinoIdRef Identificador de referencia de la tabla de destino (Si se deja vacía asuma la misma de origen)
 * @param {Array} capilaresParam Array de objetos que representan la lista de capilares (campos origen y destino) a traspasar
 * @returns {Array} Lista o registro añadidos a la tabla de destino
 * @requires tablaIdCamposDisco - Función que devuelve un array con los identificadores de los campos que tienen persistencia en disco
 * @description Un capilar tiene 3 datos: El tipo, el destino y el origen
 * @description El tipo puede tener 3 valores (auto/campo/valor)
 * @description Cuando se usa el valor auto (autocapilares) no es necesario pasar origen y destino
 * @description Con los autocapilares se genera un capilar para los campos con el mismo id en las tablas de origen y destino
 * @description El destino contiene el id del campo destino
 * @description El origen contiene el id del campo origen (tipo campo), el valor (tipo valor) o la función a ejecutar (tipo función)
 */
function tubo(origen, tablaDestinoIdRef, capilaresParam)
{ 		
	/* ------------------------------------------------------------------- *
 	 * TABLA DESTINO: Si la tabla destino está vacía se asume la de origen *
 	 * ------------------------------------------------------------------- */
	var infoTablaOrigen = origen.tableInfo();
	if (tablaDestinoIdRef === "") {
		tablaDestinoIdRef = infoTablaOrigen.idRef()
	};

	/* ---------------------------------------------------------------------------- *
 	 * LISTA DESTINO: Se preparan los registros de trabajo y los objetos de retorno *
 	 * ---------------------------------------------------------------------------- */
	var registroOrigen = new VRegister(theRoot);
	var listaRetorno = new VRegisterList(theRoot);
	listaRetorno.setTable(tablaDestinoIdRef);

	/* ------------------------------------------------------------------------------ *
	 * CAPILARES: Se repasan los capilares para crear la lista de capilares definitva *
 	 * ------------------------------------------------------------------------------ */
	var capilares = [];
	for (var numCapilar = 0; numCapilar < capilaresParam.length; numCapilar++)
	{

		// Si el capilar es de tipo "auto" se pasan los campos comunes sino el capilar recibido
		if (capilaresParam[numCapilar].tipo === "auto") {
			var camposOrigen = tablaIdCamposDisco(origen.tableInfo());
			var camposDestino = tablaIdCamposDisco(listaRetorno.tableInfo());
			
			for (var numCampo = 0; numCampo < camposOrigen.length; numCampo += 1)
			{
				if (camposOrigen[numCampo].indexOf(camposDestino))
				{
					capilar = {};
					capilar.tipo = "campo";
					capilar.destino = camposOrigen[numCampo];
					capilar.origen = camposOrigen[numCampo];
					capilares.push(capilar); 
				};
			};	
		} else {
			capilares.push(capilaresParam[numCapilar]);
		};
	};
	
	/* --------------------------------------------------------------------------------------------- *
	 * TIPOS DE CAMPO Y OBJETO: Se repasan los capilares para leer el tipo de campo y tipo de objeto *
 	 * --------------------------------------------------------------------------------------------- */
	var tipoCampo = [];
	var tipoObjeto = [];
	for (var numCapilar = 0; numCapilar < capilares.length; numCapilar++)
	{	
		// Se atrapa el tipo de campo u objeto si es del tipo campo
		if (capilares[numCapilar].tipo === "campo")
		{
			var campoOrigenId = capilares[numCapilar].origen;
			var tipoCampoOrigen = infoTablaOrigen.fieldType(infoTablaOrigen.findField(campoOrigenId));
			tipoCampo[numCapilar] = tipoCampoOrigen;
			
			if (tipoCampoOrigen === VTableInfo.FieldTypeObject) {
				tipoObjeto[numCapilar] = infoTablaOrigen.fieldObjectType(infoTablaOrigen.findField(capilares[numCapilar].origen));
			};
		};
	};
	
	/* ------------------------------------------------------------- *
	 * TRANSACCION: Se comprueba si hay en curso o se crea una nueva *
 	 * ------------------------------------------------------------- */
	var hayTrans = theRoot.existTrans();
	if (hayTrans === false)	{	
		var nuevaTrans = theRoot.beginTrans("Tubo de tabla " + infoTablaOrigen.idRef() + " a tabla " + tablaDestinoIdRef);
	};
	
	if (hayTrans || nuevaTrans)
	{		
		// PROCESO: Se procesan los registros de la lista o ficha y se crean los de destino
		for (var numRegistro = 0; numRegistro < origen.size(); numRegistro++)
		{
			var registroOrigen = origen.readAt(numRegistro);
			var registroDestino = new VRegister(theRoot);
			registroDestino.setTable(tablaDestinoIdRef);
			
			// Se recorren los capilares y se rellenan los valores de los campos de destino
			for (var numCapilar = 0; numCapilar < capilares.length; numCapilar++)
			{
				// Se procesan los capilares en función del tipo
				switch (capilares[numCapilar].tipo)
				{
					case "valor":
						var valor = capilares[numCapilar].origen;
						registroDestino.setField(capilares[numCapilar].destino, valor);
						break;
					case "campo":
						var campoOrigenId = capilares[numCapilar].origen;

						// Si no hay identificador de campo origen se asume que es igual que el del campo destino
						if (!capilares[numCapilar].destino ) {
							var campoDestinoId = capilares[numCapilar].origen;
						} else {
							var campoDestinoId = capilares[numCapilar].destino;	
						};
						
						// Se recupera el valor del campo origen en función del tipo
						switch (tipoCampo[numCapilar])
						{
							case VTableInfo.FieldTypeAlpha128:
							case VTableInfo.FieldTypeAlpha256:
							case VTableInfo.FieldTypeAlpha40:
							case VTableInfo.FieldTypeAlpha64:
							case VTableInfo.FieldTypeAlphaLatin1:
							case VTableInfo.FieldTypeAlphaUtf16:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToString(campoOrigenId));
								break;
							case VTableInfo.FieldTypeBool:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToInt(campoOrigenId));
								break;
							case VTableInfo.FieldTypeNumeric:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToDouble(campoOrigenId));
								break;
							case VTableInfo.FieldTypeDate:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToString(campoOrigenId));
								break;
							case VTableInfo.FieldTypeDateTime:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToDateTime(campoOrigenId));
								break;
							case VTableInfo.FieldTypeTime:
								registroDestino.setField(campoDestinoId, registroOrigen.fieldToTime(campoOrigenId));
								break;
							
							// Los campos de tipos objeto se pasan según su tipo
							case VTableInfo.FieldTypeObject:
								switch (tipoObjeto[numCapilar])
								{
									case VTableInfo.ObjectTypeText:
									case VTableInfo.ObjectTypeRichText:
									case VTableInfo.ObjectTypeFormula:
										registroDestino.setField(campoDestinoId, registroOrigen.fieldToString(campoOrigenId));
										break;
									case VTableInfo.ObjectTypePicture:
										registroDestino.setFieldImage(campoDestinoId, registroOrigen.fieldToImage(campoOrigenId));
										break;
									case VTableInfo.ObjectTypeBinary:
										registroDestino.setFieldByteArray(campoDestinoId, registroOrigen.fieldToByteArray(campoOrigenId));
										break; 
								};
						};
						break;
				};				
			};

            // Se crea el registro en la tabla de destino y se añade a la lista de retorno
			registroDestino.addRegister();
			listaRetorno.append(registroDestino);
		};
		
	    // TRANSACCION: Si se creó una nueva transacción, se cierra
		if ( nuevaTrans ) {
			theRoot.commitTrans();
		};
	};
	
	/* ----------------------------------------------------------- *
	 * RETORNO: Se retorna la ficha o lista de registros generados *
 	 * ----------------------------------------------------------- */
    if (listaRetorno.size() > 0) {
		return listaRetorno;
	};
};


/**
 * Tubo
 *
 * @description Ejecución principal del proceso generación de registros a partir de una lista de origen (tubo).
 * @version 2015-04-09 09:10
 * @author jarboleya (Velneo)
 * @description No se reciben parámetros, se usa una variable local del proceso V7 llamada PAR.
 * @description La variable alfabética PAR contiene 3 datos con los que se ejecuta el tubo.
 * @description cestaOrigen: idRef de la cesta que contiene la lista de registros de origen.
 * @description cestaDestino: idRef de la cesta que contiene la lista de registros de origen.
 * @description capilares: Objeto JSON con los capilares.
 */

// ----------------------------------------
// Preparar los parámetros recibidos
// ----------------------------------------
var parametros = JSON.parse(theRoot.varToString("PAR")); 
var cestaOrigen = parametros.cestaOrigen;
var cestaDestino = parametros.cestaDestino;
var capilares = JSON.parse(parametros.capilares);

// --------------------------------------------
// Preparar las listas de origen y destino
// --------------------------------------------
var listaOrigen = new VRegisterList(theRoot);
var listaDestino = new VRegisterList(theRoot);

theApp.getBasket(cestaOrigen, listaOrigen);
theApp.getBasket(cestaDestino, listaDestino);

var tablaOrigen = listaOrigen.tableInfo().idRef();
var tablaDestino = listaDestino.tableInfo().idRef();

// --------------------------------
// Ejecutamos el tubo de lista
// --------------------------------
listaDestino = tubo(listaOrigen, tablaDestino, capilares);

// -------------------------------------------------
// Retornamos la lista de registros generados
// -------------------------------------------------
if (listaDestino) {
	theApp.setBasket(cestaDestino, listaDestino);
};
