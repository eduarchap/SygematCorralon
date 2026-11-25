/**
 * Devuelve la información de todos los plurales de un registro en una variable local
 * @version 2015-04-17
 */

// VARIABLES: Declaración de las variables
var listaPlurales,
	indice = 0,
	numPlurales,
	numRegistros,
	pluralTablaId,
	pluralNombre,
	pluralNumero = 0,
	pluralTablaInfo,
	pluralTablasId = [],
	pluralesInfo = "",
	tablaInfo;

// Se analiza la tabla para recorrer sus plurales
tablaInfo = theRegisterIn.tableInfo();
numPlurales = tablaInfo.pluralCount();

// Se recorren los plurales de la tabla concatenando los datos de los plurales
for ( indice; indice < numPlurales; indice += 1 ) {

	// Para evitar duplicar una tabla, sólo se procesa la tabla si no está incluída en el array de tablas
	pluralTablaInfo = tablaInfo.pluralBoundedTableInfo( indice );
	pluralTablaId = pluralTablaInfo.id();
	if ( pluralTablasId.indexOf( pluralTablaId ) == -1 ) {

		// Si hay registros, se añade al texto de plurales y se guarda en el array para no incluir de nueo la misma tabla
		pluralId = tablaInfo.pluralId( indice );
		listaPlurales = theRegisterIn.loadPlurals( pluralId );
		numRegistros = listaPlurales.size();
		if ( numRegistros ) {
			pluralTablasId.push( pluralTablaId );
			pluralesInfo += "" + pluralTablaInfo.name() + " (" + numRegistros + ")" + "\n";				
		};		
	};
};

// --------------------------------------------------------------------------------------
// Retornamos la información de los plurales en una variable local del proceso
// --------------------------------------------------------------------------------------
theRoot.setVar("INF_PLU", pluralesInfo);
