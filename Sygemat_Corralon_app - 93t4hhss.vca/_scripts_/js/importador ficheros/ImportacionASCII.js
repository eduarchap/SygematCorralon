/**
 * Importación de registros en una tabla a partir los datos contenidos en un fichero de texto
 *
 * @descripcion Se lee un fichero en disco, con formato texto
 *                      los identificadores de los campos Velneo se reciben en la variable CAB_LIN.
 *                      que está ordenada según las columnas del fichero.
 * @version 2019-05-23
 * @param  {String} FIC_EXT Senda del fichero en disco con formato ASCII de la que se importarán los datos
 * @param  {String} SEP Caracter que se utilizará como separador de campo, por defecto tabulador
 * @param  {String} CAB_LIN Cabecera del fichero adaptada a campos de Velneo
 * @param  {String} TAB_ID_REF IdRef de la tabla de Velneo correspondiente
 * @return {String} MSG Texto con la descripción del resultado de la importación
 */

// ----------------------------------------------------------------------------------------
// Importación de registros en una tabla a partir los datos contenidos en un fichero ASCII
// ----------------------------------------------------------------------------------------
importClass("VProcess");
importClass("VFile");
importClass("VTextFile");

var barra_de_progreso = 0;
var reg_creados       = 0;
var reg_modif         = 0;
var reg_leidos        = 0;
var reg_a_importar    = theRoot.varToInt("REG_LEI_T");
var hacer_alta        = theRoot.varToString("ALT");
var hacer_mod         = theRoot.varToString("MOD");
var id_formato        = theRoot.varToString("ID_FMT");
var sep_decimal       = theRoot.varToString("FMT_NUM_IMP");

var cab_lin           = theRoot.varToString("CAB_LIN");
var cab_lin_opc       = theRoot.varToString("CAB_LIN_OPC");
var cab_lin_opc_val   = theRoot.varToString("CAB_LIN_OPC_VAL");
var cab_lin_opc_tab   = theRoot.varToString("CAB_LIN_OPC_TAB");
var cab_lin_opc_idx   = theRoot.varToString("CAB_LIN_OPC_IDX");
var ficheroIdRef      = theRoot.varToString("TAB_ID_REF");
var ficheroImport     = theRoot.varToString("FIC_EXT");
var ficheroCampos     = "sygemat_corralon_dat/IMP_CAM";
var ficheroProcesos   = "sygemat_corralon_dat/IMP_FUN_ALF";

// Se prepara el valor del separador de campos
var separador    = (theRoot.varToString("SEP") != null)&(theRoot.varToString("SEP") != "") ? theRoot.varToString("SEP") : "\t";

// Se abre transacción si no existe
bTransCurso = theRoot.existTrans();

if (bTransCurso == false)
	{
		bTransNueva = theRoot.beginTrans("Importando: " + ficheroImport);
	};
	
if (bTransCurso || bTransNueva) {
		// Se abre el fichero en modo de sólo lectura
		var ficheroTxt = new VTextFile(ficheroImport);
		if (ficheroTxt.open(VFile.OpenModeReadOnly)) {
		// Se leen los nombres de los campos en la primera línea y se guardan en un array
		var linea_cab  = ficheroTxt.readLine();
		var linea      = cab_lin;
		var importo_Id = "0";
		var aCampos = new Array();
		var aCampos    = linea.split(separador);

		// Miramos si está el campo ID
		for (var nCampo = 0; nCampo < aCampos.length; nCampo++) 
			{
               if ( aCampos[nCampo] == "ID")
			 	 {	
				  var importo_Id = "1";
				 }	
			}

		// Recorremos el fichero línea a línea guardando su contenido
		var aValores         = new Array();
		var aValores_opc     = new Array();
		var aValores_opc_val = new Array();
		var aValores_opc_tab = new Array();
		var aValores_opc_idx = new Array();
		aValores_opc         = cab_lin_opc.split(separador);
		aValores_opc_val     = cab_lin_opc_val.split(separador);
		aValores_opc_tab     = cab_lin_opc_tab.split(separador);
		aValores_opc_idx     = cab_lin_opc_idx.split(separador);

		var nNumRegistro = 0;
			
		theRoot.initProgressBar();
		theRoot.setProgress(0);

		while (ficheroTxt.atEnd() == false) {
				// Crear nuevo registro vacío
				var registro = new VRegister(theRoot);
				registro.setTable(ficheroIdRef);

				// Leer la línea y los valores de los campos
				linea = ficheroTxt.readLine();
                reg_leidos = reg_leidos + 1;
		        barra_de_progreso = (reg_leidos / reg_a_importar)*100	
				
				if (barra_de_progreso > 100)
				{barra_de_progreso = 100};
				theRoot.setProgress(barra_de_progreso);
				aValores = linea.split(separador);
			    var existe = "false";	  
			   
			    if (importo_Id == "1")
				{	
				  for (var nCampo = 0; nCampo < aCampos.length; nCampo++) 
					{
                      if ( aCampos[nCampo] == "ID")
					  {	
					   registro.readRegister ("ID",[aValores[nCampo]], VRegister.SearchThis);  
					   var existe = registro.exist();
					  }	
					}
				}
				for (var nCampo = 0; nCampo < aValores.length; nCampo++) {
                    if ( aCampos[nCampo] != "")
					 {	
						if (aValores_opc[nCampo] == "T")
						{
							var tabla_opc_IdRef = aValores_opc_tab[nCampo];
							var idx_opc_IdRef   = aValores_opc_idx[nCampo];

							var registroMae     = new VRegister(theRoot);
							registroMae.setTable(tabla_opc_IdRef);
							var id_del_padre = "";
							registroMae.readRegister (idx_opc_IdRef,[aValores[nCampo]], VRegister.SearchThis);
							var existeMae = registroMae.exist();
							if ( existeMae == true)
				               {
								var id_del_padre    = registroMae.fieldToString("ID");   
								registro.setField(aCampos[nCampo], id_del_padre);
							   }
						}
						else if (aValores_opc[nCampo] == "P")
						{
							var procesoProcesos   = aValores_opc_tab[nCampo];
							var registro_imp_alf = new VRegister(theRoot);
							registro_imp_alf.setTable(ficheroProcesos);

						    registro_imp_alf.readRegister ("ID",[1], VRegister.SearchThis);
						    var existe_alf = registro_imp_alf.exist();
						    registro_imp_alf.setField("VAL_IN", aValores[nCampo]);  
						    if ( existe_alf == true)
							   {
								registro_imp_alf.modifyRegister();
							   }
						    else
							   {
								registro_imp_alf.addRegister();		
							   }
							var proceso = new VProcess(theRoot);
							proceso.setProcess(procesoProcesos); 
							proceso.exec();
							registro_imp_alf.readRegister ("ID",[1], VRegister.SearchThis);
							var in_imp  = registro_imp_alf.fieldToString("VAL_OUT");   
							registro.setField(aCampos[nCampo], in_imp);
						}
						else
						{
						tablaInfo      = registro.tableInfo();
						numcamposTabla = tablaInfo.fieldCount();
				        for (var nCamposTabla = 0; nCamposTabla < numcamposTabla; nCamposTabla++) 
							{
                            if ( tablaInfo.fieldId(nCamposTabla) == aCampos[nCampo])
							  {tipocampo = tablaInfo.fieldType(nCamposTabla)
							  if ((tipocampo == "6") && (sep_decimal == "1"))
								  {
									if (aValores[nCampo].indexOf(".") != -1)
								    {aValores[nCampo] = aValores[nCampo].replace(/[.]/g,"");}
									if (aValores[nCampo].indexOf(",") != -1)
								    {aValores[nCampo] = aValores[nCampo].replace(/[,]/g,".");}
								  }
							  if ((tipocampo == "6") && (sep_decimal == "2"))
								  {
									if (aValores[nCampo].indexOf(",") != -1)
								    {aValores[nCampo] = aValores[nCampo].replace(/[,]/g,"");}
								  }
							  }
						    }
							
					    registro.setField(aCampos[nCampo], aValores[nCampo]);
						}	
					 }	
				}

				for (var nCampo = 0; nCampo < aValores_opc.length; nCampo++) {
                    if ( aValores_opc[nCampo] == "F")
					 {	
					    registro.setField(aCampos[nCampo], aValores_opc_val[nCampo]);
					 }	
				}

				for (var nCampo = 0; nCampo < aValores_opc.length; nCampo++) {
                    if ( aValores_opc[nCampo] == "D")
					 {	
						var registroDupCampos = new VRegister(theRoot);
						registroDupCampos.setTable(ficheroCampos);
						registroDupCampos.readRegister ("ID",[id_formato, aValores_opc_val[nCampo]], VRegister.SearchThis);
						var existeDup = registroDupCampos.exist();
						if ( existeDup == true)
						 {
	 					  var col_dup   = registroDupCampos.fieldToInt("CMP_DES");
						  col_dup = (col_dup - 1); 	 
                          valor_dup = registro.fieldToString(col_dup);	 
                          registro.setField(aCampos[nCampo], valor_dup);
						 }
					 }	
				}

				if ( existe == true)
				    {
					 if (hacer_mod == "1")
					  {
						 registro.modifyRegister();
						 reg_modif = reg_modif + 1;
					  } 
					}
				else	
				    {
					 if (hacer_alta == "1")
					  {
						 registro.addRegister();
						 reg_creados = reg_creados + 1; 
					  } 
					}

				// Mostrar el avance
				theRoot.setTitle("Importando registro nº " + nNumRegistro++ + " de la tabla " + ficheroImport);
			}

			// Se cierra el fichero
			ficheroTxt.close();
			theRoot.endProgressBar();
		}

		// Se cierra la transacción si se creó una nueva
		if (bTransNueva) {
			theRoot.commitTrans();
		}
	}

	function replaceAll( text, busca, reemplaza )
	{
		while (text.toString().indexOf(busca) != -1)
		text = text.toString().replace(busca,reemplaza);
		return text;
	}
	
// Se retorna el mensaje con el resultado de la importación
theRoot.setVar("MSG", "Nuevos: " + reg_creados +"  -  Modificados: " + reg_modif +" registros en el fichero " + ficheroImport);

