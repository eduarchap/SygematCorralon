#include "(CurrentProject)/vTools/properties.js"
#include "(CurrentProject)/vTools/utils.js"

importClass("VDir");
importClass("VTextFile");
importClass("VFile");
importClass("VProcess");


Date.prototype.fromString = function(str, datetime) {
    var m = str.match(/(\d+)(\/)(\d+)(\/)(\d+)(\s+(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?)?/);
	if (m) {
		// Normalizamos el año: si viene con 2 dígitos (p.ej. "26"), el constructor Date lo
		// interpretaría como 1900+año (1926). Lo convertimos a 4 dígitos usando pivote 2000.
		var anio = parseInt(m[5], 10);
		if (anio < 100)
			anio += (anio < 70) ? 2000 : 1900;
		if (datetime)
			return new Date(anio, m[3] - 1, m[1], m[7], m[8], (m[9]?m[9]:0), 0)
		else
			return new Date(anio, m[3]-1, m[1]);
	}
	else
		return null;
}

Date.prototype.yyyymmdd = function() {
	var yyyy = this.getFullYear().toString();
	var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
	var dd  = this.getDate().toString();
	return yyyy + "/" + (mm[1]?mm:"0"+mm[0]) + "/" + (dd[1]?dd:"0"+dd[0]); // padding
};

/**
 * Para una columna de tipo imagen (icono/badge), intenta obtener un texto
 * equivalente pidiendo explícitamente otros roles del modelo Qt subyacente
 * (DisplayRole=0, ToolTipRole=3, AccessibleTextRole=33) en vez del rol por
 * defecto (que para estas columnas devuelve el QImage). Genérico: no depende
 * de la tabla/campo de ninguna vista concreta. Si el motor no admite el
 * tercer parámetro o ningún rol trae texto, devuelve null.
 */
function obtenerTextoAlternativo(fila, columna) {
	var roles = [0, 3, 33];
	for (var r = 0; r < roles.length; r++) {
		try {
			var v = rejilla.data(fila, columna, roles[r]);
			if (typeof v === "string" && v !== "") return v;
		} catch (e) { /* rol/parámetro no soportado en este motor */ }
	}
	return null;
}

Date.prototype.yyyymmddhhmmss = function() {
	var yyyy = this.getFullYear().toString();
	var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
	var dd  = this.getDate().toString();
	var hh = this.getHours().toString();
	var min = this.getMinutes().toString();
	var ss = this.getSeconds().toString();
	return yyyy + "/" + (mm[1]?mm:"0"+mm[0]) + "/" + (dd[1]?dd:"0"+dd[0]) + " " + hh + ":" + min + ":" + ss; // padding
};
  
// -------------------------------------------------------------------------------------------------------
// Exportar contenido de una rejilla a Excel utilizando Visual Basic Script (Sólo para Windows)
// -------------------------------------------------------------------------------------------------------
// Obtenemos la rejilla activa
var rejilla = getActiveListControl();
if (rejilla!=null) {
	// Obtenemos la información de la rejilla
	var rejillaInfo = rejilla.objectInfo();
	// Solo se exporta si es una rejilla
	if (rejillaInfo.type() == VObjectInfo.TypeGrid) {
		try {
			// TODO: Comprobar que estamos en Windows
			theApp.setOverrideCursor(VApp.WaitCursor);

			var decimalPoint = theApp.sysDecimalPoint();
			var thousandsSeparator = "."

			//**********************************************************************************************************************
			// Dependiendo del valor de "decimalPoint" establecemos el "separador de miles"
			//**********************************************************************************************************************
			var decimalPointExcel = "."
			if (decimalPoint==".") { thousandsSeparator = "," }

			//**********************************************************************************************************************
				
			var filas = this.rejilla.listSize();
			var columnas = this.rejilla.columnCount();
			
			// Preparar scriptVB a procesar
			var scriptVB = 'On Error Resume Next' + '\r\n';
			scriptVB += 'Const xlNormal = -4143'  + '\r\n'
			scriptVB += 'set wss=createobject("wscript.shell")'  + '\r\n'
			scriptVB += 'set objExcel = CreateObject(' + '"' + 'Excel.Application' + '"' + ')' + '\r\n';
			scriptVB += 'if Err.Number <> 0 then' + '\r\n';
			scriptVB += 'Wscript.Echo "Excel application not installed."' + '\r\n';
			scriptVB += 'Wscript.Quit' + '\r\n';
			scriptVB += 'end if' + '\r\n';
			scriptVB += 'On Error GoTo 0' + '\r\n';
			// Con esta instrucción conseguimos que el excel no se vea mientras se carga de datos
			scriptVB += 'objExcel.Visible = False' + '\r\n';
			scriptVB += 'objExcel.Workbooks.Add' + '\r\n';
			scriptVB += 'objExcel.WindowState = xlNormal' + '\r\n';
			scriptVB += 'Set objSheet = objExcel.ActiveWorkbook.Worksheets(1)' + '\r\n';
			var re = new RegExp("[\\\]\*/:?\[\\\\]+", "g");
			sheet_name = (rejillaInfo.name().length > 0) ? rejillaInfo.name().replace(re,"_").substring(0,30) : "Hoja 1";
			scriptVB += 'objSheet.Name = "' + sheet_name + '"' + '\r\n';
			var fila = 1;
			var ocultas = 0;
			var tipo_imagen = VGridListDataView.TypeImage;

			// Detección robusta de columnas de imagen: no confiamos solo en
			// dataType() === tipo_imagen (el código numérico puede no coincidir con
			// VGridListDataView.TypeImage según la versión/build de Velneo, que es
			// justo lo que causaba "Property 'replace' of object QVariant(QImage...)").
			// Si hay filas, comprobamos también el valor real de la primera: una
			// columna de imagen devuelve un QImage (no string) en vez de texto.
			// Para las columnas de imagen, intentamos además obtener un texto
			// equivalente (ver obtenerTextoAlternativo). Si se consigue, la columna
			// SÍ se exporta (como texto); si no, se omite como hasta ahora.
			var esImagen = [];
			var textoImagenDisponible = [];
			for (var columna = 0; columna < columnas; columna++) {
				var esImg = (this.rejilla.dataType(columna) === tipo_imagen);
				if (!esImg && filas > 0) {
					esImg = (typeof this.rejilla.data(0, columna) !== "string");
				}
				esImagen.push(esImg);

				var alt = esImg && filas > 0 && (obtenerTextoAlternativo(0, columna) !== null);
				textoImagenDisponible.push(alt);
			}

			try {
				for ( var columna = 0; columna < columnas; columna++ ) {
					if (this.rejilla.isColumnHidden(columna))
						ocultas++
					else {
						//Si el tipo de la columna no es imagen, o es imagen pero conseguimos texto alternativo
						if (!esImagen[columna] || textoImagenDisponible[columna]) {
							var columnaInfo = this.rejillaInfo.subObjectInfo( VObjectInfo.TypeGridCol, columna );
							// Preparar títulos de cabecera de las columnas
							scriptVB += 'objSheet.Cells(' + fila + ',' + (columna+1-ocultas) + ').Value =' + '"' + columnaInfo.name() + '"' + '\r\n';
						}
						//Si es imagen y no hay texto alternativo, no generamos la celda (sumamos a la variable ocultas)
						else
							ocultas++
					}
				}
				try {
					// Iniciamos la barra de progreso
					theRoot.initProgressBar();
					// TODO: Pasar a constante
					theRoot.setTitle("Exportando " + filas + " elemento(s)");
					for (fila = 0; fila < filas; fila++) {
						ocultas = 0;
						for (var columna = 0; columna < columnas; columna++) {
							if (this.rejilla.isColumnHidden(columna))
								ocultas++
							else {
								if (esImagen[columna] && !textoImagenDisponible[columna])
									ocultas++
								else {
									dato = esImagen[columna]
										? obtenerTextoAlternativo(fila, columna)
										: this.rejilla.data(fila, columna);
									// Salvaguarda: si a pesar de todo la celda no es texto
									// (p.ej. un QImage), la tratamos como vacía en vez de romper.
									if (typeof dato !== "string")
										dato = "";
									// Sustituimos las comillas dobles por simples
									dato = dato.replace(/"/g, "'");
									// Sustituimos los retornos de carro por chr(10)
									dato = dato.replace(/\r\n/g, '"+chr(10)+"');
									dato = dato.replace(/\n/g, '"+chr(10)+"');
									number = dato.replace(thousandsSeparator,"").replace(decimalPoint,decimalPointExcel);
									// Si es fecha le asignamos el formato fecha
									if ((this.rejilla.dataType(columna) == VGridListDataView.TypeDate)) {
										fecha = (new Date()).fromString(dato, false);
										if (fecha) 
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value="'+fecha.yyyymmdd()+'"\r\n'
										else
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value=chr(39)+"'+dato+'"\r\n';
									} else if ((this.rejilla.dataType(columna) == VGridListDataView.TypeDateTime)) {
										fecha = (new Date()).fromString(dato, true);
										if (fecha)
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value="'+fecha.yyyymmddhhmmss()+'"\r\n'
										else
										scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value=chr(39)+"'+dato+'"\r\n';
									} else {
										//************************************************************************************************************
										// Comprobamos que sea un númerico válido. En caso contrario asumimos el valor como alfanumérico
										//************************************************************************************************************
										var datoEnPartes = dato.split(decimalPoint);
										if (datoEnPartes.length == 1) {
											var numeroDecimales = 0;
										} else {
											numeroDecimales = datoEnPartes[1].length;
										}
										
										if ( (isNaN(datoEnPartes[0].replace(/\./g, ""))==false) && (dato.indexOf("E") == -1) && (dato.indexOf("e") == -1) )
										{
											// Comprobamos si la columna tiene separador de miles
											var lConSepMiles = dato.indexOf(thousandsSeparator) > -1;
											// Si hay separador de miles, los quitamos para Formatear el número en el Script de VBScript --> .Value = dato
											// Lo hacemos con split porque se puede dar el caso de que haya varios separadores
											if (lConSepMiles)
												dato = dato.split(thousandsSeparator).join("");
											if ( (this.rejilla.dataType(columna) == VGridListDataView.TypeNumber) || ((number!="") && (!isNaN(number))) )
											{
												if (numeroDecimales>0) {
													scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').NumberFormat =' + '"#' + (lConSepMiles?',':'') + '##0.0' +Array(numeroDecimales).join("0")+'"' + '\r\n';
												} else {
													scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').NumberFormat =' + '"#' + (lConSepMiles?',':'') + '##0"' + '\r\n';
												}
											} else 
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').NumberFormat = "General"' + '\r\n';
											if (isNaN(number)) 	
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value =chr(39)+"' + dato + '"\r\n';
											else 		
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value = ' + ((number.length==0)?('""'): number) + '\r\n';
										} else {
											// Le sumamos 2 a la fila porque en excel las filas empiezan en 1 y en la posición 1 están los títulos
											scriptVB += 'objSheet.Cells(' + (fila+2) + ',' + (columna+1-ocultas) + ').Value =chr(39)+"' + dato + '"\r\n';
										}
									}
								}
							}
						}
						theRoot.setProgress(fila*100/filas);						
					}
				} finally {
					theRoot.endProgressBar();
				}
			} catch(err) {
				alert(err);
				//return false;
			}
			scriptVB += 'objSheet.Columns("A:Z").AutoFit' + '\r\n';
			// Con esta instrucción hacemos visible el excel
			scriptVB += 'objExcel.Visible = True' + '\r\n';
			// Guardamos el fichero vbs y lo ejecutamos
			var ficheroScrtipVB = new VTextFile(theRoot.clientCachePath() + "ExcelScript.vbs");
			// Se abre el fichero en modo escritura, crea si no existe o limpia si existe
			if ( ficheroScrtipVB.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
				// Se guarda el script generado
				ficheroScrtipVB.write(scriptVB);
				// Se cierra el fichero
				ficheroScrtipVB.close();
			}
			// Preguntar si queremos abrir el fichero xls creado
			var proceso = new VProcess(theRoot);
			proceso.setProcess("sygemat_corralon_app/LAUNCH_COMMAND");
			// Le pasamos el comando que tiene que lanzar
			proceso.setVar("CMD", theRoot.clientCachePath() + "ExcelScript.vbs");
			proceso.exec();
		} finally {
			theApp.restoreOverrideCursor();
		}
	} else
		alert("Esta funcionalidad es válida sólo para rejillas.");
} else 
	alert("Esta funcionalidad es válida sólo para rejillas.");