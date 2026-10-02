exports.handler = async (event) => {
    const ahora = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
    
    console.log("==========================================");
    console.log(`[RUTINA PROGRAMADA EJECUTADA]: ${ahora}`);
    console.log("-> Ejecutando proceso de sincronización / reporte...");
    console.log("-> Carga útil (Payload):", JSON.stringify(event));
    console.log("==========================================");

    return {
        statusCode: 200,
        body: JSON.stringify({
            status: "Completado",
            mensaje: "La rutina se ejecutó con éxito a la hora programada",
            ejecutadoEn: ahora
        })
    };
};