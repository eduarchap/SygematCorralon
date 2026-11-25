// Funciones para escritura de ficheros de texto en función del codec

// Declaramos el uso de las clases necesarias
importClass("VFile");
importClass("VTextFile");

// Declaramos un objeto para agrupar las funciones
var vReportFicheros = {};

////////////////////////////////////////////////////////////
// Función para guardar un fichero segun el codec

vReportFicheros.escribirXml = function escribirXml( strXML, strSendaFichero ) {
	// Se declara el objeto fichero
	var fichero = new VTextFile( strSendaFichero );
	
	// Obtenemos el encoding del xml
	var encoding = vReportFicheros.xmlEncoding( strXML );
	
	// Declaramos el codec en función del XML
	fichero.setCodec( encoding );
	 
	// Se abre el fichero en modo escritura. Crea si no existe o limpia si existe
	if ( fichero.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) )
	{
		// Escribimos en el fichero
		fichero.write( strXML );
		
		// Se cierra el fichero
		fichero.close();
		
		// Retornamos ok
		return true;
	}
	else
		// Si no ha sido posible abrir el fichero se muestra error
		alert( "No se pudo abrir el fichero " + fichero.fileName() + ", error " + fi.error(), "Error" );
		return false;
}

////////////////////////////////////////////////////////////
// Función para leer un fichero segun el codec
 
vReportFicheros.leerXml = function leerXml( strSendaFichero )  {
	// Se declara el objeto fichero
	var fichero = new VTextFile( strSendaFichero );
	
	// Se abre el fichero en modo de sólo lectura
	if ( fichero.open( VFile.OpenModeReadOnly ) )
	{	 	
		// Declaramos la variable para la lectura
		var primeralinea = "";
		
		// Leemos la primera línea para ver el codec
		primeralinea = fichero.readLine();
		
		// Obtenemos el encoding del xml
		var encoding = vReportFicheros.xmlEncoding( primeralinea );	
		 
		// Declaramos el codec en función del XML
		fichero.setCodec( encoding );
		
		// Recorremos de nuevo el fichero línea a línea guardando su contenido
		var txt = "";
		
		// Para volver a leer el fichero línea a línea nos posicionamos al princicipio
		fichero.seek( 0 );
	 
		// Leer todo el fichero
		txt = fichero.readAll();
		 
		// Se cierra el fichero
		fichero.close();
		
		return txt;
	}
	else {
		// Si no ha sido posible abrir el fichero se muestra error
		alert( "No se pudo abrir el fichero " + fichero.fileName() + ", error " + fichero.error(), "Error" );
		return false;
	}
}

////////////////////////////////////////////////////////////
// Función para extraer codec de un xml

vReportFicheros.xmlEncoding = function xmlEncoding( strXML ) {

	// Créditos: http://es.softuses.com/93322
	var match, rx = /\b(encoding)\s*=\s*"([^"]*)"/g;
	match = rx.exec(strXML);
	// match[1] es el término buscado
	// match[2] es el valor
	
	return match[2];


}