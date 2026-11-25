#include "(CurrentProject)/js/database/velneoEnums.js"

/**
 * --------------------------------------------------------------------------------
 * Documentador de tablas
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
importClass("VFile");
importClass("VTextFile");

// Se solicita la senda donde se guardarán los ficheros de documentación de las tablas
var senda = theMainWindow.fileDialogGetExistingDirectory("Directorio donde se generarán los ficheros", "C:/");

// Se ejecuta la generación de la documentación de todas las tablas
tablasToCsv(senda);

/**
 * --------------------------------------------------------------------------------
 * Función que recorre todas las tablas generando la documentación
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function tablasToCsv()
{
	// Leemos todas las tablas cargadas
	var proyecto      = theApp.mainProjectInfo();
	var numTablas     = proyecto.allTableCount();
	for (var numTabla = 0; numTabla < numTablas; numTabla++)
	{
		var tablaInfo = proyecto.allTableInfo(numTabla);
		
		// Se exporta la documentación de la tabla a un fichero en disco
		var ficheroSenda = senda + "/" + tablaInfo.id() + "_doc.csv";
		var fichero      = new VTextFile(ficheroSenda);
		if (fichero.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate))
		{
			fichero.write(tablaToCsv(tablaInfo));
			fichero.close();
		}
		else
		{
			alert("No se ha podido generar el fichero " + ficheroSenda);
		};
	};

	alert("Se ha generado la documentación de " + numTablas + " tablas en la carpeta " + senda);
};

/**
 * --------------------------------------------------------------------------------
 * Devuelve una cadena con formato CSV con los datos de una tabla
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function tablaToCsv(tablaInfo)
{
    // Declaración de las variables
    var tablaCsv  = "";
	var separador = ";";
	var salto     = "\n";

    // Añadir al objeto información de cabecera de la tabla 
	tablaCsv += "id"                + separador + tablaInfo.id()                  + salto;
	tablaCsv += "idRef"             + separador + tablaInfo.idRef()               + salto;
	tablaCsv += "nombre"            + separador + tablaInfo.name()                + salto;
	tablaCsv += "En memoria"        + separador + tablaInfo.isInMemory()          + salto;
	tablaCsv += "longitud registro" + separador + tablaInfo.registerLength()      + salto;
	tablaCsv += "tipo"              + separador + enumTipoTabla(tablaInfo.type()) + salto;
	
    // Añadir cabeceras de los campos 
	tablaCsv += salto;
	tablaCsv += "CAMPOS" + salto;
	tablaCsv += "id"             + separador + 
	            "name"           + separador + 
	            "tipo de campo"  + separador + 
	            "tipo de objeto" + separador + 
	            "tipo de enlace" + separador + 
                "longitud"       + separador + 
                "decimales"      + separador + 
	            "signo"          + separador +
	            "mínimo"         + separador + 
				"máximo"         + salto;
	
    // Documentar los campos
	numCampos = tablaInfo.fieldCount();
	for (var numCampo = 0; numCampo < numCampos; numCampo++)
	{
		tipoCampo  = enumTipoCampo(tablaInfo.fieldType(numCampo));
		tipoObjeto = (tipoCampo != "Objeto") ? "" : enumTipoObjeto(tablaInfo.fieldObjectType(numCampo));
		tipoEnlace = (tipoCampo != "Enlace") ? "" : enumTipoEnlace(tablaInfo.fieldBindType(numCampo));
		tablaCsv += tablaInfo.fieldId(numCampo)           + separador +
					tablaInfo.fieldName(numCampo)         + separador + 
					tipoCampo                             + separador +
					tipoObjeto                            + separador +
					tipoEnlace                            + separador +
					tablaInfo.fieldBufferLen(numCampo)    + separador +
					tablaInfo.fieldDecimals(numCampo)     + separador +
					tablaInfo.fieldIsSigned(numCampo)     + separador +
					tablaInfo.fieldMinimumValue(numCampo) + separador +
					tablaInfo.fieldMaximumValue(numCampo) + salto;
	};
	
    // Añadir cabeceras de los índices 
	tablaCsv += salto;
	tablaCsv += "ÍNDICES" + salto;
	tablaCsv += "id"   + separador + 
	            "name" + separador + 
	            "tipo" + salto;

    // Documentar los índices
	numIndices = tablaInfo.indexCount();
	for (var numIndice = 0; numIndice < numIndices; numIndice++)
	{
		tablaCsv += tablaInfo.indexId(numIndice)                   + separador +
					tablaInfo.indexName(numIndice)                 + separador +
					enumTipoIndice(tablaInfo.indexType(numIndice)) + salto;
	};

    // Añadir cabeceras de los plurales 
	tablaCsv += salto;
	tablaCsv += "PLURALES" + salto;
	tablaCsv += "id"   + separador + 
	            "name" + salto;

    // Documentar los plurales
	numPlurales        = tablaInfo.pluralCount();
	for (var numPlural = 0; numPlural < numPlurales; numPlural++)
	{
		tablaCsv += tablaInfo.pluralId(numPlural)   + separador +
					tablaInfo.pluralName(numPlural) + salto;
	};
	
    // Se retorna la documentación de la tabla
    return tablaCsv;
};
