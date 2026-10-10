// -----------------------------------
// Control de rotación del dispositivo
// -----------------------------------
var pantalla = theApp.screen();
theApp.setGlobalVar("sygemat_corralon_dat/PAN_PIX_RAT", pantalla.devicePixelRatio());

theApp.setGlobalVar("sygemat_corralon_dat/MOV_ALT", pantalla.virtualHeight());
theApp.setGlobalVar("sygemat_corralon_dat/MOV_ANC", pantalla.virtualWidth());
theApp.setGlobalVar("sygemat_corralon_dat/MOV_HOR", theMainWindow.width() > theMainWindow.height());

