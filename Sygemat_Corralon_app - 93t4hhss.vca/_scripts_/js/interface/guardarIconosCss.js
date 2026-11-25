// Guardar iconos en disco para usarlos en las CSS
importClass( "VFile" );
importClass( "VImage" );

// Preparar variables de trabajo
var fichero = new VFile();
var icono   = new VImage();
var iconos  = [ "ABA", "ABA_BLA", "ARR", "ARR_BLA", "CRR", "DER", "DER_BLA", "FLT_ON", "FLT_OFF", "IZQ", "IZQ_BLA", "SIG", 
                "CHK_BTN_OFF", "CHK_BTN_OFF_DES", "CHK_BTN_OFF_FOC", "CHK_BTN_ON", "CHK_BTN_ON_DES", "CHK_BTN_ON_FOC",
			    "RAD_BTN_OFF", "RAD_BTN_OFF_DES", "RAD_BTN_OFF_FOC", "RAD_BTN_ON", "RAD_BTN_ON_DES", "RAD_BTN_ON_FOC", "CAL",
				"CHK_ON","CHK_OFF","SUP","SUP_BCO","ANA_PRE","ANA_PRE_NGO","GRD","GRD_NGO","SAL","SAL_BCO","CNF","CNF_NGO",
				"ALT","ALT_NGO","BAJ","BAJ_NGO","REN","REN_NGO","RET","RET_NGO","ENV","ENV_NGO","RED_CAN_PED","RED_CAN_PED_NGO",
				"DES_MER","DES_MER_NGO","DES_MER_INA","ASG_MER","ASG_MER_NGO","ASG_MER_INA","EXP_CEN_PRE_PED","EXP_CEN_PRE_PED_NGO",
				"GEN_FAC","GEN_FAC_NGO","CBO_ALM","CBO_ALM_NGO","CBO_FEC_ENT","CBO_FEC_ENT_NGO","MAS_DAT","MAS_DAT_NGO", "ADD", "ADD_NGO",
				"AUT_PRE","AUT_PRE_HOV","ACT_PRE","ACT_PRE_HOV","BTN_MEN","BTN_MEN_HOV","FIL","FIL_HOV","EDT_FCH","EDT_FCH_HOV",
				"HIS","HIS_HOV","VER_IMP","VER_IMP_HOV","ABA_OPC","ABA_OPC_HOV", "GEN_DEV", "GEN_DEV_HOV", "ICO_CAL_AMA", "ICO_CAL_NGO", "PRT",
				"PRT_HOV","VER_CUA","VER_CUA_HOV","SUB","SUB_HOV","COP","COP_HOV","PRE_VIS","PRE_VIS_HOV","IMP_INF","IMP_INF_HOV",
				"GUA","GUA_HOV","LUP_BUS", "LUP_BUS_HOV", "DOW" , "DOW_HOV", "CLC", "CLC_HOV", "NADA","ALT_LST","ALT_LST_HOV",
				"AFIP","AFIP_HOV", "MOD_PRE_REM", "MOD_PRE_REM_HOV", "GEN_REM", "GEN_REM_HOV","GEN_DOC","GEN_DOC_HOV","ENV_PRE",
				"ENV_PRE_HOV","PRT_PRE_REM","PRT_PRE_REM_HOV","ART_RUT","ART_RUT_HOV","GEN_REM_VER","GEN_REM_VER_HOV","PAD_ASG_NEG","PAD_ASG","PRN_P","PRN_HOV","DUP_P","DUP_HOV"];
var alias   = "sygemat_corralon_app/";
var senda   = theApp.clientCachePath();

// Verificamos si el icono ya existe en el directorio del cacherun, en caso contrario se crea
for ( var numIcono = 0; numIcono < iconos.length; numIcono++ )
{
	var fichero = new VFile( senda + iconos[ numIcono ] );
	if ( fichero.exists() === false )
	{
		icono.loadResource( alias + iconos[ numIcono ]);
		icono.save( senda + iconos[ numIcono ] + ".png", "PNG");
	}
}
