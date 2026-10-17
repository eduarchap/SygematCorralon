////////////////////////////////////////////////////////////
// Exportar datos a XML
//
var velneoExportar = {};

// Importamos las clases
importClass( "VXmlWriter" );

////////////////////////////////////////////////////////////
// Exportar datos a XML
//
// Parámetros:
//     - root: Objeto de vista de datos con la lista de registros a exportar
//
velneoExportar.toXml = function ( root )
{
	// Se lee la tabla de la rejilla
	var tabla = root.content().tableInfo();
	 
	// Se crea el objeto XML con la lista de registros de entrada
	var xml = new VXmlWriter( root.content() );
	xml.setDocType( "vXML" );
	xml.addInitialTag( tabla.name() );
	xml.setRowTag( "row" );

	// Se añaden los campos de la tabla	
	for ( nIndice=0; nIndice < table.fieldCount(); nIndice++ )
	{
		xml.addField( tabla.fieldName( nIndice ), table.fieldId( nIndice ) );
	}

	// Grabar el fichero en disco
	var szSendaFichero = theApp.rootPath() + tabla.id() + ".xml";
	xml.writeFile( szSendaFichero );

	// Mensaje de finalización correcta
	alert( "Se ha generado satisfactoriamente el fichero " + szSendaFichero );
}