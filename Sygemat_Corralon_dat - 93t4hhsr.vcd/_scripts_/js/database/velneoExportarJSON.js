importClass("VFile");
importClass("VTextFile");

/*
  * --------------------------------------------------------
  * Exportar una lista de registros a formato JSON
  * --------------------------------------------------------
  */
function listaExportarJSON(listaParam, indiceIdParam, indicePartesParam, versionParam, camposParam)
{
	// ------------------------------------------
	// Preparamos las variables de trabajo
	// ------------------------------------------
    var tablaInfo        = listaParam.tableInfo();
	var tablaIdRef       = tablaInfo.idRef();
    var numCampos        = tablaInfo.fieldCount();
    var numRegistros     = listaParam.size();
	var ficheroJSON      = [];
    var datosJSON        = [];
    var camposExportar   = [];
	var camposNoExportar = [];
	
	// ---------------------------------------------------------------
    // Si nos pasan una lista de campos a no exportar creamos un array
	// ---------------------------------------------------------------
	if (camposParam !== undefined)
	{
		camposNoExportar = camposParam.toUpperCase().split(",");
	}

	// ---------------------
	// Generar cabecera JSON
	// ---------------------
	ficheroJSON.push({ "tablaIdRef"   : tablaIdRef,
					   "indiceId"     : indiceIdParam,
					   "indicePartes" : indicePartesParam,
					   "version"      : versionParam,
					   "numRegistros" : numRegistros });

	// -----------------------------------
    // Seleccionamos los campos a exportar
	// -----------------------------------
    
	for (var numCampo = 0; numCampo < numCampos; numCampo++)
	{
		if (tablaInfo.fieldBufferLen(numCampo) > 0)
		{
			if (camposNoExportar.indexOf(tablaInfo.fieldId(numCampo)) == -1)
			{
				camposExportar.push({campoId: tablaInfo.fieldId(numCampo), campoTipo: tablaInfo.fieldType(numCampo), campoTipoObjeto: tablaInfo.fieldObjectType(numCampo)});
			}
		}
	}

	// -------------------------------------------------------
	// Se recorren los registros de la lista generando el JSON
	// -------------------------------------------------------
	numCampos = camposExportar.length;
	for (var numRegistro = 0; numRegistro < numRegistros; numRegistro++ )
	{
        var registro = listaParam.readAt(numRegistro);
        var registroJSON = {};
		for (var numCampo = 0; numCampo < numCampos; numCampo++ )
		{
            registroJSON[camposExportar[numCampo].campoId] = mapearCampo(camposExportar[numCampo].campoId, camposExportar[numCampo].campoTipo, camposExportar[numCampo].campoTipoObjeto, registro);
        };
        datosJSON.push(registroJSON);
    };
	
	// ----------------------------------
	// Preparar objeto JSON con los datos
	// ----------------------------------
	ficheroJSON.push({ "datos" : datosJSON });
	
	// ---------------------
	// Exportar JSON a disco
	// ---------------------
	var resultadoJSONString = JSON.stringify(ficheroJSON, null, "\t");
	var senda = theApp.clientCachePath() + tablaInfo.id() + "_" + versionParam.replace(".","_") + ".json";
	var fichero = new VTextFile(senda);
	 
	// Se abre el fichero en modo escritura. Crea si no existe o limpia si existe
	if (fichero.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate))
	{
		// Grabar contenido JSON
		fichero.setCodec("UTF-8");
		fichero.write(resultadoJSONString); 

		// Se cierra el fichero
		fichero.close();
		
		// Mensaje de confirmación de exportación correcta
		alert("Se han exportado correctamente " + numRegistros + " registro(s) de la tabla " + tablaInfo.name());
	} else
	{
		// Si no ha sido posible abrir el fichero se muestra error
		alert( "No se pudo abrir el ficher " + fichero.fileName() + ", error " + fichero.error(), "Error" );
	};
	
	// Retornar el JSON
    return(resultadoJSONString);
};

// -------------
// Mapear campos
// -------------
function mapearCampo(campoId, campoTipo, campoTipoObjeto, registro)
{
	// Se lee el valor del campo en función del tipo
	var valor = "";
    switch (campoTipo)
	{
        case VTableInfo.FieldTypeAlpha256:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeAlpha128:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeAlpha64:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeAlpha40:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeAlphaLatin1:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeAlphaUtf16:
            valor = registro.fieldToString(campoId);
            break;
        case VTableInfo.FieldTypeNumeric:
            valor = registro.fieldToDouble(campoId);
            break;
        case VTableInfo.FieldTypeDate:
            valor = registro.fieldToString(campoId).split("/").reverse().join("-");
            break;
        case VTableInfo.FieldTypeTime:
            valor = registro.fieldToTime(campoId);
            break;
        case VTableInfo.FieldTypeDateTime:
            valor = registro.fieldToDateTime(campoId);
            break;
        case VTableInfo.FieldTypeBool:
            valor = registro.fieldToBool(campoId);
            break;
        case VTableInfo.FieldTypeObject:
            switch (campoTipoObjeto) 
			{
				case VTableInfo.ObjectTypeText:
					valor = registro.fieldToString(campoId);
					break;
				case VTableInfo.ObjectTypeRichText:
					valor = registro.fieldToString(campoId);
					break;
				case VTableInfo.ObjectTypeFormula:
					valor = registro.fieldToString(campoId);
					break;
				case VTableInfo.ObjectTypePicture:
					valor = "";
					break;
			};
            break;
        case VTableInfo.FieldTypeVirtualBind:
            valor = registro.fieldToString(campoId);
            break;
        default:
            valor = registro.fieldToString(campoId);
            break;
    };

	// Devolver el valor del campo
    return(valor);
};
