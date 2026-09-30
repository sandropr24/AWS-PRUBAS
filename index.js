const express = require("express")
const multer = require("multer")
const dotenv = require("dotenv")
const path = require("path")


//Solicitar de los servicios AWS s3
const{
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand
}= require("@aws-sdk/client-s3")

//DynamoDB - Servicio BD NoSQL

const{
  DynamoDBClient,
  PutItemCommand
} = require("@aws-sdk/client-dynamodb")


//Cargar la variables de entornos
dotenv.config()

//Habilitar Framework Backend

const app = express()

//Leer algunas configuraciones
const PORT = process.env.PORT  || 3000
const BUCKET = process.env.AWS_S3_BUCKET
const PREFIX = process.env.AWS_S3_PREFIX || ""

//Configurar de multer (gestionar | subir archivos )
//Backend conservara una copia de manera del archivo a subir 
const upload = multer({
  storage: multer.memoryStorage()
})

//Cliente s3
//forcePathStyle:true (modo de compatibilidad)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials:{
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },

  forcePathStyle:true
})

//Cliente DynamoDB
const dynamoCliente = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials:{
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

//Archivo estatico aplicacion = Fronted
app.use(express.static(path.join(__dirname, "public")))

//Ruta
app.get("/" , (req , res)=>{
  res.sendFile(path.join(__dirname , "public" , "index.html"))
})

//Ruta para listar => http://localhost:300/lista
app.get("/lista" , (req,res)=>{
  res.sendFile(path.join(__dirname, "public" , "lista.html"))
})

//Cuando el clinete suba un archivo , se utilizara 2 servecios
//S3        : Aloja el archivo binario
//DynamoDb  : Almacena los metadatos

//Ruta para subir archivos
app.post('/upload',upload.single("archivo") ,async(req , res)=>{
  try{

    //Verificar que se haya seleccionado un archivo
    if(!req.file){
      return res.status(400).json({
        success: false,
        message:'No adjuntaste el archivo'
      })
    }

    //Nota hace falta considerar otros tipos de valdiacion


    //Obtener el nombre del archivo
    const fileName = req.file.originalname

    //Ruta del archivo
    const key = `${PREFIX}${fileName}`

    //Subir el archivo
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key:key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    })

    //Ejecutar el comando 
    await s3Client.send(command)

    console.log(`Archivo subido: ${key}`)

    //Tambien ... utilizaremos el DynamoDB

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}` 
    const dynamoCommand = new PutItemCommand({
      TableName: process.env.AWS_DYNAMODB_TABLE,
      Item: {
        id: {S:id},
	  nombre: {S:fileName},
	    tipo: {S:req.file.mimetype},
	  tamano: {N:req.file.size.toString()},
	   fecha: {S: new Date().toISOString()},
	   s3Key: {S:key}
      }
    })

    await dynamoCliente.send(dynamoCommand);
    console.log(`Metadatos guardados en DynamoDB con ID: ${id}`);



    res.json({
      success: true,
      message: 'Archivo subido correctamente',
      bucket:BUCKET,
      Key:key
    })


  }catch (error){
    console.error(e)
    res.status(500).json({
      success: false,
      message:'Nose pudo subir el archivo',
      error:e.message
    })
  }
})

//Nueva operacion(Lectura des AWS S3)
app.get("/api/archivos" ,async(req, res)=>{
  try{
    //cOMANDO PARA LEER LOS ARCHIVOS
    const command = new ListObjectsV2Command({
      Bucket:BUCKET,
      Prefix:PREFIX,
    }) 

    const data = await s3Client.send(command)

    //Si no existe los archivos
    //1() : Retorna una arreglo incluso si no existe archivos
    //2() : Filtra la coleccion
    //3() : Retorna los datos ya filtrados
    const archivos = (data.Contents || [])
      .filter(objeto =>objeto.Key  !== PREFIX)
      .map(objeto => ({
        nombre: objeto.Key.replace(PREFIX, ""),
        key: objeto.Key,
        tamano: objeto.Size,
        fecha: objeto.LastModified
      }))

      //Retornamos los datos
      res.json({
        success: true,
        bucket: BUCKET,
        prefijo: PREFIX,
        total: archivos.length,
        archivos:archivos
      })

  }catch(e){
    console.error(`Error al listar archivos:` ,e)
    res.status(500).json({
      success: false,
      message:`No se puede acceder a los archivos`,
      error:e.message
    })
  }
})


//Descargar: S3 entrega el archivo y el servidor se lo pasa al navegador
app.get("/api/archivos/descargar", async(req, res)=>{
  try{
    const key = req.query.key

    //Solo permitir archivos dentro de nuestra carpeta (PREFIX)
    if(!key || !key.startsWith(PREFIX)){
      return res.status(400).json({ success:false, message:"key invalida" })
    }

    const archivo = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    }))

    const nombre = key.replace(PREFIX, "")
    res.setHeader("Content-Type", archivo.ContentType || "application/octet-stream")
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`)
    archivo.Body.pipe(res)

  }catch(e){
    console.error("Error al descargar:", e)
    res.status(500).json({ success:false, message:"No se pudo descargar", error:e.message })
  }
})

//Eliminar: borra el archivo de S3
app.delete("/api/archivos", async(req, res)=>{
  try{
    const key = req.query.key

    if(!key || !key.startsWith(PREFIX)){
      return res.status(400).json({ success:false, message:"key invalida" })
    }

    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    }))

    console.log(`Archivo eliminado: ${key}`)
    res.json({ success:true })

  }catch(e){
    console.error("Error al eliminar:", e)
    res.status(500).json({ success:false, message:"No se pudo eliminar", error:e.message })
  }
})


//Iniciar el servidor
app.listen(PORT, ()=>{
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
})