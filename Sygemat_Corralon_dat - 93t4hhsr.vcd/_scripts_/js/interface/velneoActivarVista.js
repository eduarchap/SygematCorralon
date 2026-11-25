////////////////////////////////////////////////////////////
// Se busca en las vistas activas un objeto con un tipo y un idRef específico
// Si se encuentra se activa la pestaña y se devuelve true, en caso contrario se devuelve false
// Si estamos en modo SDI además se cierran el resto de pestañas (abiertas) que no estarán visibles
//
// Variables locales:
//     - OBJ_IDREF: IdRef del objeto.
//     - OBJ_TIPO: Tipo de objeto. 
//
//      - ACTIVADO: Se devuelve true si se ha encontrado el objeto en una vista y se ha activado.
//

// Si estamos en modo SDI se cierran todas las vistas
if ( theMainWindow.bootMode() == VMainWindow.ModeSDI )
	theMainWindow.closeAllViews();

var nNumVistas = theMainWindow.viewsCount();
var vista = null;
var szFormularioIdRef = "";
var bExisteTab = false;

// Se recorren todas las vistas centrales en busca del formulario
for ( nIndice = 0; nIndice < nNumVistas; nIndice++ )
{
	vista = theMainWindow.getViewAt( nIndice );	
	if ( vista )
	{
		formulario = vista.centralWidget().objectInfo();
		if ( formulario.type() == theRoot.varToString( "OBJ_TIPO" ) )
		{		
			if ( formulario.idRef() == theRoot.varToString( "OBJ_IDREF" ) )
			{
				bExisteTab = true;
				theMainWindow.setCurrentView( vista );
				
				/*// Si no estamos en modo SDI finalizamos el bucle de recorrer vistas
				if ( theMainWindow.bootMode() != VMainWindow.ModeSDI )*/
					break;
			}
		}
	}
}

// Se devuelve el booleano que indica si existía la pestaña y se ha activado o no
theRoot.setVar( "ACTIVADO", bExisteTab);