#include "(CurrentProject)/js/database/velneoEnums.js"

/**
 * --------------------------------------------------------------------------------
 * Analizador de tablas
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
importClass("VFile");
importClass("VTextFile");

// Se lee la senda donde se guardarán los ficheros de análisis de las tablas
var senda = theRoot.varToString("SND");

// Se ejecuta el análisis de datos de todas las tablas
tablasAnalisis(senda);

/**
 * --------------------------------------------------------------------------------
 * Recorre todas las tablas analizando la ocupación de datos de cada campo
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function tablasAnalisis()
{
	// Leemos todas las tablas cargadas
	var proyecto      = theApp.mainProjectInfo();
	var numTablas     = proyecto.allTableCount();
	for (var numTabla = 0; numTabla < numTablas; numTabla++)
	{
		var tablaInfo = proyecto.allTableInfo(numTabla);
		
		// Se exporta la documentación de la tabla a un fichero en disco
		var ficheroSenda = senda + "/" + tablaInfo.id() + "_ana.csv";
		var fichero      = new VTextFile(ficheroSenda);
		if (fichero.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate))
		{
			fichero.write(tablaAnalisis(tablaInfo));
			fichero.close();
		}
		else
		{
			alert("No se ha podido generar el fichero " + ficheroSenda);
		};
	};

	alert("Se han analizado " + numTablas + " tablas en la carpeta " + senda);
};

/**
 * --------------------------------------------------------------------------------
 * Analiza la ocupación de datos en cada campo de una tabla
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function tablaAnalisis(tablaInfo)
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

	// Se crea un array con los identificadores de los campos que tienen ocupación en disco
	var campos      = [];
	var alfabeticos = [];
	var valores     = [];
	var caracteres  = [];
	numCampos       = tablaInfo.fieldCount();
	for (var numCampo = 0; numCampo < numCampos; numCampo++)
	{
		if (tablaInfo.fieldBufferLen(numCampo) > 0)
		{
			campos.push(tablaInfo.fieldId(numCampo));
			valores.push(0);
			if (enumTipoCampo(tablaInfo.fieldType(numCampo)).substring(0, 4) == "Alfa")
			{
				alfabeticos.push(tablaInfo.fieldId(numCampo));
				caracteres.push(0);
			};
		};
	};
	
	// Repasar la ocupación de los campos en los registros de la tabla
	var lista = new VRegisterList(theRoot);
	lista.setTable(tablaInfo.idRef());
	lista.load("ID", []);
	var numRegistros   = lista.size();
	var numCamposDisco = campos.length; 
	if (numRegistros > 0)
	{
		// Se leen los registros comprobando en los campos de ocupación en disco si no están vacios
		for (var numRegistro = 0; numRegistro < numRegistros; numRegistro++)
		{
			var registro = lista.readAt(numRegistro);
			for (var numCampo = 0; numCampo < numCamposDisco; numCampo++)
			{	
				if (registro.isFieldEmpty(campos[numCampo]) == false)
				{
					valores[numCampo]++;
					
					// Si es alfabético se suman sus caracteres
					var numAlfabetico = alfabeticos.indexOf(campos[numCampo]);
					if (numAlfabetico != -1)
					{
						caracteres[numAlfabetico] += registro.fieldToString(campos[numCampo]).length;
					};
				};
			};
		};
		
		// Añadir cabeceras de los campos 
		tablaCsv += "Nº registros" + separador + numRegistros + salto;
		tablaCsv += salto;
		tablaCsv += "CAMPOS" + salto;
		tablaCsv += "id"               + separador + 
					"name"             + separador + 
					"tipo de campo"    + separador + 
					"tipo de objeto"   + separador + 
					"tipo de enlace"   + separador + 
					"longitud"         + separador + 
					"decimales"        + separador + 
					"signo"            + separador +
					"mínimo"           + separador + 
					"máximo"           + separador + 
					"% ocupación"      + separador + 
					"media caracteres" + salto;
		
		// Documentar los campos
		numCampos = tablaInfo.fieldCount();
		for (var numCampo = 0; numCampo < numCampos; numCampo++)
		{
			// Preparar valores de campos de enum
			tipoCampo  = enumTipoCampo(tablaInfo.fieldType(numCampo));
			tipoObjeto = (tipoCampo != "Objeto") ? "" : enumTipoObjeto(tablaInfo.fieldObjectType(numCampo));
			tipoEnlace = (tipoCampo != "Enlace") ? "" : enumTipoEnlace(tablaInfo.fieldBindType(numCampo));

			// Calcular el % de ocupación
			ocupacion = valores[campos.indexOf(tablaInfo.fieldId(numCampo))];
			if (isNaN(ocupacion) == true) ocupacion = 0;
			porcentajeOcupacion = Math.floor((ocupacion * 100) / numRegistros);

			// Calcular el uso medio de caracteres de campos alfabéticos
			numAlfabetico   = alfabeticos.indexOf(tablaInfo.fieldId(numCampo));
			mediaCaracteres = 0;
			if (numAlfabetico != -1)
			{
				mediaCaracteres = Math.floor(caracteres[numAlfabetico] / ocupacion);
			};
			if (isNaN(mediaCaracteres) == true) mediaCaracteres = 0;
			
			// Añadir los datos al fichero
			tablaCsv  += tablaInfo.fieldId(numCampo)           + separador +
						 tablaInfo.fieldName(numCampo)         + separador + 
						 tipoCampo                             + separador +
						 tipoObjeto                            + separador +
						 tipoEnlace                            + separador +
						 tablaInfo.fieldBufferLen(numCampo)    + separador +
						 tablaInfo.fieldDecimals(numCampo)     + separador +
						 tablaInfo.fieldIsSigned(numCampo)     + separador +
						 tablaInfo.fieldMinimumValue(numCampo) + separador +
						 tablaInfo.fieldMaximumValue(numCampo) + separador + 
						 porcentajeOcupacion                   + separador + 
			             mediaCaracteres                       + salto;
		};
	};	
	
    // Se retorna la documentación de la tabla
    return tablaCsv;
};
