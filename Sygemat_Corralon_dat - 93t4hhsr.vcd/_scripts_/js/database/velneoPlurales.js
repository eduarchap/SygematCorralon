#include "(CurrentProject)/js/database/velneoNumero.js"

/**
 * Devolver la información de todos los plurales de un registro
 *
 * @version 2013-05-28
 * @param {VRegister} registro Registro del que se desean devoler la información
 * @returns {String} Texto con la concatenación de los plurales y los registros
 */
registroDatosPlurales = function( registro ) {

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
	tablaInfo = registro.tableInfo();
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
				pluralesInfo += velneoNumero.formatear( numRegistros ) + " " + pluralTablaInfo.name() + "<br>";
			}		
		}
	}

    // RETORNO: Retornor true si se han podido eliminar todos los plurales
    return pluralesInfo;
};
