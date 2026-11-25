#include "(CurrentProject)/Documentos/ajax.js"
#include "(CurrentProject)/Documentos/General/jsSHA.js"
#include "(CurrentProject)/Documentos/WebServer/base64.js"
#include "(CurrentProject)/Documentos/General/xml_parser.js"
#include "(CurrentProject)/Documentos/AmazonS3/s3_utils.js"

importClass( "VProcess" );

// Custom params
var region       = "us-east-1", // región AWS por defecto 
	AccessKeyId  = theApp.globalVarToString("sygemat_corralon_dat/DOC_AWS_ACC_KEY_ID"),
	AccessSecret = theApp.globalVarToString("sygemat_corralon_dat/DOC_AWS_ACC_SEC"),
	acl          = theApp.globalVarToString("sygemat_corralon_dat/DOC_AWS_ACL");

// Base Params
var	today 		 = new Date(),
	dateString   = today.toISOString().split("T")[0].replace(/-/g, ""),
	expiration 	 = new Date(today.getTime() + 2000*60000),
	expiration   = expiration.toISOString().split(".")[0] + "000Z",
	max_filesize = 10 * 1024 * 1024,
	amzDate      = today.toISOString().split(".")[0].replace(/:/g, "").replace(/-/g, "") + "Z",
	emptyHash256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * Returns the signature of the given stringToSign parameter based on the aws authorization version 4
 * used on post uploads.
 * @constructor
 * @param {string} AccessSecret - The amazon access secret key
 * @param {string} dateString   - Date of the day in format ISO 8601.
 * @param {string} region       - The amazon region in wich this signature is valid
 * @param {string} stringToSign - The text that is going to be signed with the AccessSecret
 */
function getSignature(AccessSecret, dateString, region, stringToSign) {
	var DateKey 	  		 = getHMAC256("AWS4" + AccessSecret, dateString),
		DateRegionKey 		 = getHMAC256(DateKey, region, "HEX"),
		DateRegionServiceKey = getHMAC256(DateRegionKey, 's3', "HEX"),
		SigningKey 			 = getHMAC256(DateRegionServiceKey, "aws4_request", "HEX");

    return(getHMAC256(SigningKey,stringToSign, "HEX"));
}

/**
 * Returns URL encoded query string based on a JSON object
 * @constructor
 * @param {object} json - A json object to convert
 */
function jsonToCanonicalQueryString(json) {
	var params = [], i;
	for ( i in json ) {
		if ( whatIsIt(json[i]) == "Array" ) {
			var values = json[i],
				z      = values.length;
			for( x=0; x < z; x++ ) { params.push("" + i + "[]" + "=" + values[x]); }
		} else {
			params.push(encodeURIComponent(i)+ "=" + encodeURIComponent(json[i]));
		}
	}
	return params.length > 0 ? params.join("&") : "";
}

/**
 * Creates the value for an authentication header based on the authentication version 4 
 * from AWS, documentation and examples:
 *
 * https://docs.aws.amazon.com/es_es/AmazonS3/latest/API/sig-v4-header-based-auth.html
 * @constructor
 * @params {string} canonicalURI - The absolute path after the host and before de query string, exam: /path/to/file.txt
 * @params {object} data         - A JSON object that is going to be converted into a query string.
 * @params {object} BcanHeaders  - A JSON object that represents the headers to be included into the request.
 */
function getHeaderForRequest(canonicalURI, data, BcanHeaders, httpVerb, localRegion, bodyHash) {

	httpVerb         = httpVerb || "GET";
	localRegion		 = localRegion || region;
	bodyHash         = bodyHash || emptyHash256;
	// modificaciones para que se puedan subir ficheros con caractares no latinos
	// canonicalURI     = encodeURI(canonicalURI);

	var sortedKeys       = _.sortArray(BcanHeaders),
		canonicalHeaders = _.map(sortedKeys, function(key) { return(key + ":" + BcanHeaders[key]); }).join("\n"),
		signedHeaders    = sortedKeys.join(";"),
		canonicalQuerySt = jsonToCanonicalQueryString(data),
		canonicalRequest = httpVerb + "\n" + canonicalURI + "\n" + canonicalQuerySt + "\n" + canonicalHeaders + "\n\n" + signedHeaders + "\n" + bodyHash,
		stringToSign     = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + dateString + "/" + localRegion + "/s3/aws4_request" + "\n" + getSHA256(canonicalRequest),
		signature        = getSignature(AccessSecret, dateString, localRegion, stringToSign);

	return(["AWS4-HMAC-SHA256 ",
			("Credential=" + AccessKeyId + "/" + dateString + "/" + localRegion + "/s3/aws4_request"),
			(",SignedHeaders=" + signedHeaders),
			(",Signature=" + signature)].join(""));
}

/**
 * Gets the list of buckets that belongs to the Amazon account with the credentials.
 * @constructor
 * @param {string}   path     - The base path url like to get the files.
 * @param {function} callback - A function to be called with the result of the request.
 */
function getRootFiles(path, callback) {

	var	host         = "s3.amazonaws.com",
	    BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate},
		data         = {};

	$.ajax({
			type: "GET",
			url: "https://" + host + "/",
			headers: {
					"Authorization":        getHeaderForRequest("/", data, BcanHeaders),
					"Date":                 today.toUTCString(),
					"Host":                 host,
					"X-Amz-Content-Sha256": emptyHash256,
					"X-Amz-Date":           amzDate
			},
			data: data,
			success: function(data, http_status) {
						var jsonData = xml2JSON(data);

						if ( typeof(callback) == "function" ) {
							callback(jsonData);
						} else {

							var contents = jsonData.ListAllMyBucketsResult.Buckets.Bucket,
								entries  = contents;

							if (whatIsIt(contents) == "Array")  { entries = contents; }
							if (whatIsIt(contents) == "Object") { entries = [contents]; }
							addDataBuckets(entries);
						}
			},
			error: function(data, http_status) {
				  alert(http_status + "\n" + JSON.stringify(data));
			}
	});
}

/**
 * Inserts the initial records to show the available buckets as folders
 * @constructor
 * @param {object} entries - an Array with a list of json objects representing buckets
 */
function addDataBuckets(entries) {
	if ( theRoot.beginTrans("Añadir ficheros") ) {

		_.each(entries || [], function(file) {
			 var nFile = new VRegister(theRoot);

			 nFile.setTable("sygemat_corralon_dat/DOC_EXP_W");
			 nFile.setField("NAME", file.Name._text);
		     nFile.setField("TIP", "1");
			 nFile.setField("RUT", ("/" + file.Name._text));
			 nFile.setField("JSON", JSON.stringify(file));

			 nFile.addRegister();
			 nFile = null;
			 file  = null;
		});

		theRoot.commitTrans();
	} else { alert("No funciona al grabar la carpeta en tabla DOC_EXP_W"); }
}

/**
 * Gets the list of files and folders inside a bucket
 * @constructor
 * @param {string} bucket - bucket name to show content
*/
function getBucketContent(path, callback) {

	var bucket       = getBucketFromPath(path),
		host         = bucket + ".s3.amazonaws.com",
	    BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate},
		data         = {"list-type": 2};

	if ( getPrefixFromPath(path) !== "" ) { data.prefix = getPrefixFromPath(path) + "/"; }

	region = getBucketRegion(bucket) || region;

	$.ajax({
			type: "GET",
			url: "https://" + host + "/",
			headers: {
					"Authorization":        getHeaderForRequest("/", data, BcanHeaders),
					"Date":                 today.toUTCString(),
					"Host":                 host,
					"X-Amz-Content-Sha256": emptyHash256,
					"X-Amz-Date":           amzDate
			},
			data: data,
			success: function(data, http_status) {
						var jsonData = xml2JSON(data);

						if ( typeof(callback) == "function" ) {
							callback(jsonData.ListBucketResult.Contents, bucket);
						} else {
							var contents = jsonData.ListBucketResult.Contents,
								entries  = contents;

							if (whatIsIt(contents) == "Array") { entries = contents; }
							if (whatIsIt(contents) == "Object") { entries = [contents]; }

							addDataFiles(entries || [], path);
						}
			},
			error: function(data, http_status) {
				  alert(http_status + "\n" + JSON.stringify(data));
			}
	});
}

/**
 * Inserts the records to show the content of a bucket or a 'folder' that belongs to a bucket
 * @constructor
 * @param {object} entries     - An Array with a list objects representing files or folders.
 * @param {string} currentPath - The path of the currentFolder that is being explored.
 */
function addDataFiles(entries, currentPath) {
	if ( theRoot.beginTrans("Añadir ficheros") ) {
		var subFiles = [];

		// Just add the files first
		_.each(entries, function(file) {
			 var isFolder = file.Key._text.match(/\/$/),
				 fileName = isFolder ? file.Key._text.replace(/\/$/, "") : file.Key._text,
				 filePath = "/" + getBucketFromPath(currentPath) + "/" + fileName;

			 if ( belongsToCurrentFolder(currentPath, filePath) == false ) {
				 if (!isFolder) { subFiles.push(filePath); }
				 return;
			 }

			 var nFile    = new VRegister(theRoot);

			 nFile.setTable("sygemat_corralon_dat/DOC_EXP_W");
			 nFile.setField("NAME", getFilenameFromPath(fileName));
		     nFile.setField("TIP", "2");
			 nFile.setField("RUT", filePath);

			 if ( !isFolder ) {
				nFile.setField("TAM", parseInt(file.Size._text));
				nFile.setField("FCH", file.LastModified._text);
			 }

			 nFile.setField("JSON", JSON.stringify(file));
			 nFile.addRegister();
			 nFile = null;
			 file  = null;
		});

		// Get the list of folders that belongs to the currentPath and insert it
		_.each(getFoldersFromSubfiles(subFiles, currentPath), function(folderName) {
			 var nFile    = new VRegister(theRoot);

			 nFile.setTable("sygemat_corralon_dat/DOC_EXP_W");
			 nFile.setField("NAME", folderName);
		     nFile.setField("TIP", "1");
			 nFile.setField("RUT", currentPath + "/" + folderName);
			 nFile.addRegister();
			 nFile = null;
			 file  = null;
		});

		theRoot.commitTrans();
	} else { alert("No funciona al grabar los ficheros en tabla DOC_EXP_W"); }
}

/**
 * Inserts into the queue the list of files to be async downloaded
 * @constructor
 * @param {Array}  entries - The list of files to be downloaded.
 * @param {string} to      - Path so be used when the file gets downloaded.
 * @param {string} bucket  - Bucket of the folder to which the files belong.
 */
function entriesToQueue( entries, to, bucket, currentPath ) {
	_.each(entries, function(file) {
		var	addProcess = new VProcess(theRoot),
			isFolder   = file.Key._text.match(/\/$/),
			fileName   = isFolder ? file.Key._text.replace(/\/$/, "") : file.Key._text,
			filePath   = "/" + bucket + "/" + fileName;

		if ( belongsToCurrentFolder(currentPath, filePath) == false ) { return; }

		addProcess.setProcess("sygemat_corralon_app/ADD_COL");
		addProcess.setVar("RUT_DES", filePath);
		addProcess.setVar("NAME", fileName);
		addProcess.setVar("TO", to);
		addProcess.setVar("TIP", (isFolder ? "1" : "2"));
    	addProcess.setVar("PLA", "s3");

		if ( !isFolder ) {
			addProcess.setVar("TAM", parseInt(file.Size._text));
		}
		addProcess.exec();
	});
}

/**
 * Gets the AWS region for a bucket
 * This solution uses the default region for the API request, if gets null back the 
 * region its the same as the default region if not it brings the corresponding one.
 * @constructor	
 * @param {string} bucket - Tue name of the S3 bucket
 */
function getBucketRegion(bucket) {

	var host         = "s3.amazonaws.com",
		BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate},
		data         = {"location": ""},
		bucketRegion = null;

	$.ajax({
			type: "GET",
			url: "https://s3.amazonaws.com/" + bucket,
			headers: {
					"Authorization":        getHeaderForRequest("/" + bucket, data, BcanHeaders),
					"Date":                 today.toUTCString(),
					"Host":                 host,
					"X-Amz-Content-Sha256": emptyHash256,
					"X-Amz-Date":           amzDate
			},
			data: data,
			success: function(data, http_status) {
				  var jsonData = xml2JSON(data);
				  bucketRegion = jsonData.LocationConstraint._text || null;
			},
			error: function(data, http_status) {
				  alert("Error: \n" + http_status + "\n" + data);
			}
	});

	return bucketRegion || region;
}

/**
 * Downloads a selected file to a folder in the local disk
 * @param {string} path          - The full key /bucket/path_to_file.txt
 * @param {string} to            - The path on disc where the file should be written to
 * @param {string} file_name     - The name of the file once is downloaded
 */
function DownloadToFile( path, filename, to ) {

	if ( theApp.sysInfo().getOs() < 200 ) {
		to = to.match(/\\$/) ? to : ( to + "\\" );
	} else {
		to = to.match(/\/$/) ? to : ( to + "/" );
	}

	// 01/03/2020- modificaciones para que se puedan subir ficheros con caractares no latinos
	// var fileName       = path.split("/")[path.split("/").length - 1 ],
	
	var fullPath     = to + fileName,
		bucket       = getBucketFromPath(path),
        localRegion  = getBucketRegion(bucket),
		host         = bucket + ".s3.amazonaws.com",
	    BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate};
		path         = path.replace("/" + bucket, "");

	$.ajax({
		type: "GET",
		url : "https://" + host + path,
		headers: {
				"Authorization":        getHeaderForRequest(path, {}, BcanHeaders, "GET", localRegion),
				"Date":                 today.toUTCString(),
				"Host":                 host,
				"X-Amz-Content-Sha256": emptyHash256,
				"X-Amz-Date":           amzDate
		},
		responseType: "arraybuffer",
		timeout: (30 * 60),
		success: function(data, status) {

					var respuestaBA  = new VByteArray();
					respuestaBA  = data;
					var respuesta    = respuestaBA;

					var fi = new VFile( fullPath );
					if ( fi.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ) {
						fi.write(data);
						fi.close();
					}

		},
		error: function(data, code) {
					alert("Error: " + JSON.stringify(data.toLatin1String()));
					theApp.setGlobalVar("sygemat_corralon_dat/WOR", 0);
		}
	});
}

/**
 * Deletes a file from s3
 * @param {string} path - the URL of the file to be deleted
 */
function deleteFile(path) {
	if ( path == undefined ) { return; }

	var bucket       = getBucketFromPath(path),
        localRegion  = getBucketRegion(bucket),
		host         = bucket + ".s3.amazonaws.com",
	    BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate};
		path         = path.replace("/" + bucket, "");

	$.ajax({
		type: "DELETE",
		url : "https://" + host + path,
		headers: {
				"Authorization":        getHeaderForRequest(path, {}, BcanHeaders, "DELETE", localRegion),
				"Date":                 today.toUTCString(),
				"Host":                 host,
				"X-Amz-Content-Sha256": emptyHash256,
				"X-Amz-Date":           amzDate
		},
		success: function(data, http_status) {},
		error: function(data, http_status) {
			  alert("Error: \n" + http_status + "\n" + data);
		}
	});
}

/**
 * Copies an object from one location to another
 * @constructor
 * @param {string}   from_path  - Source file to be copied.
 * @param {string}   to_path    - Final destination of the file to be copied.
 * @param {function} callback   - Function to be called after the file was copied.
 */
function copy(from_path, to_path, callback) {
	if ( from_path == undefined || to_path == undefined ) { return; }

	var orgBucket    = getBucketFromPath(from_path),
	    destBucket   = getBucketFromPath(to_path),
        localRegion  = getBucketRegion(destBucket),
		host         = destBucket + ".s3.amazonaws.com",
	    BcanHeaders  = {"x-amz-content-sha256": emptyHash256,
						"host": 				host,
						"x-amz-date": 			amzDate,
						"x-amz-copy-source":    from_path
						},
		path         = to_path.replace("/" + destBucket, ""),
		errMsg       = "Los buckets de los archivos a copiar deben pertenecer a la misma region de Amazon";

	if (getBucketRegion(orgBucket) !== getBucketRegion(destBucket)) { alert(errMsg); return; }

	$.ajax({
		type: "PUT",
		url : "https://" + host + path,
		headers: {
				"Authorization":        getHeaderForRequest(path, {}, BcanHeaders, "PUT", localRegion),
				"Date":                 today.toUTCString(),
				"Host":                 host,
				"X-Amz-Content-Sha256": emptyHash256,
				"X-Amz-Date":           amzDate,
				"X-Amz-Copy-Source":    from_path
		},
		success: function(data, http_status) {
				if ( typeof(callback) == "function" ) {
					callback(from_path, to_path);
				}
		},
		error: function(data, http_status) {
			  alert("Error: \n" + http_status + "\n" + data);
		}
	});
}

/**
 * Moves an object from one location to another
 * @constructor
 * @param {string} from_path - Source file to be moved
 * @param {string} to_path   - Final destination of the file to be movied
 */
function move(from_path, to_path) {
	copy(from_path, to_path, deleteFile);
}

/**
 * Creates a URL that can be shared and grants limited access to the AWS file
 * Documenation and examples: 
 * https://docs.aws.amazon.com/es_es/AmazonS3/latest/API/sigv4-query-string-auth.html
 * @constructor
 * @params {string}  simpleURI  - A url to the file with a prefixed bucket, exam: /my_bucket/folder1/folder2/my_file.txt
 * @params {integer} expiration - Time in seconds in which the url is going to be valid. 
 */
function buildSignedUrl(simpleURI, expiration) {

	var httpVerb     	= "GET",
		bucket          = getBucketFromPath(simpleURI),
        region          = getBucketRegion(bucket);
        amzCred         = AccessKeyId + '/' + dateString + "/" + region + "/s3/aws4_request";

        simpleURI       = simpleURI.replace("/" + bucket, "");

	var canonicalURI 	= encodeURI(simpleURI),
		queryString  	= {"X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
						   "X-Amz-Credential":    amzCred,
						   "X-Amz-Date":          amzDate,
						   "X-Amz-Expires":       expiration || 86400, // 24 Hours
						   "X-Amz-SignedHeaders": "host",
						   },
		canonicalQuerySt = jsonToCanonicalQueryString(queryString),
		canonicalHeaders = "host:" + bucket + ".s3.amazonaws.com",
		signedHeaders    = "host";

	var canonicalRequest = httpVerb + "\n" + canonicalURI + "\n" + canonicalQuerySt + "\n" + canonicalHeaders + "\n\n" + signedHeaders + "\n" + "UNSIGNED-PAYLOAD",
   		stringToSign     = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + dateString + "/" + region + "/s3/aws4_request" + "\n" + getSHA256(canonicalRequest),
		signature        = getSignature(AccessSecret, dateString, region, stringToSign),
		url              = "https://" + bucket + ".s3.amazonaws.com" + simpleURI + "?" + jsonToCanonicalQueryString(queryString) + "&X-Amz-Signature=" + signature;

	return(url);
}

/**
 * Creates a bucket in the especified amazon s3 region
 * @constructor
 * @params {string} bucketName - The name of the new bucket.
 * @params {string} region     - Identifier of the Amazon s3 region for the bucket ejm: "us-east-1".
 */
function createBucket(bucketName, newRegion) {
	var host         = bucketName + ".s3.amazonaws.com",
		baseXML      = '<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>' + newRegion + '</LocationConstraint></CreateBucketConfiguration>',
	    xmlBody      = newRegion == region ? "" : baseXML,
		bodyHash     = getSHA256(xmlBody),
	    BcanHeaders  = {"host": 				host,
			            "x-amz-content-sha256": bodyHash,
						"x-amz-date": 			amzDate,
						"content-type":         "application/xml"},
		path         = "/";

	$.ajax({
		type: "PUT",
		url : "https://" + host + path,
		headers: {
				"Authorization":        getHeaderForRequest(path, {}, BcanHeaders, "PUT", region, bodyHash),
				"Content-Type":         "application/xml",
				"Date":                 today.toUTCString(),
				"Host":                 host,
				"X-Amz-Content-Sha256": bodyHash,
				"X-Amz-Date":           amzDate
		},
		success: function(data, http_status) {
				 alert("Directorio creado correctamente!");
		},
		body: xmlBody,
		error: function(data, http_status) {
				  if ( http_status == 409) {
					  alert("El nombre del bucket '" + bucketName + "', ya esta siendo usado por otra cuenta");
				  } else {
					  alert("Error: \n" + http_status + "\n" + data);
				  } 
		}
	});
}