// Auxiliares.js
// Funciones auxiliares para GPS

function metodoNombre( metodo )
{
	if ( metodo === PositionSource.SatellitePositioningMethods )
		return "Satélites";
	else if ( metodo === PositionSource.NoPositioningMethods )
		return "No disponible (Usando fichero)";
	else if ( metodo === PositionSource.NonSatellitePositioningMethods )
		return "Sin satélite (Wifi, 3G, etc.)";
	else if ( metodo === PositionSource.AllPositioningMethods )
		return "Todos los modos";
	return "source error";
}

function printCoordenadas( dGrados, bLatitud )
{
	var grados = Math.abs(parseInt( dGrados ));
	var minutos = (Math.abs( dGrados ) - grados) * 60;
	var segundos = minutos;
	var minutos = Math.abs( parseInt( minutos ) );
	var segundos = ( segundos - minutos ) * 60;
	var signo = ( dGrados < 0) ? -1 : 1;
	var direccion = bLatitud ? ( ( signo > 0) ? 'N' : 'S' ) : ( ( signo > 0 ) ? 'E' : 'W' );

	if( isNaN( direccion ) )
		grados = grados * signo;

	return qsTr( "%1º %2' %3\u0022 %4" ).arg( grados ).arg( minutos ).arg( segundos ).arg( direccion );
}