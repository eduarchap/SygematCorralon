////////////////////////////////////////////////////////////
// Declaración del objeto para la declaración de los métodos
//
var velneoNumero = {};

////////////////////////////////////////////////////////////
// Formatear un número
// Parámetros:
//     - num = Número a formatear (admite decimales)
//     - prefix = Texto de prefijo a aplicar
//     - postfix = Texto de sufijo a aplicar
//
velneoNumero.formatear = function ( num, prefix, postfix )
{
	prefix = prefix || '';
	postfix = postfix || '';
	num += '';
	var splitStr = num.split( '.' );
	var splitLeft = splitStr[0];
	var splitRight = splitStr.length > 1 ? ',' + splitStr[1] : '';
	var regx = /(\d+)(\d{3})/;
	while ( regx.test( splitLeft ) ) 
	{
		splitLeft = splitLeft.replace( regx, '$1' + '.' + '$2' );
	}
	return prefix + splitLeft + splitRight + postfix;
}

////////////////////////////////////////////////////////////
// Quitar el formato a un número
// Parámetros:
//     - num = Número a quitar el formateo
//
velneoNumero.quitarFormato = function ( num )
{
	return num.toString().replace( /([^0-9\,\-])/g,'' )*1;
}