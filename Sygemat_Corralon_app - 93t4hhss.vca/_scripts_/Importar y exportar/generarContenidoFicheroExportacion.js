
//Obtenemos valores
var data             = theRoot.varToString("DATA");
var idPlantilla      = theRoot.varToInt("ID_PLA");
var separador        = theRoot.varToString("SEP");
var idRefTabla       = theRoot.varToInt("ID_REF");
var nombreFichero    = theRoot.varToString("NOM_FIC");
var tieneCabecera    = theRoot.varToBool("TIE_CAB");
var separador        = theRoot.varToString("SEP");
var continuar        = theRoot.varToBool("OK");
var contenidoFichero = "";

//Descomprimimos los datos
var datosB64 = new VByteArray();
datosB64.setText( data );
var datos = datosB64.fromBase64(datosB64).uncompress();
var lista = new VRegisterList( theRoot );
lista.loadFromData(datos);

//Leemos la plantilla
var mapeoCamposExportables     = [];			
var mapeoTiposCampos           = {};
var listaCamposExportables     = new VRegisterList( theRoot );
listaCamposExportables.setTable("sygemat_corralon_dat/DTL_PLA_EXP_D");
listaCamposExportables.load("ID" , [idPlantilla]);
listaCamposExportables.sort("ID");

// Recorremos todos los campos exportables, para obtener sus datos
// si esta configurado con cabecera, agregamos al contenido los datos de la cabecera	
for( var i = 0; i < listaCamposExportables.size(); i++){
	var registro = listaCamposExportables.readAt( i );
	mapeoCamposExportables[ i ] = registro.fieldToString("NAME");				
	mapeoTiposCampos[ registro.fieldToString("NAME") ] = {};
	mapeoTiposCampos[ registro.fieldToString("NAME") ].tipo = registro.fieldToString("TIP");
	mapeoTiposCampos[ registro.fieldToString("NAME") ].ejecutarScript = registro.fieldToBool("MET_RES_SCR");
	mapeoTiposCampos[ registro.fieldToString("NAME") ].script = registro.fieldToString("SCR");	
	if( tieneCabecera ){
		contenidoFichero += "" + registro.fieldToString("NOM_CAB") + separador;
	} 
}		

contenidoFichero += "\n";
separador = separador || ";";

for(var i = 0; i < lista.size(); i++){

	var registroInterno = lista.readAt(i);
	var linea = "";
	
	for(var j = 0; j < mapeoCamposExportables.length ; j++ ){			
		// Si el modo de exportacion es simple
		if( mapeoTiposCampos[ mapeoCamposExportables[j] ].ejecutarScript == false ){
			// Si el tipo del campo es un ObjetoDibujo (110) lo exportamos a disco
			if( mapeoTiposCampos[ mapeoCamposExportables[j] ].tipo == "110" ){
				// Obtenemos la imagen del registro y la generamos en disco
				// en el fichero de exportacion se guarda la ruta donde fue generada
				var imagen = registroInterno.fieldToImage( mapeoCamposExportables[j] );
				try{
					if( imagen.save( senda + "/Imagen_linea_" + (i+1) + ".jpg" ) ){
						linea = "" + linea + (senda + "/Imagen_linea_" + (i+1) + ".jpg");
					}else{
						linea = "" + linea + "la imagen no pudo ser exportada";
					}
				}catch(e){
					linea = "" + linea + "la imagen no pudo ser exportada";
				}
			}else{// Si la exportacion es simple, se agrega el contenido a la linea de exportacion
				linea = "" + linea + registroInterno.fieldToString(mapeoCamposExportables[j]).replace(separador,"\\" + separador) ;
			}
		}else{ // Si el modo de exportacion es ejecutar un script
			theRoot.setVar("VALOR", registroInterno.fieldToString(mapeoCamposExportables[j]).replace(separador,"\\" + separador));
			linea = "" + linea + eval( mapeoTiposCampos[ mapeoCamposExportables[j] ].script );
		}
		//Agregamos el separador o el salto de linea segun sea el caso
		linea +=(j+1 == mapeoCamposExportables.length ? "\n": separador ) ;
	}		
	// Vamos acumulando en una variable el contenido del fichero
	contenidoFichero += linea;
}

var contenidoFicheroBA = new VByteArray();
contenidoFicheroBA.setText( contenidoFichero );
theRoot.setVar("CON_FIC", contenidoFicheroBA.compress().toBase64().toLatin1String() );




