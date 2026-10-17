// ------------------------------------------------------------
// Mostrar una lista de registros en una nueva pestaña
// ------------------------------------------------------------

// Cargar los parámetros recibidos por variables locales
var titulo 		= theRoot.varToString("TIT");
var objetoTipo  = theRoot.varToString("OBJ_TIP");
var objetoIdRef = theRoot.varToString("OBJ_ID_REF");
var cestaIdRef  = theRoot.varToString("CES_ID_REF");

// Cargamos la lista de la cesta
var lista = new VRegisterList(theRoot);
theApp.getBasket(cestaIdRef, lista);

// Crear nueva pestaña con el título y el objeto mostrando los registros recibidos
var vista = theMainWindow.addDataView(objetoTipo, objetoIdRef, lista);
vista.setTitle(titulo);
