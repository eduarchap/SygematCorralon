#include "(CurrentProject)/Documentos/Amazons3.js"	

var bucketName   = theRoot.varToString("BUC_NOM"),
	bucketRegion = theRoot.varToString("BUC_REG");

function validBucketName(bucketName) {
  if (!bucketName || typeof bucketName !== 'string') {
    return("El nombre del bucket no puede ser undefined o vacio");
  }

  if (bucketName.length < 3) {
    return "El nombre del bucket no puede ser más corto que 3 carácteres. ${bucketName}";
  }

  if (bucketName.length > 63) {
    return "El nombre del bucket no puede exceder 63 carácteres ${bucketName}";
  }

  if (/^[^a-z0-9]/.test(bucketName)) {
    return "El nombre del bucket debe de comenzar con una letra o un numero ${bucketName}";
  }

  if (/[^a-z0-9]$/.test(bucketName)) {
    return "El nombre del bucket debe de terminar con una letra o un numero ${bucketName}";
  }

  if (/[A-Z]/.test(bucketName)) {
    return "El nombre del bucket no puede tener letras en mayúscula. ${bucketName}";
  }

  if (!/^[a-z0-9][a-z.0-9-]+[a-z0-9]$/.test(bucketName)) {
    return "El nombre del bucket solo puede contener carácteres válidos, [a-z.0-9-]. ${bucketName}";
  }

  if (/\.{2,}/.test(bucketName)) {
    return "El nombre del bucket no puede contener puntos consecutivos (.) ${bucketName}";
  }

  return 'valid';
};	

if ( validBucketName(bucketName) == "valid") {
	createBucket(bucketName, bucketRegion);
} elºalert(validBucketName(bucketName).replace("${bucketName}", bucketName));
}