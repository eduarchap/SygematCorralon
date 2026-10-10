// Se busca si el objeto recibido está en una vista, si es así se activa.

// Por defecto la vista no está activa
theRoot.setVar( "VIS_ACT", false );

// Si estamos en modo SDI se cierran todas las vistas
if ( theMainWindow.bootMode() === VMainWindow.ModeSDI )
{
	theMainWindow.closeAllViews();
}

// Inicializamos las variables de trabajo
var numVistas   = theMainWindow.viewsCount();
var vista       = null;
var objeto      = theRoot;
var objetoInfo  = objeto.objectInfo();
var objetoIdRef = objetoInfo.idRef();
var objetoTipo  = objetoInfo.type();

// Se recorren todas las vistas centrales en busca del formulario
for ( var numVista = 0; numVista < numVistas; numVista++ )
{
	vista = theMainWindow.getViewAt( numVista );
	if ( vista )
	{
		vistaInfo = vista.centralWidget().objectInfo();
		if ( (vistaInfo.type() === objetoTipo ) && ( vistaInfo.idRef() === objetoIdRef ) )
		{
			// Como ya está abierta, se activa la vista y se finaliza la búsqueda
			theRoot.setVar( "VIS_ACT", true );
			theMainWindow.setCurrentView( vista );
			break;					
		}
	}
}