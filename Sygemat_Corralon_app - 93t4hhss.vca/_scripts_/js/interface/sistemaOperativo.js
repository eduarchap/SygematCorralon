// Obtener el sistema operativo
infoSistema = theApp.sysInfo();
theApp.setGlobalVar("sygemat_corralon_dat/MOV_SO_COD", infoSistema.getOs());
theApp.setGlobalVar("sygemat_corralon_dat/MOV_SO_NOM", infoSistema.getOsString());
