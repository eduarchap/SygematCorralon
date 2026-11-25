var sCUIT = theRoot.varToString("CUIT");
var aMult = '5432765432'; 
var aMult = aMult.split(''); 
var ret = 0;

if (sCUIT && sCUIT.length == 11) 
{ 
	aCUIT = sCUIT.split(''); 
    var iResult = 0; 
    for(i = 0; i <= 9; i++) 
    { 
       iResult += aCUIT[i] * aMult[i]; 
    } 
    iResult = (iResult % 11); 
    iResult = 11 - iResult; 
         
    if (iResult == 11) iResult = 0; 
    if (iResult == 10) iResult = 9; 

    if (iResult == aCUIT[10]) 
    { 
        theRoot.setVar("RET",1); 
    } 
}else{
	theRoot.setVar("RET",0); 
}    