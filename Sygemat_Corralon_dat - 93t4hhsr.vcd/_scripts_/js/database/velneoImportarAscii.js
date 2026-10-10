/**
 * Importación de registros en una tabla a partir los datos contenidos en un fichero ASCII
 *
 * @description Se lee un fichero en disco, con formato ASCII, que en la primera línea contiene
 *                      los identificadores de los campos a importar para cada uno de los valores.
 *                      Este código debe incluirse en un fichero en el que se deben crear las siguientes variables.
 * @version 2013-03-04
 * @param {String} SENDA Senda de la tabla en disco con formato ASCII de la que se importarán los datos
 * @param {String} TABLA Identificador completo de la tabla a importar (Alias/Identificador)
 * @param {String} SEPARADOR Caracter que se utilizará como separador de campo, por defecto tabulador
 */
////////////////////////////////////////////////////////////////////////
// Importar de ficheros ASCII
//
importClass("VTextFile");
importClass("VFile");

// Se prepara la tabla a importar y la transacción
var registro = new VRegister( theRoot );
			
if ( registro.setTable( theRoot.varToString( "TABLA" ) ) )
{
	// Se prepara el valor del separador de campos
	var separador = ( theRoot.varToString( "SEPARADOR" ).length > 0 ) ? theRoot.varToString( "SEPARADOR" ) : "\t";
	
	// Se abre transacción si no existe
	bTransCurso = theRoot.existTrans();
	if ( bTransCurso == false )
	{
		bTransNueva = theRoot.beginTrans( "Importando de " + theRoot.varToString( "SENDA" ) );
	}
	
	if ( bTransCurso || bTransNueva )
	{
		// Se abre el fichero en modo de sólo lectura
		var fichero = new VTextFile( theRoot.varToString( "SENDA" ) );
		
		if ( fichero.open( VFile.OpenModeReadOnly ) )
		{	
			// Se leen los nombres de los campos en la primera línea y se guardan en un array
			var linea = fichero.readLine();
			var aCampos = linea.split( separador );
						
			// Recorremos el fichero línea a línea guardando su contenido
			var aValores = new Array();
			var nNumRegistro = 0;
			theRoot.initProgressBar();
			theRoot.setProgress( 100 );

			while ( fichero.atEnd() == false )
			{
				// Leer la línea y los valores de los campos
				linea = fichero.readLine();
				aValores = linea.split( separador );
				for ( var nCampo = 0; nCampo < aValores.length; nCampo++ )
				{
					registro.setField( aCampos[ nCampo ], aValores[ nCampo ] );
				}
				registro.addRegister();
				
				// Mostrar el avance	
				theRoot.setTitle( "Importando registro nº " + nNumRegistro++ );
			}

			// Se cierra el fichero
			fichero.close();
			theRoot.endProgressBar();
		}

		// Se cierra la transacción si se creó una nueva
		if ( bTransNueva )
		{
			theRoot.commitTrans();
		}
	}
}