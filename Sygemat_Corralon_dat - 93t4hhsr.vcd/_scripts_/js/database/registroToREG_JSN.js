#include "(CurrentProject)/js/api_rest_v1/api_rest_funciones_v1.js"
#include "(CurrentProject)/js/database/camposDiscoTabla.js"

// ------------------------------------------------------------------------------
// registroToJson - Devuelve un objeto JSON de un registro en la variable REG_JSN
// ------------------------------------------------------------------------------

// Preparamos las variables de trabajo
var tablaInfo    = theRegisterIn.tableInfo();
var tablaIdRef   = tablaInfo.idRef();
var campos       = camposDiscoTabla( tablaIdRef );
var registroJson = {};

// Se recorren todos los campos a retornar procesando sus valores
for ( var numCampo = 0; numCampo < campos.length; numCampo++ )
{
	var campoId             = campos[ numCampo ];
	var campoNumero         = theRegisterIn.tableInfo().findField( campoId );
	var campoTipo           = theRegisterIn.tableInfo().fieldType( campoNumero );
	registroJson[ campoId ] = valorCampoJSON( theRegisterIn, campoId, campoTipo );
}
		
// Retornamos el objeto generado en la variable local JSON
theRoot.setVar( "REG_JSN", JSON.stringify( registroJson ) );
