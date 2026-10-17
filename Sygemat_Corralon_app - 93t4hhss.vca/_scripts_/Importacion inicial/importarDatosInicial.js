importClass("VProcess");

var datos = JSON.parse( theRoot.varToString("DATA") );

var columnas = datos.table.cols;
var filas = datos.table.rows;


//Iniciamos las posiciones

var POS_referenciaArticulo  = 0;
var POS_nombreArticulo      = 1;
var POS_nombreCategoria_1   = 3;
var POS_nombreCategoria_2   = 4;
var POS_nombreCategoria_3   = 5;
var POS_nombreMarca         = 6;
var POS_nombreLinea         = 7;
var POS_skuFabrica          = 8;
var POS_codigoBarras        = 9;
var POS_calidad             = 10;
var POS_proveedor           = 11;
var POS_idProveedor         = 12;
var POS_refProveedor        = 13;
var POS_demoraDias          = 14;
var POS_discontinuado       = 15;
var POS_reposicionSus       = 16;
var POS_undMedidaCosto      = 17;
var POS_undMedidaInventario = 18;
var POS_undMedidaDespacho   = 19;
var POS_coeficiente         = 20;
var POS_facConUndMedCosInv  = 21; //Factor conversion entre unidad medida cambio masivo VS inventario
var POS_costoBase           = 22;
var POS_costoUSD            = 23;
var POS_moneda              = 24;
var POS_inicioBoni          = 25;
var POS_finBoni             = 34;
var POS_costoFlete          = 35;
var POS_fpgProveedor        = 36;
var POS_dtoFpg              = 37;
var POS_inicioLstPrecios    = 38;
var POS_finLstPrecios       = 49;
var POS_alto                = 50;
var POS_ancho               = 51;
var POS_largo               = 52;
var POS_peso                = 53;
var POS_clasificador1       = 54;
var POS_clasificador2       = 55;
var POS_clasificador3       = 56;
var POS_clasificador4       = 57;
var POS_condicionStock      = 58;
var POS_asignarSiempre      = 59;
var POS_inicioStock         = 60;
var POS_finStock            = 71;



var costoConIva             = theRoot.varToBool("COS_TIE_IVA");
var precioConIva            = theRoot.varToBool("PRE_TIE_IVA");

var bloqueTranscacion       = 500;

var contadorRegistroOK      = 0;
var contadorRegistroKO      = 0;
var detallesError           = "";

var nuevaTrans = false;
var hayTrans = theRoot.existTrans();
if ( hayTrans == false ) 
{
  var nuevaTrans = theRoot.beginTrans( "Importando datos bloque 0" );
};


if ( hayTrans || nuevaTrans )
{
	for( var i = 0; i < filas.length; i++ ){
		//Ciclo de cada fila o registro
		var registoJson              = filas[i].c;
		var codigoProveedor          = 0;
		var codigoMarca              = 0;
		var codigoFamilia            = "";
		var codigoLinea              = 0;
		var codigoUndMedInv          = 0;
		var codigoUndMedCos          = 0;
		var codigoArticulo           = 0;
		var codigoArticuloProveedor  = 0;
		var codigoFormaPago          = 0;
		var discontinuado            = "";
		var repSuspendida            = "";
		var cotizacion               = 0;
		

		// Trabajamos con el proveedor
		// Trabajamos con el proveedor
try {
  if (registoJson[POS_proveedor] != null && registoJson[POS_idProveedor] != null) {
    codigoProveedor = verificarProveedor(
      registoJson[POS_proveedor].v,
      registoJson[POS_idProveedor].v
    );
  } else {
    throw new Error("Proveedor o ID nulo");
  }
} catch (error) {
  var nombreProveedor = "";
  var idProveedor = 0;

  if (registoJson[POS_proveedor] != null) {
    nombreProveedor = registoJson[POS_proveedor].v || "";
  }

  if (registoJson[POS_idProveedor] != null) {
    idProveedor = registoJson[POS_idProveedor].v || 0;
  }

  if (nombreProveedor.trim() !== "") {
    // Si hay nombre, lo usamos con código 0
    codigoProveedor = verificarProveedor(nombreProveedor, 0);
  } else {
    // Si no hay nombre, usamos "Sin proveedor"
    codigoProveedor = verificarProveedor("Sin proveedor", 0);
  }
}



		
		//Trabajamos con la marca
		try {
			codigoMarca = verificarMarca( registoJson[ POS_nombreMarca ].v );
		} catch (error) {			
			codigoMarca = verificarMarca( "Sin marca" );
		}
		
		//Trabajamos con la familia
		var nombreFamilia       = "";
		var nombreSubFamilia    = "";
		var nombreSubSubFamilia = "";
		
		try {
			nombreFamilia = registoJson[ POS_nombreCategoria_1 ].v;
		} catch (error) {
			nombreFamilia = "Sin familia";
		}
		try {
			nombreSubFamilia = registoJson[ POS_nombreCategoria_2 ].v;
		} catch (error) {
			nombreSubFamilia = "Sin subFamilia";
		}
		try {
			nombreSubSubFamilia = registoJson[ POS_nombreCategoria_3 ].v;
		} catch (error) {
			nombreSubSubFamilia = "Sin subSubFamilia";
		}
		codigoFamilia = theRoot.calcFormulaVelneo("fun:VRF_FAM_OPT@Sygemat_Corralon_app.app(\""+nombreFamilia+"\",\""+nombreSubFamilia+"\",\""+nombreSubSubFamilia+"\")");
		 
		//Trabajamos con la linea
		try {
			codigoLinea = verificarLinea( registoJson[ POS_nombreLinea ].v );
		} catch (error) {			
			codigoLinea = verificarLinea( "Sin linea" );
		}
		//Trabajamos con la unidad de medida de inventario
		try {
			codigoUndMedInv = verificarUnidadMedida( registoJson[ POS_undMedidaInventario ].v );
		} catch (error) {			
			codigoUndMedInv = 1;
		}
		//Trabajamos con la unidad de medida de cambio de costo
		try {
			codigoUndMedCos = verificarUnidadMedida( registoJson[ POS_undMedidaCosto ].v );
		} catch (error) {			
			codigoUndMedCos = 1;
		}
		//Trabajamos con la unidad de medida de despacho
		try {
			codigoUndMedDes = verificarUnidadMedida( registoJson[ POS_undMedidaDespacho ].v );
		} catch (error) {			
			codigoUndMedDes = 1;
		}
		
		//Damos el alta del articulo
		var registroArticulo = new VRegister( theRoot );
		registroArticulo.setTable("sygemat_corralon_dat/ART_M");
		registroArticulo.setField("EMP","1");
		registroArticulo.setField("EMP_DIV","11");
		registroArticulo.setField("REG_IVA_COM","G");
		registroArticulo.setField("REG_IVA_VTA","G");
		registroArticulo.setField("PRV", codigoProveedor );
		registroArticulo.setField("MAR_M", codigoMarca );
		registroArticulo.setField("FAM", codigoFamilia );
		registroArticulo.setField("LIN_M", codigoLinea );
		registroArticulo.setField("UND_MED_INV", codigoUndMedInv );
		registroArticulo.setField("UND_MED_CBO_COS", codigoUndMedCos );
		registroArticulo.setField("UND_MED_DES", codigoUndMedDes );
		registroArticulo.setField("ES_OUT", 0 );
		
		
		try {	
			registroArticulo.setField("NAME", registoJson[ POS_nombreArticulo ].v.toString() );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("REF", registoJson[ POS_referenciaArticulo ].v.toString() );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("SKU_FAB", registoJson[ POS_skuFabrica ].v.toString() );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("COD_BAR", registoJson[ POS_codigoBarras ].v.toString() );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("CAL", registoJson[ POS_calidad ].v.toString() );
		}catch (error) {			
			registroArticulo.setField("CAL", "1" );
		}
		try {
			registroArticulo.setField("ALT_CM", registoJson[ POS_alto ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("ANC_CM", registoJson[ POS_ancho ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("LAR_CM", registoJson[ POS_largo ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("PESO", registoJson[ POS_peso ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("UTI_CLA_1", registoJson[ POS_clasificador1 ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("UTI_CLA_2", registoJson[ POS_clasificador2 ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("UTI_CLA_3", registoJson[ POS_clasificador3 ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("UTI_CLA_4", registoJson[ POS_clasificador4 ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			var condicionStock = registoJson[ POS_condicionStock ].v;
			if(condicionStock == "Con stock"){
				registroArticulo.setField("CON_STK", "3");
				}
			else{
				registroArticulo.setField("CON_STK", "2");
			}
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("ASG_SIE", registoJson[ POS_asignarSiempre ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("FAC_CNV_UND_CBO_MAS_VS_INV", registoJson[ POS_facConUndMedCosInv ].v );
		}catch (error) { /*no hacemos nada */ "" }
		try {
			registroArticulo.setField("COE", registoJson[ POS_coeficiente ].v );
		}catch (error) { 
			registroArticulo.setField("COE", 1 );
		}
		
		if( registroArticulo.addRegister() ){
			contadorRegistroOK += 1;
			codigoArticulo = registroArticulo.fieldToInt("ID");
		
			//Trabajamos con la forma de pago del proveedor
			var nombreFormaPago    = "";
			var porcentajeDescuento = 0;
			try {
				nombreFormaPago = registoJson[POS_fpgProveedor].v.trim().replace(/\s+/g, " ");
				alert("nombre forma de pago 1 : " + nombreFormaPago);
			} catch (error) {
				nombreFormaPago = "Sin forma de pago";
			}
			try {
				porcentajeDescuento = registoJson[ POS_dtoFpg ].v;
			} catch (error) {
				porcentajeDescuento = 0;
			}
			codigoFormaPago = verificarFormaPagoProveedor( codigoProveedor, nombreFormaPago, porcentajeDescuento );
			
			
			//Damos de alta el articulo-proveedor
			//Damos el alta del articulo
			var registroArticuloProveedor = new VRegister( theRoot );
			registroArticuloProveedor.setTable("sygemat_corralon_dat/ART_PRV_G");
			registroArticuloProveedor.setField("ART", codigoArticulo );
			registroArticuloProveedor.setField("PRV", codigoProveedor );
			registroArticuloProveedor.setField("FPG_PRV_M", codigoFormaPago );
			
			try {
				registroArticuloProveedor.setField("REF_PRV", registoJson[ POS_refProveedor ].v.toString());
			}catch (error) { /*no hacemos nada */ "" }
			try {
				registroArticuloProveedor.setField("DEM_DIA", registoJson[ POS_demoraDias ].v );
			}catch (error) { /*no hacemos nada */ "" }
			try {
				discontinuado = registoJson[ POS_discontinuado ].v;			
			}catch (error) { /*no hacemos nada */ "" }
			registroArticuloProveedor.setField("DIS", (discontinuado == "Si" ? 1 : 0) );
			try {
				repSuspendida = registoJson[ POS_reposicionSus ].v;			
			}catch (error) { /*no hacemos nada */ "" }
			registroArticuloProveedor.setField("REP_SUS", (repSuspendida == "Si" ? 1 : 0) );
			try {
				registroArticuloProveedor.setField("COS", (costoConIva == true ? registoJson[ POS_costoBase ].v / 1.21 : registoJson[ POS_costoBase ].v) );
			}catch (error) { /*no hacemos nada */ "" }
			try {
				registroArticuloProveedor.setField("COS_MON_EXT", registoJson[ POS_costoUSD ].v );
				registroArticuloProveedor.setField("APL_COS_MON_EXT", 1 );			
			}catch (error) { /*no hacemos nada */ "" }
			try {
				registroArticuloProveedor.setField("COS_FLT", registoJson[ POS_costoFlete ].v );
				if( registoJson[ POS_costoFlete ].v > 0){ 
					registroArticuloProveedor.setField("COS_FLE_MAN", 1 );
				}
			}catch (error) { /*no hacemos nada */ "" }
			try {
				if( (registroArticuloProveedor.fieldToDouble("APL_COS_MON_EXT") == 1)){
					var valorMoneda = registoJson[POS_moneda].v.split(" - ")[0];
					
					registroArticuloProveedor.setField("MON", valorMoneda );
					cotizacion = verificarCotizacion( valorMoneda );
					registroArticuloProveedor.setField("COS",registoJson[ POS_costoUSD ].v * cotizacion);
					
					registroArticuloProveedor.setField("COT", cotizacion );
					
				}
			}catch (error) { /*no hacemos nada */ "" }
			registroArticuloProveedor.setField("PRN", 1 );
			registroArticuloProveedor.addRegister();
			codigoArticuloProveedor = registroArticuloProveedor.fieldToInt("ID");
			//Corremos el proceso de cambio de costo
			var proceso = new VProcess( theRoot );
			proceso.setProcess("sygemat_corralon_dat/CHG_COS_ART_PRV");
			proceso.setVar("ART_PRV",codigoArticuloProveedor);
			proceso.exec( VProcess.RunInServer );
			
			//Trabajamos con las bonificaciones
			for( var j = POS_inicioBoni; j < POS_finBoni; j++ ){
				
				var nombreColumna = columnas[ j ].label.split("*")[0];
				var codigoBonificacion = verificarBonificacion( nombreColumna, codigoProveedor );
				var boni = 0;
				try {
					boni =	registoJson[ j ].v ;
				}catch (error){ /*no hacemos nada */ "" }
				
				if((boni != "")||(boni != 0)){
					var registroArticuloBonificacion = new VRegister( theRoot );
					registroArticuloBonificacion.setTable("sygemat_corralon_dat/ART_BON_M");
					registroArticuloBonificacion.setField("BON_M", codigoBonificacion );
					registroArticuloBonificacion.setField("NAME", nombreColumna );
					registroArticuloBonificacion.setField("ART_PRV_G", codigoArticuloProveedor );			
					try {
						registroArticuloBonificacion.setField("BON", registoJson[ j ].v * 100 );
					}catch (error) { /*no hacemos nada */ "" }
					registroArticuloBonificacion.addRegister();
				}
				
			}
			
			//Trabajamos con las listas de precios
			for( var j = POS_inicioLstPrecios; j < POS_finLstPrecios; j+=2 ){
				var rentabilidad  = 0;
				var precio        = 0;
				var nombreColumna = "";
				
				try {
					rentabilidad = registoJson[ j ].v;		
				}catch (error) { /*no hacemos nada */ "" }		
				try {
					precio = registoJson[ j+1 ].v;
				}catch (error) { /*no hacemos nada */ "" }
				try {
					nombreColumna = columnas[ j+1 ].label.split(" ")[2];
					
				}catch (error) { /*no hacemos nada */ ""}
				
				if( (rentabilidad > 0 ) || (precio > 0 ) ){
					var listaArticuloTarifa = new VRegisterList( theRoot );
					listaArticuloTarifa.setTable("sygemat_corralon_dat/VTA_TAR_ART_G");
					listaArticuloTarifa.load("ART_VTA_TAR",[codigoArticulo,nombreColumna]);
					
					if( listaArticuloTarifa.size() > 0 ){
						
						var registroArticuloTarifa = listaArticuloTarifa.readAt(0);
						if( rentabilidad > 0 ){
							registroArticuloTarifa.setField("POR_REN",rentabilidad * 100);
						}
						if( precio > 0 ){
							if(codigoUndMedInv != codigoUndMedCos ){
								registroArticuloTarifa.setField("IMP_CAL_EQI",1);
							}
							registroArticuloTarifa.setField("PRE",(precioConIva == true ? precio / 1.21 : precio));
						}
						
						registroArticuloTarifa.modifyRegister();
					}
				}			
			}
			
			//Trabajamos con el stock
			//comentamos que suba el stock ya que se hace por CSV.
			/*  
			for( var j = POS_inicioStock; j < POS_finStock; j+=2 ){
				var codigoAlmacen = "";
				try {
					
					if( j == 60){
					codigoAlmacen = verificarAlmacen(columnas[ j ].label.split(" ")[2]);
					
					}
					else {codigoAlmacen = verificarAlmacen(columnas[ j ].label.split(" ")[1]);}
					

				}catch (error) { /*no hacemos nada  "" }
				
				try {
					var cantidadAjuste =	registoJson[ j ].v;
					}catch (error) { cantidadAjuste = 0}
				
					if (codigoAlmacen != ""){
						var valorCantidad = 0;
					    if (registoJson[j] && registoJson[j].v !== undefined && registoJson[j].v !== null) {
						 valorCantidad = parseFloat(registoJson[j].v) || 0;
					    }
						
						if(valorCantidad > 0){
							var registroMovimientos = new VRegister( theRoot );
							registroMovimientos.setTable("sygemat_corralon_dat/MOV_G");
							registroMovimientos.setField("EMP", "1");
							registroMovimientos.setField("EMP_DIV", "11" );
							registroMovimientos.setField("ALM", codigoAlmacen );
							registroMovimientos.setField("ART", codigoArticulo );
							registroMovimientos.setField("MOV_TIP", "Z" );
							registroMovimientos.setField("DSC", "Stock inicial" );
							try {
								registroMovimientos.setField("CAN", registoJson[ j ].v );
							}catch (error) { /*no hacemos nada  ""  }
							registroMovimientos.setField("CAL_ARR", 1);
							registroMovimientos.addRegister();
							
							var registroStockBase = new VRegister( theRoot );
							registroStockBase.setTable("sygemat_corralon_dat/ART_M_STK_MIN");
							registroStockBase.setField("ALM_M", codigoAlmacen);
							registroStockBase.setField("ART_M", codigoArticulo);
							try {
								registroStockBase.setField("STK_BAS", registoJson[ j+1 ].v );
							}catch (error) { /*no hacemos nada  "" }
							registroStockBase.addRegister();
						}
					}
				
			}*/
			if( ((i % bloqueTranscacion) == 0) && ( i > 0)  ){
				theRoot.commitTrans();
				nuevaTrans = theRoot.beginTrans( "Importando datos bloque " + (i/bloqueTranscacion) );
			}
		}else{
			contadorRegistroKO += 1;
			//detallesError += "Registro " + ( i+1 ) + "  => " + registroArticulo.fieldToString("REF")  + " " + registroArticulo.fieldToString("NAME") + "\n";
		}
	}
}

// Si se creó una nueva transacción se finaliza
if ( nuevaTrans )
{
  theRoot.commitTrans();
};

//Actualizamos los valores al proceso
theRoot.setVar("CON_OK", contadorRegistroOK );
theRoot.setVar("CON_KO", contadorRegistroKO );
theRoot.setVar("RES", detallesError);

//Buscamos el proveedor
function verificarProveedor( nombreProveedor,idProveedor ){
	
	var listaProveedor = new VRegisterList( theRoot );
	listaProveedor.setTable("sygemat_corralon_dat/ENT_M");
	//listaProveedor.load("NOM_ES_PRV",[nombreProveedor]);
	if ((idProveedor !== "" && Number(idProveedor) !== 0)) {
	listaProveedor.load("ID_ENT_IMP_ES_PRV", [idProveedor]);
	} else {
	listaProveedor.load("NOM_ES_PRV", [nombreProveedor]);
	}
	
	if( listaProveedor.size() > 0 ){
		return listaProveedor.readAt(0).fieldToInt("ID");
	}else{
		var registroProveedor = new VRegister( theRoot );
		theApp.setGlobalVar("sygemat_corralon_dat/EMP_ID","11");
		registroProveedor.setTable("sygemat_corralon_dat/ENT_M");
		registroProveedor.setField("EMP", "1");
		registroProveedor.setField("EMP_DIV", "11" );
		registroProveedor.setField("ES_PRV",1);
		registroProveedor.setField("NOM_COM",nombreProveedor);
		registroProveedor.setField("NOM_FIS",nombreProveedor);
		registroProveedor.setField("ID_ENT_IMP",idProveedor);
		registroProveedor.addRegister();
		theApp.setGlobalVar("sygemat_corralon_dat/EMP_ID","");
		return registroProveedor.fieldToInt("ID");
	}	
}

//Buscamos la marca	
function verificarMarca( nombreMarca ){
	
	var listaMarcas = new VRegisterList( theRoot );
	listaMarcas.setTable("sygemat_corralon_dat/MAR_M");
	listaMarcas.load("NAME",[nombreMarca]);
	if( listaMarcas.size() > 0 ){
		return listaMarcas.readAt(0).fieldToInt("ID");
	}else{
		var registroMarca = new VRegister( theRoot );
		registroMarca.setTable("sygemat_corralon_dat/MAR_M");		
		registroMarca.setField("NAME",nombreMarca);		
		registroMarca.addRegister();
		return registroMarca.fieldToInt("ID");
	}	
}

//Buscamos la linea	
function verificarLinea( nombreLinea ){
	
	var listaLineas = new VRegisterList( theRoot );
	listaLineas.setTable("sygemat_corralon_dat/LIN_M");
	listaLineas.load("NAME",[nombreLinea]);
	if( listaLineas.size() > 0 ){
		return listaLineas.readAt(0).fieldToInt("ID");
	}else{
		var registroLinea = new VRegister( theRoot );
		registroLinea.setTable("sygemat_corralon_dat/LIN_M");		
		registroLinea.setField("NAME",nombreLinea);		
		registroLinea.addRegister();
		return registroLinea.fieldToInt("ID");
	}	
}

//Buscamos la unidad de medida	
function verificarUnidadMedida( unidadMedida ){
	
	var listaUndMedidas = new VRegisterList( theRoot );
	listaUndMedidas.setTable("sygemat_corralon_dat/UND_MED_M");
	listaUndMedidas.load("CLV",[unidadMedida]);
	if( listaUndMedidas.size() > 0 ){
		return listaUndMedidas.readAt(0).fieldToInt("ID");
	}else{
		var registroUndMedida = new VRegister( theRoot );
		registroUndMedida.setTable("sygemat_corralon_dat/UND_MED_M");		
		registroUndMedida.setField("NAME",unidadMedida);		
		registroUndMedida.addRegister();
		return registroUndMedida.fieldToInt("ID");
	}	
}

//Buscamos la forma de pago del proveedor
function verificarFormaPagoProveedor( codigoProveedor, nombreFormaPago, porcentajeDescuento ){
	
	var listaFormaPagoPrv = new VRegisterList( theRoot );
	listaFormaPagoPrv.setTable("sygemat_corralon_dat/FPG_PRV_M");
	listaFormaPagoPrv.load("POR_DTO_PRV",[porcentajeDescuento,codigoProveedor]);
	if( listaFormaPagoPrv.size() > 0 ){
		return listaFormaPagoPrv.readAt(0).fieldToInt("ID");
	}else{
		var registroFormaPagoPrv = new VRegister( theRoot );
		registroFormaPagoPrv.setTable("sygemat_corralon_dat/FPG_PRV_M");		
		registroFormaPagoPrv.setField("PRV",codigoProveedor);		
		registroFormaPagoPrv.setField("NAME",nombreFormaPago);
		registroFormaPagoPrv.setField("POR_DTO",porcentajeDescuento);
		registroFormaPagoPrv.setField("PPA",1);
		registroFormaPagoPrv.addRegister();
		return registroFormaPagoPrv.fieldToInt("ID");
	}	
}


//Buscamos las bonificaciones	
function verificarBonificacion( nombreBonificacion, codigoProveedor ){
	
	var listaBonificaciones = new VRegisterList( theRoot );
	listaBonificaciones.setTable("sygemat_corralon_dat/BON_M");
	listaBonificaciones.load("PRV_DSC",[codigoProveedor,nombreBonificacion]);
	if( listaBonificaciones.size() > 0 ){
		return listaBonificaciones.readAt(0).fieldToInt("ID");
	}else{
		var registroBonificacion = new VRegister( theRoot );
		registroBonificacion.setTable("sygemat_corralon_dat/BON_M");		
		registroBonificacion.setField("DSC",nombreBonificacion);		
		registroBonificacion.setField("PRV",codigoProveedor);		
		registroBonificacion.addRegister();
		return registroBonificacion.fieldToInt("ID");
	}	
}

//Buscamos el Almacen
function verificarAlmacen( codigoAlmacen ){
	
	var listaAlmacen = new VRegisterList( theRoot );
	listaAlmacen.setTable("sygemat_corralon_dat/ALM_M");
	listaAlmacen.load("ID",[codigoAlmacen]);
	if( listaAlmacen.size() > 0 ){
		return listaAlmacen.readAt(0).fieldToString("ID");
	}
	else{
		return "";
	}
}

//Buscamos la cotizacion
function verificarCotizacion( codigoMoneda ){
	
	var listaDivisa = new VRegisterList( theRoot );
	listaDivisa.setTable("sygemat_corralon_dat/DIV_COT_M");
	listaDivisa.load("MON_ORI_DES",[codigoMoneda, 2]);
	
	listaDivisa.sort("FCH");
	if( listaDivisa.size() > 0 ){
		var registro = listaDivisa.readAt(listaDivisa.size() - 1);
		return registro.fieldToString("COT");
	}
	else{
		return 0;
	}
}
//Buscamos el Articulo
/*function verificarArticulo( codigoArticulo ){
	
	var listaArticulo = new VRegisterList( theRoot );
	listaArticulo.setTable("sygemat_corralon_dat/ART_M");
	listaArticulo.load("SKU",[codigoArticulo]);
	if( listaArticulo.size() > 0 ){
		return listaArticulo.readAt(0).fieldToString("ID");
	}
	else{
		return "";
	}
}*/	