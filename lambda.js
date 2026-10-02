exports.handler = async (event) => {
    console.log("=== EVENTO RECIBIDO DE S3 ===");
    
    // S3 envía la información dentro del array Records
    if (event.Records && event.Records.length > 0) {
        for (const record of event.Records) {
            const bucketName = record.s3.bucket.name;
            const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
            const size = record.s3.object.size;
            
            console.log(`[NOTIFICACIÓN] Se subió un nuevo archivo:`);
            console.log(` -> Bucket: ${bucketName}`);
            console.log(` -> Archivo: ${objectKey}`);
            console.log(` -> Tamaño: ${size} bytes`);
        }
    } else {
        console.log("No se encontraron registros de S3 en el evento.");
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ mensaje: "Notificación procesada con éxito" })
    };
};