#include "(CurrentProject)/Importar y exportar/utils.js"

importClass("VDir");
importClass("VTextFile");
importClass("VFile");
importClass("VProcess");

var tiempos = [];

// Obtenemos la rejilla activa
var rejilla = getActiveListControl();

if (rejilla != null) {
	// Obtenemos rl objectInfo de la rejilla
	var rejillaInfo = rejilla.objectInfo();
	// Solo se exporta si es una rejilla
	if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
		
		var contenidoFichero = "";
		// Solicitamos el directorio donde se guardara el fichero
		var senda = theMainWindow.fileDialogGetExistingDirectory("","", VMainWindow.ShowDirsOnly );	
		//Obtenemos el alias del proyecto y el nombre de la tabla
		var idRefTabla = rejillaInfo.inputTable().idRef();
		
		// Obtenemos los demas datos asociado a la plantilla de exportacion elegida
		var idPlantilla = theRoot.varToInt("ID_PLA");
		var nombreFichero = theRoot.varToString("NOM_FIC");
		var tieneCabecera = theRoot.varToBool("TIE_CAB");
		var separador     = theRoot.varToString("SEP");
		var continuar     = theRoot.varToBool("OK");	
		
		// Si el usuario eligio una plantilla y acepto, continuamos
		if( continuar ){
			// Preparamos las variables para el mapeo de los campos a exportar
			// sus tipos, y su configuracion de exportacion
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
			
			// Si hay una senda elegida, procedemos a exportar
			if ( senda != "") {
				try {
					// Modificamos el cursor para ejemplificar que esta trabajando
					theApp.setOverrideCursor(VApp.WaitCursor);
					separador = separador || ";";
					
					// Preparamos un VRegisterList con la lista de registros a exportar
					var lista = new VRegisterList( theRoot );
					rejilla.getList(lista);	
					
					//Recorremos 1 a 1 cada registro para exportar su informacion
					// en base a la configuracion de la plantilla
					
					theRoot.initProgressBar();
					theRoot.setTitle("Exportando " + lista.size() + " registros");
					var total = lista.size();
					for(var i = 0; i < lista.size(); i++){

						var registroInterno = lista.readAt(i);
						var linea = "";
						
						for(var j = 0; j < mapeoCamposExportables.length ; j++ ){	
							theRoot.setProgress( i * 100 / total );
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
				} finally { // Regresamos el cursos a su estado original
					theApp.restoreOverrideCursor();
					theRoot.endProgressBar();
				}
				
				// Si se genero contenido, creamos el fichero en disco
				if (contenidoFichero){
					var fichero = new VTextFile( senda + "/" + nombreFichero );
					fichero.setCodec("UTF-8");
					if ( fichero.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ){						
						fichero.write( contenidoFichero );
						fichero.close();
					}
					alert("Exportación terminada satisfactoriamente \n\n" + senda + "/" + nombreFichero);
				}				
				else{
					alert("Se ha producido algún error durante la exportación");
				}
				tiempos[5] = new Date();
				
			}
		}// fin del IF de continuar		
	} else{
		alert("Esta funcionalidad es válida sólo para rejillas.");
	}		
} else{
	alert("Esta funcionalidad es válida sólo para rejillas.");
}
