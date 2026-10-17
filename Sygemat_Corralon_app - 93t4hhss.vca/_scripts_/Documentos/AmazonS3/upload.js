#include "(CurrentProject)/Documentos/Amazons3.js"

/**
 * This code implements a browser simulation of a direct browser upload to Amazon S3
 * and implements the signature and policy based on version 4 authentication,
 * Documentation https://docs.aws.amazon.com/es_es/AmazonS3/latest/API/sigv4-post-example.html
**/

// Needed vars
pathToFile    = theRoot.varToString("FRO_PAT");
currentFolder = theRoot.varToString("TO_PAT");
acl           = theRoot.varToString("ACL");
bucket        = getBucketFromPath(currentFolder);
region        = getBucketRegion(bucket);
key           = currentFolder.replace("/" + bucket, "") == "" ? "" : (currentFolder.replace("/" + bucket +  "/", "") + "/");
amzCred       = AccessKeyId + '/' + dateString + "/" + region + "/s3/aws4_request";
 
var stringToSign = getStringToSign(expiration, bucket, key, acl, amzCred, dateString),
    signature    = getSignature(AccessSecret, dateString, region, stringToSign);
  
uploadFile(bucket, key, acl, amzCred, dateString, stringToSign, signature, pathToFile);

/**
 * Gets the Base64 encoded policy for the upload
 * @constructor
 * @param {string} expiration - The number of seconds during wich the signature si valid
 * @param {string} bucket     - Name of the bucket
 * @param {string} key        - the starts with parameter in wich will be matched against the url
 * @param {string} amzCred    - Amazon url like for the request
 * @param {string} dateString - date of the day in format ISO 8601
 */
function getStringToSign(expiration, bucket, key, acl, amzCred, dateString) {
	return(Base64.encode(JSON.stringify({
	  "expiration": expiration,
	  "conditions": [
		{"bucket": bucket},
		["starts-with", "$key", key],
		{"acl": acl},
		{"x-amz-meta-uuid": "14365123651274"},
		{"x-amz-server-side-encryption": "AES256"},
		["starts-with", "$x-amz-meta-tag", ""],
		{"x-amz-credential": amzCred},
		{"x-amz-algorithm": "AWS4-HMAC-SHA256"},
		{"x-amz-date": dateString + "T000000Z" }
	  ]
	})));
}

/**
 * Uploads a file to an specific amazon bucket
 * @constructor
 * @param {string} bucket       - Name of the bucket.
 * @param {string} key          - Path that is going to be append to the filename.
 * @param {string} acl          - indicates if the file to be uploaded is going to be public or privated.
 * @param {string} amzCred      - amazon url like for the request.
 * @param {string} dateString   - date of the day in format ISO 8601.
 * @param {string} stringToSign - The Base64 encoded policy for the upload.
 * @param {string} signature    - the SHA256 signature for the stringToSign.
 * @param {string} pathToFile   - Location of file that's going to be uploaded.
 */
function uploadFile(bucket, key, acl, amzCred, dateString, stringToSign, signature, pathToFile) {
	$.ajax({
	  type: "POST",
	  url: 	"https://" + bucket + ".s3.amazonaws.com",
	  data: {
			"key": (key + "${filename}"),
			"acl": acl,
			"x-amz-meta-uuid": "14365123651274",
			"x-amz-server-side-encryption": "AES256",
			"X-Amz-Credential": amzCred,
			"X-Amz-Algorithm": "AWS4-HMAC-SHA256",
			"X-Amz-Date": dateString + "T000000Z",
			"x-amz-meta-tag": "",
			"Policy": stringToSign,
			"X-Amz-Signature": signature,
			"file": {type: "file", path: pathToFile}
	  },
	  timeout: 5*60,
	  success: function(data, http_status) {	
			var simpleURI = currentFolder+"/"+getFilenameFromPath(pathToFile);
			theRoot.setVar("RETURN",buildLinkUrl(simpleURI, region));
	  },
	  error: function(data, http_status) {
			alert("Error: [uploadFile] "+http_status + "\n" + JSON.stringify(data))
	  }
	});	
}

/**
 * Creates a URL that can be shared and grants limited access to the AWS file
 * Documenation and examples: 
 * https://docs.aws.amazon.com/es_es/AmazonS3/latest/API/sigv4-query-string-auth.html
 * @constructor
 * @params {string}  simpleURI  - A url to the file with a prefixed bucket, exam: /my_bucket/folder1/folder2/my_file.txt
 * @params {integer} expiration - Time in seconds in which the url is going to be valid. 
 */
function buildLinkUrl(simpleURI, region, expiration) {

	var httpVerb     	= "GET",
		bucket          = getBucketFromPath(simpleURI),
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