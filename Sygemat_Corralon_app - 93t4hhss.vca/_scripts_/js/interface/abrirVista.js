// ------------------------------------------
// Abrir vista de datos de ficha o lista
// ------------------------------------------

// ---------------------------------------------------------------
// Cargar los parámetros recibidos por variables globales
// ---------------------------------------------------------------
var objetoTipo  = theRoot.varToString("OBJ_TIP");
var objetoIdRef = theRoot.varToString("OBJ_ID_REF");
var id          = theRoot.varToString("REG_ID");
var idRef       = objetoIdRef.split("/");
var alias       = idRef[0];
var objetoId    = idRef[1];
var proyecto    = theApp.projectInfo(alias);
var objeto      = proyecto.objectInfo(objetoTipo, objetoId);
var titulo 		= objeto.name();
if (objeto.inputType() != VObjectInfo.IONone) {
	var tabla       = objeto.inputTable();
};

// Cargamos la lista o el registro según el tipo de entrada del objeto
switch (objeto.inputType()) 
{
	case VObjectInfo.IORecord:
		var registro = new VRegister(theRoot);
		registro.setTable(tabla.idRef());
	
		switch (objetoId)
		{
			case "AUX_C":
				registro.readRegister("CTA", [ id ], VRegister.SearchThis); 				
				break;
			
			default:
				registro.readRegister("ID", [ id ], VRegister.SearchThis);
		}

		// Verificar si la vista ya está visible y en ese caso se activa
		if (activarVista(objeto, registro) === false) {
			vista = theMainWindow.addDataView(objetoTipo, objetoIdRef, registro);
			vista.setTitle(titulo);
		}
		break;

	case VObjectInfo.IOList:
		var lista = new VRegisterList(theRoot);
		vista = theMainWindow.addDataView(objetoTipo, objetoIdRef, lista);
		vista.setTitle(titulo);
		break;

	case VObjectInfo.IONone:
		var vista = new VDataViewDialog(theRoot);
		vista.setDataView(objetoTipo, objetoIdRef);
		vista.exec();
		break;
}

// ----------------------------------------------------------------------------------
// Controla si el registro ya está abierto en este formulario, si es así lo activamos
// En caso contrario no hacemos nada y el formulario con el registro se abrirá
// ----------------------------------------------------------------------------------
function activarVista(objeto, registro) {

	// Variables
	var numVistas = theMainWindow.viewsCount(),
		vista,
		vistaIdRef,
		vistaTipo,
		vistaTabla,
		vistaIdRegistro,
		vistaRegistro,
		objetoInfo       = objeto,
		objetoIdRef      = objetoInfo.idRef(),
		objetoTipo       = objetoInfo.type(),
		objetoTabla      = objetoInfo.inputTable().idRef(),
		objetoIdRegistro = registro.fieldToString("ID"),
		existe 		     = false,
		index;
	
	// Recorrer las vistas	
	for (index = 0; index < numVistas; index++) {		
		// Leer la vista
		vista = theMainWindow.getViewAt(index);
		
		// Leemos la información del objeto contenido en la pestaña
		vistaInfo       = vista.centralWidget().objectInfo();
		vistaIdRef      = vistaInfo.idRef();
		vistaTipo       = vistaInfo.type();
		vistaTabla      = vistaInfo.inputTable().idRef();
		
		// Solo procesamos la vista si es de tipo formulario
		if (vistaTipo === VObjectInfo.TypeForm) {
		
			// Creamos un registro vacío de la tabla de la vista y lo leemos de la vista
			vistaRegistro   = new VRegister(theRoot);
			vista.centralWidget().getRegister(vistaRegistro);
			vistaIdRegistro = vistaRegistro.fieldToString("ID");
			
			// Comparar si ese objeto es el mismo que queremos abrir
			if ((vistaTipo === objetoTipo) && (vistaIdRef === objetoIdRef) && 
				(vistaTabla === objetoTabla) && (vistaIdRegistro === objetoIdRegistro)) {
			
				// Activar la vista
				theMainWindow.setCurrentView(vista);
			
				// Fijamos el retorno de la función a true = está activa
				existe = true;
			}
		}
	}
	
	// Retornamos si existe o no
	return existe;
}
