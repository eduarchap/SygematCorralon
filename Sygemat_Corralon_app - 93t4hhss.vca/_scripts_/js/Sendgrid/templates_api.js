#include "(CurrentProject)/js/Sendgrid/ajax.js"

/**
 * Sumary.
 * Adapter para operaciones crud con templates de Sendgrid.
 *
 * @since 2019-12-23
 * @link https://sendgrid.com/docs/API_Reference/Web_API_v3/Transactional_Templates/templates.html
 */

function TemplateAdapter() {
	this.basic_headers = {"Content-Type": "application/json",
						  "Authorization": "Bearer " + theApp.globalVarToString('vsengrid_dat/SENGRID_API_KEY'),
						  "Accept": "application/json"};

	/**
	* Lista los templates almancenados en sendrid
	* @param {function} callback función a a que será entregada la lista de templates
	* @returns {Array} Array con objetos representando templates.
	*/
	this.list = function(callback) {
		var $this        = this,
			templateList = [];

		$.ajax({
			type:    "GET",
			url:     "https://api.sendgrid.com/v3/templates",
			headers: $this.basic_headers,
			responseType: "json",
			success: function(data, status) {
				templateList = data.templates;
				if (callback) {callback(templateList, "success"); }
			},
			error: function(data, status) {
				if (callback) {callback(data, "error"); }
			}
		});

		return templateList;
	};

	/**
	* Almacena un template en sendgrid.com
	* @param {string} name Nombre para el tempalte
	* @param {function} callback función opcional a la que se le entregara el template creado.
	*/
	this.create = function(name, callback) {
		var $this    = this,
			template = {};

		$.ajax({
			type:    "POST",
			url:     "https://api.sendgrid.com/v3/templates",
			headers: $this.basic_headers,
			responseType: "json",
			data: {name: name, generation: "dynamic"},
			success: function(templ, status) {
				template = templ;
				if (callback) { callback(template, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return template;
	};

	/**
	* Actualiza el nombre de un template
	* @param {string} id Identificador del template
	* @param {string} name Nombre para el tempalte
	* @param {function} callback función opcional a la que se le entregara el template creado.
	*/
	this.update = function(id, name, callback) {
		var $this    = this,
			template = {};

		$.ajax({
			type:    "PATCH",
			url:     "https://api.sendgrid.com/v3/templates/" + id,
			headers: $this.basic_headers,
			responseType: "json",
			data: {name: name},
			success: function(templ, status) {
				template = templ;
				if (callback) { callback(template, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return template;
	};
	
	/**
	* Borra un template almacenado
	* @param {string} id Identificador del template
	* @returns {string} Identificando si la operación fue exitosa.
	*/
	this.del = function(id) {
		var $this  = this,
			status = "error";

		$.ajax({
			type:    "DELETE",
			url:     ("https://api.sendgrid.com/v3/templates/" + id),
			headers: $this.basic_headers,
			responseType: "json",
			success: function(templ, st) {
				status = "success";
			}
		});

		return status;
	};
}


/**
 * Sumary.
 * Adapter para operaciones crud con versiones de templates de Sendgrid.
 *
 * @since 2019-12-23
 * @link https://sendgrid.com/docs/API_Reference/Web_API_v3/Transactional_Templates/templates.html
 */
function TemplateVersionAdapter() {

	this.basic_headers = {"Content-Type": "application/json",
						  "Authorization": "Bearer " + theApp.globalVarToString('vsengrid_dat/SENGRID_API_KEY'),
						  "Accept": "application/json"};


	/**
	* Crea una version para un template en sendgrid.com
	* @param {string} templ_id Identificador del template.
	* @param {object} attrs objecto con los attributos para una version https://sendgrid.com/docs/API_Reference/Web_API_v3/Transactional_Templates/versions.html
	* @param {function} callback función para ser llamada despues que se cree la versión.
	*/
	this.create = function(templ_id, attrs, callback) {
		var $this    = this,
			version = {};
		/*
		if (attrs.html_content) {
				attrs.html_content = unescape(attrs.html_content);
		}
		*/
		$.ajax({
			type:    "POST",
			url:     "https://api.sendgrid.com/v3/templates/" + templ_id + "/versions",
			headers: $this.basic_headers,
			responseType: "json",
			data: attrs,
			success: function(ver, status) {
				version = ver;
				if (callback) { callback(version, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return version;
	};

	/**
	* Actualiza una version para un template en sendgrid.com
	* @param {string} templ_id Identificador del template
	* @param {id} id Identificador de la versión especifica.
	* @param {object} attrs objecto con los attributos para una version https://sendgrid.com/docs/API_Reference/Web_API_v3/Transactional_Templates/versions.html
	* @param {function} callback función para ser llamada despues que se cree la versión.
	*/
	this.update = function(templ_id, id, attrs, callback) {
		var $this    = this,
			version = {};

		$.ajax({
			type:    "PATCH",
			url:     "https://api.sendgrid.com/v3/templates/" + templ_id + "/versions/" + id,
			headers: $this.basic_headers,
			responseType: "json",
			data: attrs,
			success: function(ver, status) {
				version = ver;
				if (callback) { callback(version, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return version;
	};

	/**
	* Setea una version como la version activa para el template
	* @param {string} templ_id Identificador del template.
	* @param {id} id Identificador de la versión especifica.
	* @param {function} callback función para ser llamada despues que se cree la versión.
	*/
	this.activate_version = function(templ_id, id, callback) {
		var $this   = this,
			version = {};

		$.ajax({
			type:    "POST",
			url:     "https://api.sendgrid.com/v3/templates/" + templ_id + "/versions/" + id + "/activate",
			headers: $this.basic_headers,
			responseType: "json",
			success: function(ver, status) {
				version = ver;
				if (callback) { callback(version, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return version;
	};

	/**
	* Obtiene la version especifica
	* @param {string} templ_id Identificador del template.
	* @param {id} id Identificador de la versión especifica.
	* @param {function} callback función para ser llamada despues obtener la versión.
	*/
	this.get = function(templ_id, id, callback) {
		var $this   = this,
			version = {};

		$.ajax({
			type:    "GET",
			url:     "https://api.sendgrid.com/v3/templates/" + templ_id + "/versions/" + id,
			headers: $this.basic_headers,
			responseType: "json",
			success: function(ver, status) {
				version = ver;
				if (callback) { callback(version, "success"); }
			},
			error: function(data, status) {
				if (callback) { callback(data, "error"); }
			}
		});

		return version;
	};

	/**
	* Borra la version especifica
	* @param {string} templ_id Identificador del template.
	* @param {id} id Identificador de la versión especifica.
	* @returns {string} Identificando si la operación fue exitosa.
	*/
	this.del = function(templ_id, id) {
		var $this  = this,
			status = "error";

		$.ajax({
			type:    "DELETE",
			url:     "https://api.sendgrid.com/v3/templates/" + templ_id + "/versions/" + id,
			headers: $this.basic_headers,
			responseType: "json",
			success: function(templ, st) {
				status = "success";
			}
		});

		return status;
	};
}