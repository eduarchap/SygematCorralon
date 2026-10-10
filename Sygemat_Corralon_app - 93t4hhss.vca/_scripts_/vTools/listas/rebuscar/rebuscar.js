#include "(CurrentProject)/vTools/listas/lists.js"
#include "(CurrentProject)/vTools/utils.js"

importClass("VQuery");

function getBusquedasFromTable(inputTableName) {
	// Obtenemos las búsquedas para la tabla de la lista
	var busquedas=[];
	var numBusquedas=theApp.mainProjectInfo().allObjectCount(VObjectInfo.TypeQuery);
	for (var i=0;i<numBusquedas;i++) {
		busqueda=theApp.mainProjectInfo().allObjectInfo(VObjectInfo.TypeQuery, i);
		try {
			// Para que funcione en versiones anteriores a la 7.16 (se introdujo la función isPrivate()
			var esPrivada = false;
			esPrivada=busqueda.isPrivate();
		} catch (err) {
		}
		if ((busqueda.outputTable().idRef()===inputTableName) && (!esPrivada))
			busquedas.push(busqueda);
	}
	return busquedas;
}


function rebuscar(listControl, registerList) {
	//Creamos el formulario
	var formulario = new VDataViewDialog(theRoot);
	formulario.setDataView(VObjectInfo.TypeForm, "sygemat_corralon_app/SEL_BUS")

	var inputTableidRef=registerList.tableInfo().idRef();
	var inputTableName=registerList.tableInfo().name();
	//Le pasamos un valor a la variable local del formulario
	formulario.setVar("TABLE_IDREF", inputTableidRef);
	formulario.setVar("TABLE_NAME", inputTableName);

	// Obtenemos las búsquedas de la tabla actual
	var busquedas = getBusquedasFromTable(inputTableidRef);

	// Pasamos los nombres y los idRefs a variables separadas por separador para llevar esos datos al formulario
	var nombre_busquedas=[];
	var idref_busquedas=[];
	for (i=0;i<busquedas.length;i++) {
		nombre_busquedas[i]=busquedas[i].name();
		idref_busquedas[i]=busquedas[i].idRef();
	}
	// Pasamos los datos necesarios al formulario en cadenas alfabéticas separadas por separador
	formulario.setVar("NOMBRE_BUSQUEDAS", nombre_busquedas.join("||"));
	formulario.setVar("IDREF_BUSQUEDAS", idref_busquedas.join("||"));

	//Mostramos el formulario
	if(formulario.exec())
	{
		//Leemos el valor de una variable del formulario y lo mostramos
		var indexBusqueda=formulario.varToInt("RESULTADO");
		if (indexBusqueda!=-1) {
			var modoRebuscar=formulario.varToInt("MODO_REBUSCAR");
			var mismaVista=formulario.varToInt("B_MISMA_VISTA");
			try {
				// Se crea el objeto búsqueda
				var bus = new VQuery(listControl.root());
				bus.setQuery(busquedas[indexBusqueda].idRef());
				// Se ejecuta la búsqueda y los registros encontrados se añaden a la salida
				if (bus.exec())	{
					// En función del modo rebuscar seleccionado hacemos la operación con el resultado de la búsqueda y la lista entrante
					if (modoRebuscar==0) 
						registerList.cross(bus.result())
					else if (modoRebuscar==1)
						registerList.append(bus.result())
					else
						registerList.remove(bus.result());
				};
				// Si el resultado lo queremos en la misma lista
				if (mismaVista)
					listControl.setList(registerList)
				else
					// Si el resultado va en una vista nueva, utilizamos la misma lista de origen
					theMainWindow.addDataView(listControl.objectInfo().type(), listControl.objectInfo().idRef(), registerList);
			} catch(err) {
				alert(err);
			}

		}
	}
}

var listControl = getActiveListControl();
if (listControl!=null) {
	// Obtenemos la información de la lista
	var listControlInfo = listControl.objectInfo();
	// Solo se exporta si es un control de lista
	if (listControlInfo.outputType() == VObjectInfo.IOList) {
		var registerList=cloneList(listControl);
		rebuscar(listControl, registerList);
	} else
		alert("Esta funcionalidad es válida sólo para listas de registros.");
} else 
	alert("Esta funcionalidad es válida sólo para listas de registros.");