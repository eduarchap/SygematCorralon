#include "(CurrentProject)/vTools/utils.js"

/**
 * @file Funciones de base de datos
 * @author velneo.es
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
	if (isEdit())
		return;
	
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
        regenerarAreaDatos = confirm(tr("93t4hhss.vca/PRG_REG_DAT"), tr("93t4hhss.vca/CNF"));
        regenerarIndices = confirm(tr("93t4hhss.vca/PRG_REG_IDX"), tr("93t4hhss.vca/CNF"));
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
		theApp.mainProjectInfo
        if (proyectoPrincipal) {
            for (indice; indice < proyectoPrincipal.allTableCount(); indice += 1) {

                // Leer la información de la tabla y el idRef
                tablaInfo = proyectoPrincipal.allTableInfo(indice);
                tabla = tablaInfo.idRef();

                // Sólo se regenera el área de datos de las tablas en disco
                if (regenerarAreaDatos && (tablaInfo.isInMemory() === false)) {
                    if (!theApp.regenDataArea(tabla, true)) {
                        msgError += tr("93t4hhss.vca/ERR_REG_DAT") + " " + tabla + "\n";
                    }
                }

                // Se regeneran los índices de todas las tablas sean en disco o en memoria
                if (regenerarIndices) {
                    if (!theApp.regenIndexes(tabla, true)) {
                        msgError += tr("93t4hhss.vca/ERR_REG_IDX") + " " + tabla + "\n";
                    }
					// Comprobamos si tiene índices complejos y los regneramos también
                }
            }		
			nIndicesComplejos = theApp.mainProjectInfo().allObjectCount(VObjectInfo.TypeComplexIndex);
			for (k=0; k<nIndicesComplejos; k++) {
				subObjInfo = theApp.mainProjectInfo().allObjectInfo(VObjectInfo.TypeComplexIndex, k);
				theApp.regenComplexIndex(subObjInfo.idRef(), true);
			}
        }
    }

    // RETORNO: Mensaje final del resultado de las regeneraciones y retorno
    if ( msgError.toString().length === 0 ) {
        alert( tr("93t4hhss.vca/REG_OK"), tr("93t4hhss.vca/NTF") );
        retorno = true;
    } else {
        alert( tr("93t4hhss.vca/REG_ERR") + ": \n" + msgError, tr("93t4hhss.vca/ATT") );
        retorno = false;
    }
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
	var szCampoIdNombreMaestro;
	var szValor;
	var nValorId;
	for( var nIndice = 0; nIndice < nNumListas; nIndice++ ) {			
		// Se lee el primer registro de la lista para atrapar el valor del campo
		var registro = listas[ nIndice ].readAt( 0 );
		
		// En función del tipo de enlace y de tipo de campo se devuelve un valor u otro
		if ( szTipoEnlaceCampo == VTableInfo.BindTypeMaster ) {
			bOrdenar = 1;
			// Comprobamos que la tabla enlazada tenga campo NAME
			var linkedTable = tabla.fieldBoundedTableInfo(nNumCampo);
			if (linkedTable.findField("NAME")!=-1)
				szCampoIdNombreMaestro = szCampoId + ".NAME"
			else
				szCampoIdNombreMaestro = szCampoId;
			szValor = registro.fieldToString( szCampoIdNombreMaestro );
			nValorId = registro.fieldToString(szCampoId);
			// Añadir el valor al array con su correspondiente valor numérico único
			aValoresCampo[ nIndice ] = szValor + "|" + nValorId;
		} else if (szTipoEnlaceCampo == VTableInfo.BindTypeStatic) {
			bOrdenar = 1;
			szCampoIdNombreMaestro = szCampoId + ".NAME";
			szValor = registro.fieldToString( szCampoIdNombreMaestro );
			nValorId = registro.fieldToString(szCampoId);
			// Añadir el valor al array con su correspondiente valor numérico único
			aValoresCampo[ nIndice ] = szValor + "|" + nValorId;
		} else {			
			if ( szTipoCampo == VTableInfo.FieldTypeNumeric ) 
				var szValor = velneoNumero.formatear( registro.fieldToString( szCampoId ) );
			else 
				var szValor = registro.fieldToString( szCampoId );
			// Añadir el valor al array
			aValoresCampo[ nIndice ] = szValor + "|" + nIndice;
		}
		
	}
	
	// Se ordena la lista de retorno si el tipo de campo es maestro y se devuelve el nombre
	if ( bOrdenar == 1 )
		aValoresCampo.sort();
	
	// Se retorna el array de valores del campo	
	return aValoresCampo
};

