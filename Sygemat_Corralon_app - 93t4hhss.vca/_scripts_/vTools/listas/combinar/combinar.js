#include "(CurrentProject)/vTools/listas/lists.js"
#include "(CurrentProject)/vTools/utils.js"


// Obtenemos la vista con la lista actual
var listView = getActiveListControl();
// Guardamos la vista actual para después volver a darle foco a ésta
var currentView = theMainWindow.currentView();
if (listView!=null) {
	// Obtenemos la lista porque la necesitamos después
	var inList=cloneList(listView);
	// Obtenemos el resto de vistas de la misma tabla
	var aOtherWidgets = new Array();
	var aOtherViews = new Array();
	var nCountView = theMainWindow.viewsCount() - 1;
	for ( var i = 0; i < nCountView; i++ ) {
		theMainWindow.prevView();
		var wView = theMainWindow.currentView();
		var aWidget = getActiveListControl();
		if ( aWidget != null ) {
			aOtherWidgets.push(aWidget);
			aOtherViews.push(wView);
		}
	}
	// Volver a activar la pestaña que estaba activa
	theMainWindow.setCurrentView( currentView );
	
	if (aOtherViews.length) {
		// Pasamos los nombres, los idRefs y los tamaños a variables separadas por separador para llevar esos datos al formulario
		var views=[];
		var list = new VRegisterList( theRoot );
		for (i=0; i<aOtherViews.length; i++) {
			// Obtenemos la lista de elementos de esta vista y solo lo añadimos si tiene elementos
			aOtherWidgets[i].getList(list);
			if (list.size()>0) {
				var infoView={};
				infoView['title']=aOtherViews[i].title();
				infoView['size']=list.size();
				views.push(infoView);
			}
		}
		// Si tenemos vistas con elementos mostramos el formulario
		if (views.length) {
			//Creamos el formulario
			var formulario = new VDataViewDialog(theRoot);
			formulario.setDataView(VObjectInfo.TypeForm, "sygemat_corralon_app/SEL_LST_CMB");
			// Asignamos valores al formulario
			formulario.setVar('CURRENT_LIST', currentView.title() + " (" + inList.size() + " elementos)" );
			formulario.setVar('TABLE_NAME', inList.tableInfo().name());
			// Pasamos toda la información que necesita el listbox del formulario en un JSON
			formulario.setVar('VISTAS', JSON.stringify(views));
			if (formulario.exec()) {
				// Obtenemos la vista seleccionada
				var vistaSeleccionada=formulario.varToInt("RESULTADO");
				// Si se ha seleccionado alguna seguimos procesando
				if (vistaSeleccionada>-1) {
					var modoCombinar=formulario.varToInt("MODO_COMBINAR");
					aOtherWidgets[vistaSeleccionada].getList(list);
					// En función del modo combinar seleccionado hacemos la operación con la lista entrante
					if (modoCombinar==0) 
						listView.cross(list)
					else if (modoCombinar==1)
						listView.append(list)
					else
						listView.remove(list);
					listView.setFocus();
				}
			}
		}
	}
}
