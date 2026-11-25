#include "(CurrentProject)/js/Sendgrid/vSendgrid.js"

var email = theRoot.varToString("EMAIL");
var asunto = theRoot.varToString("ASUNTO");
var cuerpo = theRoot.varToString("CUERPO");
var adjunto = theRoot.varToString("RUTA_PDF");

sendMail({ to:       email, 
           subject:  asunto, 
           text:     cuerpo, 
           from:     'pepitoperez@gmail.com',
	       attachments: [adjunto],
           callback: function(data) { 
                         alert('Mail enviado');
           }
});