const express = require("express")
const multer = require("multer")
const dotenv = require("dotenv")
const path = require("path")


//Solicitar de los servicios AWS s3
const{
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
}= require("@aws-sdk/client-s3")


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


//Iniciar el servidor
app.listen(PORT, ()=>{
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
})