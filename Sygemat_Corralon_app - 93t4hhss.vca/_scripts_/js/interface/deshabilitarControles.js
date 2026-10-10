// --------------------------------------------------------------------------------
// Deshabilita los controles del formulario
//
// Parámetros:
//     - formulario: Objeto de la clase VFormDataView con el formulario a procesar
// --------------------------------------------------------------------------------
var deshabilitaControles = function (formulario, cascada, botones) {
    
    cascada || (cascada = true); // Se asume cascada verdadero por defecto si no pasan el parámetro
    botones || (botones = true); // Se asume por defecto que se desactivan los botones

	if (formulario) {

		// Declaramos los tipos de controles que no se desactivarán y que se recorrerán
        var tiposEnabled = [ VMainWindow.WTypeDataView, VMainWindow.WTypeMdiView, 
                             VMainWindow.WTypeWebView, VMainWindow.WTypeTabWidget,
                             VMainWindow.WTypeStackedWidget, VMainWindow.WTypeToolBox,
                             VMainWindow.WTypeSplitter, VMainWindow.WTypeGroupBox, 
							 VMainWindow.WTypeScrollArea ];

		// Repasamos los controles del formulario
        var numControles = formulario.controlCount();
        for (var numControl = 0; numControl < numControles ; numControl++) {
            var control = formulario.control(numControl);
            if (control){
                tipo = theMainWindow.widgetType(control);
	            // Si el control es del tipo de adecuado se deshabilita
                if (tiposEnabled.indexOf(tipo) === -1) {
					control.enabled = false;
                } else {
					// Al ser un control contenedor y es en cascada se recorren los formularios
					if (cascada === true) {
						switch(tipo) {
							case VMainWindow.WTypeSplitter:
							case VMainWindow.WTypeStackedWidget:
							case VMainWindow.WTypeTabWidget:
							case VMainWindow.WTypeToolBox:
								var numFormularios = control.count;
								for (var numFormulario = 0; numFormulario < numFormularios; numFormulario++) {
									deshabilitaControles(control.form(numFormulario), cascada);
								}
								break;
							case VMainWindow.WTypeDataView:
								// Si es una vista de datos que contiene un formulario entonces se sigue deshabilitando
								if (control.root().dataView().viewType() === VAbstractDataView.DataViewForm) {
									deshabilitaControles(control.root().dataView(), cascada);
								}
								break;
							case VMainWindow.WTypeScrollArea:
								// Si es un área de scroll se sigue deshabilitando el formulario contenido
								deshabilitaControles(control.form(), cascada);
								break;
						}
					}
				}
            }
        }
    }
}

// --------------------------------------------------------------------------------
// Habilita los controles del formulario
//
// Parámetros:
//     - formulario: Objeto de la clase VFormDataView con el formulario a procesar
// --------------------------------------------------------------------------------
var habilitaControles = function (formulario, cascada) {
	
    cascada || (cascada = true); // Se asume cascada verdadero por defecto si no pasan el parámetro

    if (formulario) {
		
		// Declaramos los tipos de controles que no se desactivarán y que se recorrerán
		var tiposEnabled = [ VMainWindow.WTypeDataView, VMainWindow.WTypeMdiView, 
							 VMainWindow.WTypeWebView, VMainWindow.WTypeTabWidget,
							 VMainWindow.WTypeStackedWidget, VMainWindow.WTypeToolBox,
							 VMainWindow.WTypeSplitter, VMainWindow.WTypeGroupBox,
							 VMainWindow.WTypeScrollArea ];
		
        var numControles = formulario.controlCount();
        for (var numControl = 0; numControl < numControles; numControl ++) {
            var control = formulario.control(numControl);
            if (control) {
				// Habilitamos el control
                control.enabled = true;

				// Si es contenedor y es en cascada, se recorren los subformularios habilitando sus controles
				tipo = theMainWindow.widgetType(control);
				if ((tiposEnabled.indexOf(tipo) !== -1) && (cascada)) {
					switch(tipo) {
						case VMainWindow.WTypeSplitter:
						case VMainWindow.WTypeStackedWidget:
						case VMainWindow.WTypeTabWidget:
						case VMainWindow.WTypeToolBox:
							var numFormularios = control.count;
							for (var numFormulario = 0; numFormulario < numFormularios; numFormulario++) {
								habilitaControles(control.form(numFormulario), cascada);
							}
							break;
						case VMainWindow.WTypeDataView:
							// Si es una vista de datos que contiene un formulario entonces se sigue deshabilitando
							if (control.root().dataView().viewType() === VAbstractDataView.DataViewForm) {
								habilitaControles(control.root().dataView(), cascada);
							}
							break;
						case VMainWindow.WTypeScrollArea:
							// Si es un área de scroll se sigue habilitando el formulario contenido
							habilitaControles(control.form(), cascada);
							break;
					}
				}				
            }			
        }
    }
}
