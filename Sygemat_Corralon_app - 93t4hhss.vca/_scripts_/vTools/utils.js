
/**
 * @description Obtiene la traducción de la constante en el idioma actual de la aplicación
 * @version 2014-05-28
 * @param {String} Identificador de la constante
 * @returns {String} Contenido de la constante en el idioma seleccionado
 */
function tr(szIdRefConstante) {
	return theApp.constant(szIdRefConstante);
}


/**
 * @description Indica si estamos en edición (dentro de Velneo vDevelop)
 * @version 2014-05-28
 * @returns {Boolean} True si estamos en vDevelop
 */
function isEdit() {
	return theApp.exeName=="vDevelop";
}


/**
 * @description Nos indica si estamos en el plano del servidor (3P)
 * @version 2014-05-28
 * @returns {Bool} True si estamos en tercer plano
 */
function is3P() {
	return theApp.exeName=="vServer";
}

/**
 * @description Obtiene el control activo si se corresponde con una lista
 * @version 2014-05-28
 * @params {vTableInfo} (Opcional): Si se indica este parámetro, el control resultante será de esa tabla
 * @returns {Object} El control activo 
 */
function getActiveListControl(vTableInfo) {
	// Funciones de apoyo
	// Obtener la QWidget de lista activo de un MdiView
	function getActiveListWidgetView( vMdiView ) {
		if ( vMdiView ) {
			var nViewType = vMdiView.type();
			if ( nViewType == VMdiView.TypeListAlternador ) {
				// alternador
				var alt = vMdiView.root().dataView();
				return alt.dataViewActive();
			} else if ( nViewType > 1 ) {
				// Vista de datos
				return vMdiView.centralWidget();
			} else if ( nViewType == 1) {
				// formulario
				var form = vMdiView.root().dataView();
				return form.dataViewActive();
			}
		}
	}

	// Comprobamos si es modal
	try {
		var control = theParentWidget.objectInfo();
		if (control.inputType() == VObjectInfo.IOList)
			return theParentWidget;
	} catch (err){
	}
	
	// Evaluar entrada (Lista o ninguno
	if ( theRoot.objectInfo().inputType() == VObjectInfo.IOList ) {
		if (vTableInfo!==undefined) {
			widgetInfo=theRoot.objectInfo();
			if (widgetInfo.outputType() == VObjectInfo.IOList && widgetInfo.outputTable().idRef() == vTableInfo.idRef())
				return theRoot;
		} else
			return theRoot;
	} else {
		// Obtener lista de la vista activa
		var qWidget = getActiveListWidgetView( theMainWindow.currentView() );
		if ( ( qWidget != null ) && ( qWidget.objectInfo().inputType() == VObjectInfo.IOList ) ) {
			if (vTableInfo!==undefined) {
				widgetInfo=qWidget.objectInfo();
				if (widgetInfo.outputType() == VObjectInfo.IOList && widgetInfo.outputTable().idRef() == vTableInfo.idRef())
					return qWidget;
			} else
				return ((qWidget.objectInfo().type() == VObjectInfo.TypeListAlternator) ? qWidget.dataViewActive() : qWidget);
		}
	}
	return undefined;
}


/**
 * @description Obtiene el objectInfo de un objeto con un determinado id y de un determinado tipo
 * @version 2014-10-17
 * @params {tipo} Uno de los enum de tipo de objeto de ObjectInfo
 *		 {id} Identificador del objeto a buscar
 * @returns {VObjectInfo} undefined si no lo encuentra o el objectInfo encontrado
 */
function getObjectInfo(tipo, id) {
	var objInfo=null;
	
	objCount = theApp.mainProjectInfo().allObjectCount(tipo);
	for (var i=0;i<objCount;i++) {
		objInfo = theApp.mainProjectInfo().allObjectInfo(tipo, i);
		if (objInfo.id()==id)
			break;
	}
	return objInfo;
}

/**
 * @description Obtiene el dataview que tiene el foco
 * @version 2015-11-02
 * @params 
 * @returns {Object} El objeto dataview que tiene el foco o undefined si no hay ninguno
 */
function getFocusedDataView(vTableInfo) {
	// Comprobamos si hay un control que tenga el foco
	var focused = theApp.focusDataView();
	if (focused) {
		if (vTableInfo!==undefined) {
			widgetInfo=focused.objectInfo();
			if (widgetInfo.outputType() == VObjectInfo.IOList && widgetInfo.outputTable().idRef() == vTableInfo.idRef())
				return focused;
		} else
			return focused;
	}
	// Si llega aquí es que no hemos encontrado un control que cumpla las condiciones
	return undefined;
}
