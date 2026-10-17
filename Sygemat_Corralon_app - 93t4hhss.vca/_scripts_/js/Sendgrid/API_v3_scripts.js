/**
 * Summary.
 * Toma los parametros para enviar un correo en version 2
 * y los transforma para que sean compatibles con la version 3 del API
 * @since 2019.12.19
 *
 * @param {object} data Objeto con las opciones para el envio de mail en v2
 * @param {Array} attachments Array con una lista de paths para incluir como adjuntos ["/path_to/file.txt"]
 * @param {Array} images una lista de images [{cid: "file_name.txt"}]
 */
function buildV3params(data, attachments, images) {
	var params = {
		personalizations: (data.personalizations || buildPersonalizations(data)),
		subject:          data.subject,
		from: 			  buildTo(data.from, data.fromname)[0]
	},
	attachment, filePath, imagePath;
	
	if (data.template_id) {
		params.template_id = data.template_id;
	} else {
		params.content = [{type: "text/html", value: data.html}];
	}

	if ( data.reply_to ) { params.reply_to = {email: data.reply_to}; }

	if ( attachments ) {
		params.attachments = [];
		for (var i in attachments) {
			filePath   = attachments[i];
			attachment = attachmentFromFile(filePath, (images || {}));

			if ( attachment ) { params.attachments.push(attachment); }
		}
	}

	return params;
}

/**
 * Summary.
 * Obtiene el Cid de un archivo de la lista de imagenes.
 * @since 2019.12.19
 *
 * @param {string} fileName nombre del archivo
 * @param {*} images una lista de images [{cid: "file_name.txt"}]
 */
function getCid(fileName, images) {
	for (var i in images) {
		if ( images[i] == fileName ) {
			return i;
		}
	}
	return null;
}

/**
 * Summary.
 * Crea un objeto attachment tomando un path a un archivo
 * @since 2019.12.19
 *
 * @param {string} filePath Path al archivo
 * @param {Array} images una lista de images [{cid: "file_name.txt"}]
 */
function attachmentFromFile(filePath, images) {
	var file = fileToBase64(filePath),
		cid;

	if ( file.name !== "empty" ) {
		cid = getCid(file.name, images);
		return({
		  "content":     file.array,
		  "content_id":  (cid || "ii_" + Date.now().toString()),
		  "disposition": "attachment",
		  "filename":    file.name,
		  "name":        file.name.split(".")[0],
		  "type": 		 file.extension
		});
	}

	return null;
}

/**
 * Summary.
 * Toma un path y obtiene su representación en Base 64
 * en conjunto con su nombre y extensión.
 * @since 2019.12.19
 *
 * @param {string} path Path al archivo
 * @return {object} Un objeto con metadata del archivo y su representación
 * en Base64
 */
function fileToBase64(path) {
	var isText = path.match(/\.(xml|json|csv|txt|html|html)$/) !== null,
		  fi     =  isText ? (new VTextFile(path)) : (new VFile(path)),
		  fileInfo;

	if ( fi.open( VFile.OpenModeReadOnly ) ) {
		if ( isText ) {
			fi.setCodec("UTF-8");
			fileInfo = {name:      fi.info().fileName(),
					    extension: fi.info().completeSuffix(),
					    array:     (fi.readAll()).toVByteArray().toBase64().toLatin1String() };
		} else {
			fileInfo = {name: 	   fi.info().fileName(),
						extension: fi.info().completeSuffix(),
						array:     fi.readAll().toBase64().toLatin1String() };
		}

		fi.close();
	} else {
		var emptyArray = new VByteArray();
		fileInfo = {name: "empty",
					extension: "",
					array: emptyArray.toBase64().toLatin1String() };
	}

	return(fileInfo);
}

/**
 * Summary.
 * Toma los destinatarios y los convierte en una lista
 * en objectos de personalizaciones
 * @since 2019.12.19
 *
 * @param {object} data Objeto con las opciones para el envio de mail en v2
 * @return {object} un objecto personalization que concuerda con la especificación de la version 3
 */
function buildPersonalizations(data) {
	var personalization = {
		to: buildTo(data.to, data.toname)
	};

	if (data.cc)  { personalization.cc =  buildTo(data.cc, data.ccname); }
	if (data.bcc) { personalization.bcc =  buildTo(data.bcc, data.bccname); }
	
	if ( data.dynamic_template_data ) {
		personalization.dynamic_template_data = data.dynamic_template_data;
	}

	return [personalization];
}

/**
 * Summary.
 * Toma destinatarios y nombres de destinatarios y los convierte en objetos
 * compatibles con la version 3.
 * @since 2019.12.19
 *
 * @param {string/object} to un texto o array con los mails de destinatarios
 * @param {string/object} toname un texto o array de nombres de destinatarios
 */
function buildTo(to, toname) {
	var object = [],
		myto;

	if ( whatIsIt(to) === "String" ){
		myto = {email: to};
		if (toname) { myto.name = toname; }
		object.push(myto);
	} else if ( whatIsIt(to) === "Array" ) {
		_.each(to, function(i, index){
			myto = {email: i};
			if ( toname ) { myto.name = toname[index]; }
			object.push(myto);
		});
	}

	return object;
}