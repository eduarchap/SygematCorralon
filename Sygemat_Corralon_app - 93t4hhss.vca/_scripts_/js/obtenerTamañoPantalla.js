
var pantalla = theApp.screen();

theApp.setGlobalVar("sygemat_corralon_dat/ALT", pantalla.height());
theApp.setGlobalVar("sygemat_corralon_dat/ANC", pantalla.width());

theRoot.setVar("ANC_PAN" , theMainWindow.width());

if( JSON.stringify(theRoot.dataView()) != "null" ){
	theRoot.setVar("ANC_FOR" , theRoot.dataView().width );
}

