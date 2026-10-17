#include "(CurrentProject)/js/Sendgrid/ajax.js"
#include "(CurrentProject)/js/Sendgrid/API_v3_scripts.js"

function cleanHTML(html) {
	var asciiValue;
	var accents = [ 'à','á','â','ã','ä','å','æ','ç','è','é','ê','ë','ì','í','î','ï','ñ','ò','ó','ô','õ','ö','œ','ù','ú','û','ü','ý','ÿ',"Á","É","Í","Ó","Ú"],
		newHTML = _.reduce(accents, html, function(item, memo){
					asciiValue = "&#" + item.charCodeAt(0) + ";";
					return memo.replace(item, asciiValue);
				  });
	return(newHTML);
}

function validateOptions(options) {
	// validación parametro requeridos
	if ( options.to   	 === undefined ) { throw "parametro [to] no definido";      };
	if ( options.from 	 === undefined ) { throw "parametro [from] no definido";    };
	if ( options.subject === undefined && options.template_id == undefined ) { throw "parametro [subject] no definido"; };
	if ( options.text    === undefined && options.html === undefined && options.template_id === undefined ) { throw "Debes definir el parametro [text] o [html]"; };
	
	// Validación de tipos
	if ( whatIsIt(options.to)      === "String" || whatIsIt(options.to) == "Array" ) {} else { throw "El parametro [to] debe ser un string o un array"; };
	if ( whatIsIt(options.from)    === "String" ) {} else { throw "El parametro [from] debe un string"; };
	if ( options.template_id == undefined) {
		if ( whatIsIt(options.subject) === "String" ) {} else { throw "EL parametro subject debe ser un string"; };
	}
	
	// validacion de relacionados
	if (options.to !== undefined && options.toname !== undefined) {
		if ( whatIsIt(options.to) === "Array" && whatIsIt(options.toname) !== "Array" ) { throw "Si el parametro [to] es un Array, [toname] tambien debe de serlo"; }
		if ( whatIsIt(options.toname) === "Array" && whatIsIt(options.to) !== "Array" ) { throw "Si el parametro [toname] es un Array, [to] tambien debe de serlo"; }
	}
	
	if ( options.ccname !== undefined && options.cc === undefined ) { throw "Si el parametro [ccname] esta presente el parametro [cc] es obligatorio"; }
	
	if ( options.cc !== undefined && options.ccname !== undefined ) {
		if ( whatIsIt(options.cc) === "Array" && whatIsIt(options.ccname) !== "Array" ) { throw "Si el parametro [cc] es un Array, [ccname] tambien debe de serlo"; }
		if ( whatIsIt(options.ccname) === "Array" && whatIsIt(options.cc) !== "Array" ) { throw "Si el parametro [ccname] es un Array, [cc] tambien debe de serlo"; }	
	}
	
	if ( options.bccname !== undefined && options.bcc === undefined ) { throw "Si el parametro [bccname] esta presente el parametro [bcc] es obligatorio"; }
	
	if ( options.bcc !== undefined && options.bccname !== undefined ) {
		if ( whatIsIt(options.bcc) === "Array" && whatIsIt(options.bccname) !== "Array" ) { throw "Si el parametro [bcc] es un Array, [bccname] tambien debe de serlo"; }
		if ( whatIsIt(options.bccname) === "Array" && whatIsIt(options.bcc) !== "Array" ) { throw "Si el parametro [bccname] es un Array, [bcc] tambien debe de serlo"; }	
	}	
}

function textToHTML(text) {
	return  "<p>" +  text.replace(/\n/g, "<br/>") + "</p>";
}

function unescape(s) {
  var re = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;
  var unescaped = {
    '&amp;': '&',
    '&#38;': '&',
    '&lt;': '<',
    '&#60;': '<',
    '&gt;': '>',
    '&#62;': '>',
    '&apos;': "'",
    '&#39;': "'",
    '&quot;': '"',
    '&#34;': '"'
  };
  return s.replace(re, function (m) {
    return unescaped[m];
  });
}

function sendMail(options) {
	var data      = {to: options.to, from: options.from, subject: options.subject},
		api_key   = options.apiKey,
		headers   = {"Content-Type": "application/json",
					 "Accept": "application/json",
					 "Authorization": "Bearer " + api_key};

	if ( api_key == "" ) { throw "Para enviar emails necesitas un api key de acceso" }
	
	if ( options.html     ) { data.html     = options.html;                     }
	if ( options.text     ) { data.html     = textToHTML(options.text);         }
	if ( options.cc       ) { data.cc       = options.cc;      				    }
	if ( options.ccname   ) { data.ccname   = options.ccname;  				    }
	if ( options.bcc      ) { data.bcc      = options.bcc;     				    }
	if ( options.bccname  ) { data.bccname  = options.bccname; 				    }
	if ( options.replyto  ) { data.reply_to = options.replyto; 				    }
	if ( options.fromname ) { data.fromname = options.fromname; 		  		}
	if ( options.toname   ) { data.toname   = options.toname; 				    }
	if ( options.personalizations ) { data.personalizations = options.personalizations; }
	
	// Templates
	if ( options.template_id ) { data.template_id = options.template_id; 		}
	if ( options.dynamic_template_data ) { data.dynamic_template_data = options.dynamic_template_data; 		}

	if (options.personalizations == undefined) { validateOptions(data); }
	var params = buildV3params(data, options.attachments, options.images);

	$.ajax({
		type:    "POST",
		url:     "https://api.sendgrid.com/v3/mail/send",
		headers: headers,
		responseType: "json",
		data: params,
		success: function(data, status) {
			if ( options.callback ) { options.callback(data); }
		},
		error: function(data, status) {
			if ( options.errorCallback ) { options.errorCallback(data, status); }
		}
	});
}