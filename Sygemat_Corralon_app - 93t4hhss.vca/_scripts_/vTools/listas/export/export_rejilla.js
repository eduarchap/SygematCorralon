function ExportarRejilla(rejilla, inicioCampo, finCampo, inicioFila, finFila, callback) {
	this.rejilla = rejilla;
	this.rejillaInfo = rejilla.objectInfo();
	this.inicioCampo = inicioCampo;
	this.finCampo = finCampo;
	this.inicioFila = inicioFila;
	this.finFila = finFila;
	// Si encontramos el carácter separador de campo en el dato, rodeamos al dato de comillas dobles
	this.normalizarDato = false;
}

ExportarRejilla.prototype.getDatos = function () {
	var filas = this.rejilla.listSize();
	var columnas = this.rejilla.columnCount();
	var dato = "";
	var datos=this.inicioFila;
	
	try {
		for ( var columna = 0; columna < columnas; columna++ ) {
			// Solo exportamos los campos que no sean de tipo imagen
			if ((this.rejilla.dataType(columna) != VGridListDataView.TypeImage) && (!this.rejilla.isColumnHidden(columna))) {
				var columnaInfo = this.rejillaInfo.subObjectInfo( VObjectInfo.TypeGridCol, columna );
				// Preparar títulos de cabecera de las columnas
				datos += this.inicioCampo + columnaInfo.name();
				if (columna+1!=columnas)
					datos += this.finCampo;
			}
		}
		
		// Se añade el separador de fin de fila a la primera línea con nombres de los títulos de las columnas
		datos += this.finFila;
		try {
			// Iniciamos la barra de progreso
			theRoot.initProgressBar();
			// TODO: Pasar a constante
			theRoot.setTitle("Exportando " + filas + " elemento(s)");
			for (var fila = 0; fila < filas; fila++) {
				datos += this.inicioFila;
				for (var columna = 0; columna < columnas; columna++) {
					if (!this.rejilla.isColumnHidden(columna)) {
						dato = this.rejilla.data(fila, columna);
						if (typeof dato!= "object") { // No exportamos las imagenes
							if (dato.indexOf('"')!=-1) {
								/* Usar esta instrucción si el contenido a exportar lleva comillas dobles */
								dato = dato.replace(/"/g, "'");
							}
							if ((this.normalizarDato) && (dato.indexOf(this.finCampo)!=-1)) {
								dato = '"' + dato + '"';
							}

							// Si una columna tiene retorno de linea [\n] metemos la columna entre comillas dobles
							if ((dato.indexOf('\n')!=-1) && (dato.indexOf(this.finCampo)==-1)) {
								dato = '"' + dato + '"';
							}

							// Añadir el contenido de la columna al fichero junto con sus separadores
							datos += this.inicioCampo + dato;
							// Si estamos en la última columna no añadimos separador al final
							if (columna+1!=columnas) {
								datos += this.finCampo;
							}
							theRoot.setProgress(fila*100/filas);
						
						}
						else {
							dato = ' ';
							// Añadir el contenido de la columna al fichero junto con sus separadores
							datos += this.inicioCampo + dato;
							// Si estamos en la última columna no añadimos separador al final
							if (columna+1!=columnas) {
								datos += this.finCampo;
							}
							theRoot.setProgress(fila*100/filas);
						}	
					}
				}
				// Se añade el separador de fila de cada registro exportado
				datos += this.finFila;
			}
		} finally {
			theRoot.endProgressBar();
		}
		return datos;
	} catch(err) {
		alert(err);
		return false;
	}
}
