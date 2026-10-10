importClass("VImage");

// ----------------------------------------
// modeloToArray - Convierte un modelo en un array
// ----------------------------------------
function modeloToArray( modelo ) {
    let array = []; 
    let con = 0;   	
    for( let i = 0; i < modelo.count ; i++ ){
        let elemento = modelo.get(i);        
        if( (elemento.visible === true) && (elemento.seleccionado === true) ){
            array[con] = elemento;            
            con = con + 1
        }
    }
	console.log("Fueron " + con);
    return array;
} // modeloToArrayGenerico


// ----------------------------------------
// arrayToModelo - Añadir array a un modelo
// ----------------------------------------
function arrayToModelo(array, modelo) {
    modelo.clear();
	for (let elemento of array) {
        if( typeof elemento !== "undefined"){
            modelo.append(elemento);
        }        
    }	
} // arrayToModelo

// ----------------------------------------
// arrayToModeloVisible - Añadir array a un modelo
// ----------------------------------------
function arrayToModeloVisible(array, modelo, menuVisible, menuTest, gruposUsuariosDelUsuario) {
    //Dejamos visible solo las opciones que coincidan con menuVisible
	for(var i = 0; i < array.length; i++){
		var elemento = array[i];
		if( elemento.esTest != menuTest ){
			elemento.visible = false;
		}else{
			if( elemento.codigo.substring(0,3) == menuVisible ){
				if( elemento.longitud <= 6 ){
					elemento.visible = true;
				}else{
					if( obtenerDesplegado(array, elemento.codigo.substring(0, elemento.longitud - 3 ) ) == true ){
						elemento.visible = true;
					}else{
						elemento.visible = false;
					}	
					//Aqui definimos si mostramos flechita o no
					if( elemento.codigo.substring(0, elemento.longitud - 3 ) == array[i-1].codigo ){
						array[i-1].agrupador = true						
					}else{
						array[i-1].agrupador = false
					}				
				}
			}else{
				elemento.visible = false;
			}
		}
		//Si queda visible, verificamos el permiso
		if( elemento.visible == true ){
			//Si esta activo el check de visible para todos
			//Entonces quitamos los que esten seleccionados
			var gruposSeleccionados = elemento.gruposAutorizados.split(",");
			if( elemento.todosGrupos == true ){							
				for(var k = 0; ((k < gruposSeleccionados.length) && (elemento.visible == true)); k++){
					if( typeof gruposUsuariosDelUsuario.find( (element) => element == gruposSeleccionados[k] ) != "undefined" ){
						elemento.visible = false;
					}					
				}
			}else{//En caso contrario, entonces dejamos visible solo si esta entre los seleccionados
				var encontro = false;
				for(var k = 0; ((k < gruposSeleccionados.length) && ( encontro == false)); k++){
					if( typeof gruposUsuariosDelUsuario.find( (element) => element == gruposSeleccionados[k] ) != "undefined" ){
						encontro = true;
					}					
				}
				if(encontro == false){
					elemento.visible = false;
				}				
			}
		}
	}
	
	modelo.clear();
	for (let elemento of array) {
        if( typeof elemento !== "undefined"){
            if( elemento.visible === true ){
				modelo.append(elemento);
			}
        }        
    }	
} // arrayToModelo


// ----------------------------------------
// actualizarDesplegado en base al codigo
// ----------------------------------------
function actualizarDesplegado(array, codigo) {
	for(var i = 0; i < array.length; i++){
		if( array[i].codigo == codigo ){			
			array[i].desplegado = !array[i].desplegado
			if( array[i].desplegado == false ){
				//Buscamos cualquier submenu para contraerlo
				var codigoBase = array[i].codigo;
				for(var j = 0; j < array.length; j++){
					if( array[j].codigo.substring(0, codigoBase.length ) == codigoBase ){
						array[j].desplegado = false;
					}
				}				
			}
		}
	}
	return array;
}

// ----------------------------------------
// actualizarDesplegado en base al codigo
// ----------------------------------------
function obtenerDesplegado(array, codigo) {
	for(var i = 0; i < array.length; i++){
		if( array[i].codigo == codigo ){			
			return array[i].desplegado;
		}
	}
	return false;
}

// ----------------------------------------
// obtenerGruposDelUsuario
// ----------------------------------------
function obtenerGruposDelUsuario() {
	var grupos = [];
	
	var lista = new VRegisterList(theRoot);
	lista.setTable("sygemat_corralon_dat/USR_GRP_USR_M");
	lista.load("USR_USR_GRP", [ theApp.globalVarToString("sygemat_corralon_dat/CUR_USR_ID") ]);
	for ( var i = 0; i < lista.size(); i++ )
	{
		grupos.push( lista.readAt(i).fieldToString("USR_GRP") );
	}
	return grupos;
}


// ----------------------------------------
// obtenerDibujo - Funcion que devuelve un vImage
// del registro enviado de la tabla PRS_MEM_W
// ----------------------------------------
function obtenerDibujo( codigoRegistro, imagenSeleccionado ) {
	
	var registro = new VRegister( theRoot );
	registro.setTable("sygemat_corralon_dat/PRS_MEN_W");
	registro.readRegister( "ID",[ codigoRegistro ], VRegister.searchThis);
	if( imagenSeleccionado == true ){
		if( registro.isFieldEmpty("ICO_SEL") ){
			return "null"
		}else{
			return imagenToBase64(registro.fieldToImage("ICO_SEL"));			
		}
	}else{
		if( registro.isFieldEmpty("ICO") ){
			return "null"
		}else{
			return imagenToBase64(registro.fieldToImage("ICO"));
		}		
	}	
}

/**
 * ----------------------------------------------------------------------------------------------------
 * obtenerImagenEmpresa [Obtiene el base64 de la imagen de la empresa en curso]
 * 
 * @return {String} cadena que representa la imagen en base64
 * ----------------------------------------------------------------------------------------------------
 **/
function obtenerImagenEmpresa(){
	
	var registro = new VRegister( theRoot );
	registro.setTable("sygemat_corralon_dat/ENT_M");
	registro.readRegister( "ID",[ theApp.globalVarToString("sygemat_corralon_dat/EMP_ID_ENT") ], VRegister.searchThis);
	return imagenToBase64(registro.fieldToImage("IMG"));			
}

/**
 * ----------------------------------------------------------------------------------------------------
 * imagenToBase64 [Devuelve una cadena con el valor de una imagen en base64]
 * 
 * @param {[VImage]} imagen [Requerido objeto de la clase VImage]
 * @return {String} cadena que representa la imagen en base64
 * ----------------------------------------------------------------------------------------------------
 **/
function imagenToBase64(imagen) {

    var byteArray = new VByteArray();
    byteArray = imagen.saveToData("PNG", 0);
    var imagenBase64 = byteArray.toBase64().toLatin1String();
    return imagenBase64;
}


/**
 * ----------------------------------------------------------------------------------------------------
 * imagenFromBase64 [Devuelve una imagen a partir de una cadena en base64]
 * 
 * @param {[imagenBase64]} cadena que contiene una imagen en formato base 64
 * @return {VImage} objeto de la clase VImage
 * ----------------------------------------------------------------------------------------------------
 **/
function imagenFromBase64(imagenBase64) { // Convertimos el buffer en base64 en un byteArray
    var ba = new VByteArray();
    var ba64 = new VByteArray();
    ba.setText(imagenBase64);
    ba64.fromBase64(ba);

    // Intentamos obtener la imagen en 4 formatos diferentes soportados
    var imagen = new VImage();
    imagenOk = imagen.loadFromData(ba64, "PNG");
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "JPG");
    }
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "JPEG");
    }
    if (imagenOk == false) {
        imagenOk = imagen.loadFromData(ba64, "BMP");
    }

    // Retornamos la imagen obtenida
    return imagen;
}



















