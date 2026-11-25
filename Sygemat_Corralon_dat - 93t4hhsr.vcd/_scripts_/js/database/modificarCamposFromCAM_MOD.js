// Modificar campos a partir de los valores de un json

var json = JSON.parse( theRoot.varToString( "REG_JSN" ) );
var camposModificar = theRoot.varToString( "CAM_MOD" ).split( "\n" );

for ( numeroCampo in camposModificar )
{
	var campoModificar = camposModificar[ numeroCampo ].split( ":" );
	var idCampoDestino = campoModificar[ 0 ];
	var idCampoOrigen = campoModificar[ 1 ];
	var valor = json[ idCampoOrigen ];
	theRegisterIn.setField( idCampoDestino, valor );
}