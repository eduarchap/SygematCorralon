// =============================================================================
// INSERTAR FACTURA DE COMPRA DESDE JSON
// =============================================================================

var jsonStr = theRoot.varToString("JSON_FAC");

if (!jsonStr || jsonStr.trim() === "") {
    theRoot.setVar("MSJ", "La variable JSON_FAC está vacía.\nAsigná el contenido del JSON antes de ejecutar el proceso.");
} else {

    jsonStr = jsonStr.replace(/^\uFEFF/, "").trim();

    var fac;
    try {
        fac = JSON.parse(jsonStr);
    } catch (e) {
        fac = null;
        var preview = jsonStr.substring(0, 120);
        var codes = "";
        for (var ci = 0; ci < Math.min(jsonStr.length, 5); ci++) {
            codes += "[" + jsonStr.charCodeAt(ci) + "]";
        }
        theRoot.setVar("MSJ", "Error al parsear el JSON:\n" + e.message +
              "\n\nPrimeros caracteres (códigos): " + codes +
              "\n\nPreview:\n" + preview);
    }

    if (fac) {

        // Ahora (BIEN — pasa el string ISO directo)
			function parseDate(str) {
				return str || "";
			}

        function tipImpDesdeNombre(nombre) {
            var n = nombre.toUpperCase();
            if (n.indexOf("IIBB")     >= 0) return 4;
            if (n.indexOf("IVA")      >= 0) return 1;
            if (n.indexOf("GANANCIA") >= 0) return 2;
            if (n.indexOf("SUSS")     >= 0) return 3;
            return 1;
        }

        function provinciaDesdeNombre(nombre) {
            if (nombre.toUpperCase().indexOf("IIBB ") === 0) {
                return nombre.substring(5).trim();
            }
            return "";
        }

        function buscarProvincia(root, nomProv) {
            if (!nomProv || nomProv === "") return -1;
            var buscar = nomProv.toUpperCase();
            var MAX = 999;
            var reg = new VRegister(root);
            reg.setTable("sygemat_corralon_dat/PRO_M");
            var c = 0, hay = reg.readFirstRegister("NAME");
            while (hay && c < MAX) {
                c++;
                if (reg.fieldToString("NAME").toUpperCase() === buscar) return reg.fieldToInt("ID");
                hay = reg.readNextRegister("NAME");
            }
            c = 0; hay = reg.readFirstRegister("NAME");
            while (hay && c < MAX) {
                c++;
                var n = reg.fieldToString("NAME").toUpperCase();
                if (n.indexOf(buscar) >= 0 || buscar.indexOf(n) >= 0) return reg.fieldToInt("ID");
                hay = reg.readNextRegister("NAME");
            }
            return -1;
        }

        // Normaliza tildes a su base ASCII. \uFFFD (carácter de reemplazo que
        // aparece cuando el PDF no puede codificar una tilde) se convierte en "?"
        // para actuar como comodín de un carácter en coincideNombre().
        function normalizarNombre(str) {
            var desde = "áàäâãéèëêíìïîóòöôõúùüûñÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ";
            var hacia  = "aaaaaeeeeiiiiooooouuuunAAAAAEEEEIIIIOOOOOUUUUN";
            var result = "";
            for (var i = 0; i < str.length; i++) {
                var ch  = str.charAt(i);
                var pos = desde.indexOf(ch);
                if (pos >= 0)        result += hacia.charAt(pos);
                else if (ch === "\uFFFD") result += "?";   // comodín
                else                 result += ch;
            }
            return result.toUpperCase();
        }

        // Compara dos nombres tolerando \uFFFD en lugar de tildes.
        // Si alguno tiene "?" (comodín) y los largos coinciden, compara
        // carácter a carácter saltando las posiciones con "?".
        function coincideNombre(a, b) {
            var na = normalizarNombre(a);
            var nb = normalizarNombre(b);
            if (na === nb) return true;
            if (na.length !== nb.length) return false;
            for (var i = 0; i < na.length; i++) {
                if (na.charAt(i) === "?" || nb.charAt(i) === "?") continue;
                if (na.charAt(i) !== nb.charAt(i)) return false;
            }
            return true;
        }

        function buscarTipPer(root, nombre) {
			alert("nombre: " + nombre);
            var reg = new VRegister(root);
            reg.setTable("sygemat_corralon_dat/TIP_PER_M");
            if (reg.readRegister("NAME", [nombre], VRegister.SearchThis)) {
                if (coincideNombre(reg.fieldToString("NAME"), nombre)) return reg.fieldToInt("ID");
            }
            var reg2 = new VRegister(root);
            reg2.setTable("sygemat_corralon_dat/TIP_PER_M");
            var MAX = 500, c = 0;
            var hay = reg2.readFirstRegister("ID");
            while (hay && c < MAX) {
                c++;
                if (coincideNombre(reg2.fieldToString("NAME"), nombre)) return reg2.fieldToInt("ID");
                hay = reg2.readNextRegister("ID");
            }
            return -1;
        }

        // TIP_CBTE_ARG almacena el código AFIP directamente (no un ID de tabla)
        var MAP_TIP_CBTE = {
            "FACTURA A":                                                   1,
            "NOTA DE DEBITO A":                                            2,
            "NOTA DE DÉBITO A":                                            2,
            "NOTA DE CREDITO A":                                           3,
            "NOTA DE CRÉDITO A":                                           3,
            "RECIBOS A":                                                   4,
            "NOTAS DE VENTA AL CONTADO A":                                 5,
            "FACTURA B":                                                   6,
            "NOTA DE DEBITO B":                                            7,
            "NOTA DE DÉBITO B":                                            7,
            "NOTA DE CREDITO B":                                           8,
            "NOTA DE CRÉDITO B":                                           8,
            "RECIBOS B":                                                   9,
            "NOTAS DE VENTA AL CONTADO B":                                10,
            "FACTURA C":                                                  11,
            "NOTA DE DEBITO C":                                           12,
            "NOTA DE DÉBITO C":                                           12,
            "NOTA DE CREDITO C":                                          13,
            "NOTA DE CRÉDITO C":                                          13,
            "RECIBOS C":                                                  15,
            "FACTURAS DE EXPORTACION":                                    19,
            "FACTURAS DE EXPORTACIÓN":                                    19,
            "NOTA DE DÉBITO POR OPERACIONES CON EL EXTERIOR":             20,
            "NOTA DE DEBITO POR OPERACIONES CON EL EXTERIOR":             20,
            "NOTA DE CRÉDITO POR OPERACIONES CON EL EXTERIOR":            21,
            "NOTA DE CREDITO POR OPERACIONES CON EL EXTERIOR":            21,
            "CBTES. A DEL ANEXO I, APARTADO A,INC.F),R.G.NRO. 1415":     34,
            "CBTES. B DEL ANEXO I,APARTADO A,INC. F),R.G. NRO. 1415":    35,
            "OTROS COMPROBANTES A QUE CUMPLAN CON R.G.NRO. 1415":        39,
            "OTROS COMPROBANTES B QUE CUMPLAN CON R.G.NRO. 1415":        40,
            "COMPROBANTE DE COMPRA DE BIENES USADOS A CONSUMIDOR FINAL":  49,
            "FACTURA M":                                                  51,
            "NOTA DE DÉBITO M":                                           52,
            "NOTA DE DEBITO M":                                           52,
            "NOTA DE CRÉDITO M":                                          53,
            "NOTA DE CREDITO M":                                          53,
            "RECIBO M":                                                   54,
            "CTA DE VTA Y LIQUIDO PROD. A":                               60,
            "CTA DE VTA Y LIQUIDO PROD. B":                               61,
            "LIQUIDACION A":                                              63,
            "LIQUIDACIÓN A":                                              63,
            "LIQUIDACION B":                                              64,
            "LIQUIDACIÓN B":                                              64,
            "REMITO ELECTRÓNICO":                                         88,
            "REMITO ELECTRONICO":                                         88,
            "RESUMEN DE DATOS":                                           89,
            "FACTURA DE CRÉDITO ELECTRÓNICA MIPYMES (FCE) A":           201,
            "FACTURA DE CREDITO ELECTRONICA MIPYMES (FCE) A":           201,
            "NOTA DE CRÉDITO ELECTRÓNICA MIPYMES (FCE) A":              203,
            "NOTA DE CREDITO ELECTRONICA MIPYMES (FCE) A":              203
        };

        function codigoTipCbte(nombreComprobante) {
            if (!nombreComprobante || nombreComprobante.trim() === "") return -1;
            var cod = MAP_TIP_CBTE[nombreComprobante.trim().toUpperCase()];
            return (cod !== undefined) ? cod : -1;
        }

        // -----------------------------------------------------------------------
        // 1. VALIDACIONES PREVIAS (sin tocar la base de datos)
        // -----------------------------------------------------------------------

        // 1a. Buscar proveedor
        function normalizarCuit(cuit) {
            return cuit.replace(/-/g, "");
        }

        var cuitNormalizado = normalizarCuit(fac.proveedorCodigo);
        var idProveedor = -1;

        var regPrv = new VRegister(theRoot);
        regPrv.setTable("sygemat_corralon_dat/ENT_M");
        if (regPrv.readRegister("CIF_PRV", [cuitNormalizado], VRegister.SearchThis)) {
            if (normalizarCuit(regPrv.fieldToString("CIF")) === cuitNormalizado) {
                idProveedor = regPrv.fieldToInt("ID");
            }
        }

        if (idProveedor < 0) {
            theRoot.setVar("MSJ", "No se encontró el proveedor con CUIT '" + fac.proveedorCodigo + "'.\n" +
                  "Verificá que el proveedor esté dado de alta.");
        } else {

        // 1b. Resolver tipo de comprobante
        var codTipCbte = -1;
        if (fac.tipoComprobante && fac.tipoComprobante.trim() !== "") {
            codTipCbte = codigoTipCbte(fac.tipoComprobante);
            if (codTipCbte < 0) {
                theRoot.setVar("MSJ", "Tipo de comprobante desconocido: '" + fac.tipoComprobante + "'.\n" +
                      "No se realizó ningún cambio.");
            }
        }

        if (fac.tipoComprobante && fac.tipoComprobante.trim() !== "" && codTipCbte < 0) {
            // ya se informó — no continuar

        } else {

        // 1c. Verificar que todas las percepciones existen
        var percepciones = fac.percepciones || [];
        var percepcionesNoEncontradas = [];
        var idsTipPer = [];

        for (var i = 0; i < percepciones.length; i++) {
            var idTip = buscarTipPer(theRoot, percepciones[i].tipo);
            if (idTip < 0) {
                percepcionesNoEncontradas.push(percepciones[i].tipo);
            }
            idsTipPer.push(idTip);
        }

        if (percepcionesNoEncontradas.length > 0) {
            theRoot.setVar("MSJ", "No se encontraron los siguientes tipos de percepción:\n\n" +
                  "  - " + percepcionesNoEncontradas.join("\n  - ") + "\n\n" +
                  "Dálos de alta manualmente en TIP_PER_M y volvé a importar.\n" +
                  "No se realizó ningún cambio en la base de datos.");
        } else {

        // -----------------------------------------------------------------------
        // 2. VERIFICAR DUPLICADO
        // -----------------------------------------------------------------------
        var yaExiste = false;
        var regCheck = new VRegister(theRoot);
        regCheck.setTable("sygemat_corralon_dat/COM_FAC_G");
        var MAX_CHECK = 99999, cc = 0;
        var hayCheck = regCheck.readFirstRegister("ID");
        while (hayCheck && cc < MAX_CHECK) {
            cc++;
            if (regCheck.fieldToInt("PRV")               === idProveedor       &&
                regCheck.fieldToString("NUM_DOC_CON")     === fac.numeroFactura &&
                regCheck.fieldToString("NUM_DOC_PTO_VTA") === fac.puntoDeVenta) {
                yaExiste = true;
                break;
            }
            hayCheck = regCheck.readNextRegister("ID");
        }

        if (yaExiste) {
			theRoot.setVar("MSJ", "La factura " + fac.puntoDeVenta + "-" + fac.numeroFactura +
                  " del proveedor " + fac.proveedorCodigo + " ya existe en el sistema.\n" +
                  "No se realizaron cambios.");
        } else {

        // -----------------------------------------------------------------------
        // 3. TRANSACCIÓN
        // -----------------------------------------------------------------------
        var hayTrans = theRoot.existTrans();
        if (!hayTrans) {
            theRoot.beginTrans("Importar factura compra " + fac.puntoDeVenta + "-" + fac.numeroFactura);
        }

        // -----------------------------------------------------------------------
        // 4. CABECERA COM_FAC_G
        // -----------------------------------------------------------------------
        var regFac = new VRegister(theRoot);
        regFac.setTable("sygemat_corralon_dat/COM_FAC_G", true);
        regFac.setField("EMP_DIV",         theRoot.varToString("EMP_DIV"));
        regFac.setField("NUM_DOC_PTO_VTA", fac.puntoDeVenta);
        regFac.setField("NUM_DOC_CON",     fac.numeroFactura);
        regFac.setField("FCH",             parseDate(fac.fechaEmision));
        regFac.setField("FCH_VTO",         parseDate(fac.fechaVencimiento));
        regFac.setField("FCH_IMP_SUB_DIA", parseDate(fac.fechaContable));
        regFac.setField("PRV",             idProveedor);
        regFac.setField("BAS_GEN_MAN",     fac.netoGravado);
        regFac.setField("BAS_RED_MAN",     fac.base105);
        regFac.setField("BAS_ADI_1_MAN",   fac.base27);
        regFac.setField("BAS_ADI_2_MAN",   fac.base5);
        regFac.setField("BAS_EXE_MAN",     fac.baseExenta);
        regFac.setField("TOT_FAC_MAN",     fac.totalFactura);

        // Código AFIP directo — no requiere lookup en tabla externa
        if (codTipCbte > 0) {
            regFac.setField("TIP_CBTE_ARG", codTipCbte);
        }

        if (!regFac.addRegister()) {
            if (!hayTrans) theRoot.rollbackTrans();
			theRoot.setVar("MSJ", "Error al insertar factura:\n" + regFac.errorMessage());
        } else {

            var idFactura = regFac.fieldToInt("ID");
            var errores   = [];

            // ---------------------------------------------------------------
            // 5. PERCEPCIONES PER_COM_G
            // ---------------------------------------------------------------
            for (var j = 0; j < percepciones.length; j++) {
                var regPer = new VRegister(theRoot);
                regPer.setTable("sygemat_corralon_dat/PER_COM_G");
                regPer.setField("COM_FAC", idFactura);
                regPer.setField("TIP_PER", idsTipPer[j]);
                regPer.setField("MNT",     percepciones[j].monto);

                if (!regPer.addRegister()) {
                    errores.push("PER_COM_G '" + percepciones[j].tipo + "': " + regPer.errorMessage());
                }
            }

            // ---------------------------------------------------------------
            // 6. COMMIT / ROLLBACK
            // ---------------------------------------------------------------
            if (errores.length > 0) {
                if (!hayTrans) theRoot.rollbackTrans();
					
                theRoot.setVar("MSJ", "Transacción revertida.\n\n" + errores.join("\n"));
            } else {
                if (!hayTrans) theRoot.commitTrans();

                var msg = "✓ Factura importada correctamente\n\n" +
                          "  ID           : " + idFactura + "\n" +
                          "  Comprobante  : " + fac.puntoDeVenta + "-" + fac.numeroFactura + "\n" +
                          "  Tipo         : " + (fac.tipoComprobante || "(no especificado)") + "\n" +
                          "  Proveedor    : " + fac.proveedorCodigo + "\n" +
                          "  Neto gravado : $ " + fac.netoGravado + "\n" +
                          "  Total        : $ " + fac.totalFactura + "\n" +
                          "  Percepciones : " + percepciones.length;
				theRoot.setVar("COM_FAC_ID", parseInt(idFactura, 10));
                theRoot.setVar("MSJ", msg);
            }
        }
        } // fin else (no duplicado)
        } // fin else (percepciones OK)
        } // fin else (tipoComprobante OK o no viene)
        } // fin else (proveedor encontrado)
    }
}
