importClass("VFile");
importClass("VTextFile");
importClass("VTableInfo");

// ============================================================
// LOGGING DE DIAGNOSTICO
// Escribe a consola (alert) y a un archivo en disco en cada
// checkpoint, para poder ver el ULTIMO paso alcanzado si el
// proceso se cuelga antes de terminar.
// ============================================================
var tStart = new Date().getTime();
var logLines = [];
var logFilePath = theRoot.varToString("SND") + "/GEN_PRO_debug.log";

function flushLog() {
    var lf = new VTextFile(logFilePath);
    lf.setCodec("UTF-8");
    if (lf.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
        lf.write(logLines.join("\r\n"));
        lf.flush();
        lf.close();
    }
}

// Escribe al archivo de log (sin alert/dialogo).
function logSilent(msg) {
    var elapsed = ((new Date().getTime() - tStart) / 1000).toFixed(1);
    var linea = "[" + elapsed + "s] " + msg;
    logLines.push(linea);
    flushLog();
}

// Alias para los milestones importantes (inicio, fin, error).
function log(msg) {
    logSilent(msg);
}

log("=== INICIO GEN_PRO.js ===");

var Array_produccion = theRoot.varToBool("ARRAY_PROD") ? 1 : 0;
log("Array_produccion=" + Array_produccion);

var tam = theApp.mainProjectInfo().allTableCount();
log("Total de tablas del KB (allTableCount)=" + tam);

var hayTrans = theRoot.existTrans();
var newTrans = null;
if (!hayTrans) {
    newTrans = theRoot.beginTrans("Escaneando tablas del sistema");
    log("Transaccion iniciada por este script (newTrans=true)");
} else {
    log("Ya existia una transaccion abierta (newTrans=false)");
}

try {

    theRoot.initProgressBar();
    log("ProgressBar inicializado");

    function buscarObjetoInfoDeIdRef(tipo, idRefTabla, subTipo, idRefIndice) {
        var cantidadObjetos = theApp.mainProjectInfo().allObjectCount(tipo);
        for (var i = 0; i < cantidadObjetos; i++) {
            var objetoInfo = theApp.mainProjectInfo().allObjectInfo(tipo, i);
            if (objetoInfo.idRef() == idRefTabla) {
                for (var j = 0; j < objetoInfo.subObjectCount(subTipo); j++) {
                    let subObjetoInfo = objetoInfo.subObjectInfo(subTipo, j);
                    if (subObjetoInfo.id() == idRefIndice) {
                        return subObjetoInfo.propertyData(1);
                    }
                }
            }
        }
        return "";
    }

    function buscarIndice(tablaInfo) {
        var indicesCandidatos = [];
        for (var j = 0; j < tablaInfo.indexCount(); j++) {
            if (tablaInfo.indexType(j) == "3") {
                var condicionIndexar = buscarObjetoInfoDeIdRef(VObjectInfo.TypeTable, tablaInfo.idRef(), VObjectInfo.TypeIndex, tablaInfo.indexId(j));
                if (condicionIndexar == "") {
                    indicesCandidatos.push(tablaInfo.indexId(j));
                }
            }
        }
        if (indicesCandidatos.length == 0) {
            for (var j = 0; j < tablaInfo.indexCount(); j++) {
                if (tablaInfo.indexType(j) == "0") {
                    var condicionIndexar = buscarObjetoInfoDeIdRef(VObjectInfo.TypeTable, tablaInfo.idRef(), VObjectInfo.TypeIndex, tablaInfo.indexId(j));
                    if (condicionIndexar == "") {
                        indicesCandidatos.push(tablaInfo.indexId(j));
                    }
                }
            }
        }
        return indicesCandidatos.length == 0 ? "" : indicesCandidatos[0];
    }

    // Agregamos las tablas permitidas
    var tablasPermitidas;
    if (Array_produccion == 0) {
        tablasPermitidas = [
            "sygemat_corralon_dat/ALM_M", "sygemat_corralon_dat/APP_CFG_W", "sygemat_corralon_dat/ART_CLA_1_M", "sygemat_corralon_dat/ART_CLA_2_M", "sygemat_corralon_dat/ART_CLA_3_M", "sygemat_corralon_dat/ART_CLA_4_M", "sygemat_corralon_dat/ART_M",
            "sygemat_corralon_dat/AUX_C", "sygemat_corralon_dat/BCO_C",
            "sygemat_corralon_dat/CAN_VTA_M", "sygemat_corralon_dat/CJA_BCO_T", "sygemat_corralon_dat/CLA_1", "sygemat_corralon_dat/CLA_2", "sygemat_corralon_dat/CLA_3", "sygemat_corralon_dat/CLA_4", "sygemat_corralon_dat/CON_IVA_M",
            "sygemat_corralon_dat/CSS_W", "sygemat_corralon_dat/CTT_M", "sygemat_corralon_dat/DEP_T", "sygemat_corralon_dat/DIV_COT_M", "sygemat_corralon_dat/DIV_M", "sygemat_corralon_dat/DTL_FIC_PLA_IMP_D", "sygemat_corralon_dat/DTL_PLA_EXP_D",
            "sygemat_corralon_dat/DTL_PLA_IMP_D", "sygemat_corralon_dat/EJE_C", "sygemat_corralon_dat/EML_MIME_EXT_W", "sygemat_corralon_dat/EML_PLA_W", "sygemat_corralon_dat/EMP_M", "sygemat_corralon_dat/EMP_USR_M", "sygemat_corralon_dat/ENT_M",
            "sygemat_corralon_dat/EXT_EMP_M", "sygemat_corralon_dat/FLE_M", "sygemat_corralon_dat/FPG_M", "sygemat_corralon_dat/FPG_MPG_M",
            "sygemat_corralon_dat/HOR_ENT_FLE", "sygemat_corralon_dat/IDI_M", "sygemat_corralon_dat/INF_DEF_W", "sygemat_corralon_dat/LIN_M", "sygemat_corralon_dat/LOC_M", "sygemat_corralon_dat/MAE_RET_GAN_M", "sygemat_corralon_dat/MAR_M",
            "sygemat_corralon_dat/MAR_TAR_T", "sygemat_corralon_dat/MON_M", "sygemat_corralon_dat/MPG_ECO_T",
            "sygemat_corralon_dat/MPG_T", "sygemat_corralon_dat/PAI_M", "sygemat_corralon_dat/PGC_C", "sygemat_corralon_dat/PLA_ASI_C", "sygemat_corralon_dat/PLA_EXP_D", "sygemat_corralon_dat/PLA_IMP_D", "sygemat_corralon_dat/PRM_DIC_W",
            "sygemat_corralon_dat/PRM_W", "sygemat_corralon_dat/PRO_M", "sygemat_corralon_dat/PRS_MEN_W", "sygemat_corralon_dat/PRS_OBJ_W", "sygemat_corralon_dat/REL_TIP_M", "sygemat_corralon_dat/SER_CNC_M", "sygemat_corralon_dat/SER_M",
            "sygemat_corralon_dat/TAB_GEN", "sygemat_corralon_dat/TEM_W", "sygemat_corralon_dat/TIP_CLT_M", "sygemat_corralon_dat/TIP_ECO_M", "sygemat_corralon_dat/TIP_EGR_M", "sygemat_corralon_dat/TIP_ING_M", "sygemat_corralon_dat/TIP_NOT_CRE_M",
            "sygemat_corralon_dat/TIP_PER_M", "sygemat_corralon_dat/TIP_RET_M", "sygemat_corralon_dat/USR_GRP_PRS", "sygemat_corralon_dat/USR_GRP_PRS_MEN", "sygemat_corralon_dat/USR_GRP_INF",
            "sygemat_corralon_dat/UND_MED_M", "sygemat_corralon_dat/USR_GRP_M", "sygemat_corralon_dat/USR_GRP_USR_M", "sygemat_corralon_dat/USR_M", "sygemat_corralon_dat/USR_VAR_W", "sygemat_corralon_dat/VTA_TAR_G", "vFactElectDB/AFIP",
            "vFactElectDB/MOD_XML", "vFactElectDB/OPC_FACVT_XML",
            "vFactElectDB/PTO_VTA", "vFactElectDB/TIP_CBTE", "vFactElectDB/TIP_DOC", "vFactElectDB/TIP_MON", "vFactElectDB/TRBTO_FACVT_XML", "vFactElectDB/WS", "sygemat_corralon_dat/CCO_C"
        ];
    }
    else if (Array_produccion == 1) {
        tablasPermitidas = [
            "sygemat_corralon_dat/ALM_M", "sygemat_corralon_dat/APP_CFG_W", "sygemat_corralon_dat/AUX_C", "sygemat_corralon_dat/BCO_C", "sygemat_corralon_dat/CAN_VTA_M", "sygemat_corralon_dat/CJA_BCO_T", "sygemat_corralon_dat/CON_IVA_M",
            "sygemat_corralon_dat/CSS_W", "sygemat_corralon_dat/CTT_M", "sygemat_corralon_dat/DEP_T", "sygemat_corralon_dat/DIV_COT_M", "sygemat_corralon_dat/DIV_M", "sygemat_corralon_dat/DTL_FIC_PLA_IMP_D", "sygemat_corralon_dat/DTL_PLA_EXP_D",
            "sygemat_corralon_dat/DTL_PLA_IMP_D", "sygemat_corralon_dat/EJE_C", "sygemat_corralon_dat/EML_MIME_EXT_W", "sygemat_corralon_dat/EML_PLA_W", "sygemat_corralon_dat/EMP_M", "sygemat_corralon_dat/EMP_USR_M", "sygemat_corralon_dat/ENT_M",
            "sygemat_corralon_dat/EXT_EMP_M", "sygemat_corralon_dat/FLE_M", "sygemat_corralon_dat/FPG_M", "sygemat_corralon_dat/FPG_MPG_M", "sygemat_corralon_dat/HOR_ENT_FLE", "sygemat_corralon_dat/IDI_M", "sygemat_corralon_dat/INF_DEF_W",
            "sygemat_corralon_dat/MAE_RET_GAN_M", "sygemat_corralon_dat/MAR_TAR_T", "sygemat_corralon_dat/MON_M", "sygemat_corralon_dat/MPG_ECO_T", "sygemat_corralon_dat/MPG_T", "sygemat_corralon_dat/PAI_M", "sygemat_corralon_dat/PGC_C",
            "sygemat_corralon_dat/PLA_EXP_D", "sygemat_corralon_dat/PLA_IMP_D", "sygemat_corralon_dat/PRM_DIC_W", "sygemat_corralon_dat/PRM_W", "sygemat_corralon_dat/PRO_M", "sygemat_corralon_dat/PRS_MEN_W", "sygemat_corralon_dat/PRS_OBJ_W",
            "sygemat_corralon_dat/REL_TIP_M", "sygemat_corralon_dat/SER_CNC_M", "sygemat_corralon_dat/SER_M", "sygemat_corralon_dat/TEM_W", "sygemat_corralon_dat/TIP_CLT_M", "sygemat_corralon_dat/TIP_ECO_M", "sygemat_corralon_dat/TIP_EGR_M",
            "sygemat_corralon_dat/TIP_ING_M", "sygemat_corralon_dat/TIP_NOT_CRE_M", "sygemat_corralon_dat/TIP_PER_M", "sygemat_corralon_dat/TIP_RET_M", "sygemat_corralon_dat/UND_MED_M", "sygemat_corralon_dat/USR_GRP_M", "sygemat_corralon_dat/USR_GRP_USR_M",
            "sygemat_corralon_dat/USR_M", "sygemat_corralon_dat/USR_VAR_W", "sygemat_corralon_dat/VTA_TAR_G", "sygemat_corralon_dat/PER_EMP_M", "sygemat_corralon_dat/CAM_M",
            "sygemat_corralon_dat/USR_GRP_PRS", "sygemat_corralon_dat/USR_GRP_PRS_MEN", "sygemat_corralon_dat/USR_GRP_INF",
            "vFactElectDB/AFIP", "vFactElectDB/MOD_XML", "vFactElectDB/OPC_FACVT_XML", "vFactElectDB/PTO_VTA", "vFactElectDB/TIP_CBTE", "vFactElectDB/TIP_DOC",
            "vFactElectDB/TIP_MON", "vFactElectDB/TRBTO_FACVT_XML", "vFactElectDB/WS", "sygemat_corralon_dat/TIP_CLT_M", "sygemat_corralon_dat/CCO_C"
        ];
    }

    // ============================================================
    // Procesamos tablas permitidas (catalogacion en TAB_GEN)
    // ============================================================
    log("Iniciando catalogacion de tablas (loop 1/2). Total=" + tam);
    for (var i = 0; i < tam; i++) {
        var tablaInfo = theApp.mainProjectInfo().allTableInfo(i);
        var array_ini = 0;

        logSilent("[Loop1] (" + (i + 1) + "/" + tam + ") Procesando tabla: " + tablaInfo.idRef());

        // Filtro: solo procesar si la tabla esta en la lista
        if (tablasPermitidas.indexOf(tablaInfo.idRef()) >= 0) {
            array_ini = 1;
        }

        var indiceUtilizar = buscarIndice(tablaInfo);
        logSilent("[Loop1] (" + (i + 1) + "/" + tam + ") Indice elegido para " + tablaInfo.idRef() + ": '" + indiceUtilizar + "'");

        var listaExistente = new VRegisterList(theRoot);
        listaExistente.setTable("sygemat_corralon_dat/TAB_GEN");
        listaExistente.load("IDE", [tablaInfo.idRef()]);

        if (listaExistente.size() == 0) {
            var tipos = ["Maestra", "Histórica", "Submaestra", "Arbolada", "Maestro de extensión"];
            var tipo = tipos[tablaInfo.type()] || "Desconocida";

            var nuevoRegistro = new VRegister(theRoot);
            nuevoRegistro.setTable("sygemat_corralon_dat/TAB_GEN");
            nuevoRegistro.setField("IDE", tablaInfo.idRef());
            nuevoRegistro.setField("NOM", tablaInfo.name());
            nuevoRegistro.setField("TIP", tipo);
            nuevoRegistro.setField("RES_EN", tablaInfo.isInMemory() ? "Memoria" : "Disco");
            nuevoRegistro.setField("LOG_REG", tablaInfo.registerLength());
            nuevoRegistro.setField("NRO_CAM", tablaInfo.fieldCount());
            nuevoRegistro.setField("NRO_IND", tablaInfo.indexCount());
            nuevoRegistro.setField("IND_UTI", indiceUtilizar);
            if (array_ini == 1) {
                if (Array_produccion == 1) {
                    nuevoRegistro.setField("ARRAY_PRO", array_ini);
                }
                else if (Array_produccion == 0) {
                    nuevoRegistro.setField("ARRAY_INI", array_ini);
                }
            }
            nuevoRegistro.addRegister();
            logSilent("[Loop1] (" + (i + 1) + "/" + tam + ") Registro TAB_GEN creado para " + tablaInfo.idRef());
        } else {
            logSilent("[Loop1] (" + (i + 1) + "/" + tam + ") Ya existia registro TAB_GEN para " + tablaInfo.idRef() + " (se omite)");
        }

        theRoot.setProgress((i * 100) / tam);
    }
    log("Catalogacion de tablas completa (loop 1/2)");

    // ============================================================
    // Extraccion de datos de las tablas permitidas
    // ============================================================
    log("Cargando lista de tablas marcadas (ARRAY_INI/ARRAY_PRO)");
    var lista = new VRegisterList(theRoot);
    lista.setTable("sygemat_corralon_dat/TAB_GEN");
    if (Array_produccion == 1) {
        lista.load("ARRAY_PRO", []);
    }
    else if (Array_produccion == 0) {
        lista.load("ARRAY_INI", []);
    }
    log("Lista cargada. Cantidad de tablas a extraer=" + lista.size());

    var registrosFinales = [];

    log("Iniciando extraccion de datos (loop 2/2)");
    for (var i = 0; i < lista.size(); i++) {
        var registroTabla = lista.readAt(i);
        var idTabla = registroTabla.fieldToString("IDE");
        var indice = registroTabla.fieldToString("IND_UTI");
        var Array_ini = registroTabla.fieldToString("ARRAY_INI");

        logSilent("[Loop2] (" + (i + 1) + "/" + lista.size() + ") Cargando registros de tabla: " + idTabla + " (indice=" + indice + ")");

        var registros = new VRegisterList(theRoot);
        registros.setTable(idTabla);
        registros.load(indice, []);

        logSilent("[Loop2] (" + (i + 1) + "/" + lista.size() + ") Tabla " + idTabla + " cargada. Registros=" + registros.size() + ". Convirtiendo a JSON...");

        var operacion = registros.toJSON([]);

        logSilent("[Loop2] (" + (i + 1) + "/" + lista.size() + ") toJSON de " + idTabla + " completo. ok=" + operacion.ok + " cantidad=" + (operacion.json ? operacion.json.length : 0));

        if (operacion.ok && operacion.json.length > 0) {
            registrosFinales.push({
                "tabla": idTabla,
                "indice": indice,
                "json_data": operacion.json,
            });
        }
    }
    log("Extraccion de datos completa (loop 2/2). Tablas con datos=" + registrosFinales.length);

    if (registrosFinales.length > 0) {
        var rutaArchivo;
        if (Array_produccion == 1) {
            rutaArchivo = theRoot.varToString("SND") + "/Sygemat_Corralon_AllTables_Produccion.json";
        }
        else if (Array_produccion == 0) {
            rutaArchivo = theRoot.varToString("SND") + "/Sygemat_Corralon_AllTables.json";
        }

        log("Escribiendo archivo final: " + rutaArchivo);
        var fi = new VTextFile(rutaArchivo);
        fi.setCodec("UTF-8");

        if (fi.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
            fi.write(JSON.stringify(registrosFinales, null, 2));
            fi.flush();
            fi.close();
        }
        log("Archivo final escrito correctamente");

        log("Se generaron todos los datos en el archivo: " + theRoot.varToString("SND"));
    } else {
        log("No se generó ningún archivo, ya que no hay datos en las tablas.");
    }

    theRoot.endProgressBar();
    log("ProgressBar finalizado");

    if (newTrans) {
        theRoot.commitTrans();
        log("Transaccion confirmada (commitTrans)");
    }

    log("=== FIN GEN_PRO.js (OK) ===");

} catch (e) {
    var mensajeError = "ERROR: " + (e && e.message ? e.message : e);
    var stackError = (e && e.stack) ? (" | stack=" + e.stack) : "";
    log(mensajeError + stackError);

    try { theRoot.endProgressBar(); } catch (e2) { log("No se pudo cerrar el ProgressBar: " + e2); }

    if (newTrans) {
        try {
            theRoot.rollbackTrans();
            log("Transaccion revertida (rollbackTrans) por error");
        } catch (e3) {
            log("No se pudo hacer rollback de la transaccion: " + e3);
        }
    }

    log("=== FIN GEN_PRO.js (ERROR) ===");
}
