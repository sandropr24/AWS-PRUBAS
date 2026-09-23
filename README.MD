# Laboratorio Floci + AWS CLI + S3

Guía de configuración de un entorno local que simula servicios AWS (S3, DynamoDB, Lambda, API Gateway, SQS, IAM) usando **Floci** sobre Docker, y una app web Node.js/Express que consume S3.

## Glosario

| Término | Significado |
|---|---|
| CLI | Interfaz de línea de comandos |
| GUI | Interfaz gráfica de usuario |

## Requisitos previos

- Docker Desktop instalado y en ejecución

## 1. Instalación

### Floci (PowerShell como administrador)

```powershell
iwr https://floci.io/install.ps1 | iex
```

Cerrar y volver a abrir PowerShell (administrador).

### Iniciar Floci

```powershell
floci start
```

Esto descarga y configura el contenedor. Verificar en Docker Desktop que el contenedor nuevo aparece corriendo.

### AWS CLI

```powershell
irm https://awscli.amazonaws.com/v2/install.ps1 | iex
```

Cerrar y volver a abrir PowerShell (administrador). Verificar:

```powershell
aws --version
```

## 2. Configuración

### Variables de entorno vía Floci

```powershell
floci env --shell powershell
floci env --shell powershell | Invoke-Expression
```

> **Nota:** este comando generó excepciones en las pruebas. Alternativa: definir las variables manualmente.

```powershell
$env:AWS_ENDPOINT_URL = 'http://localhost.floci.io:4566'
$env:AWS_ACCESS_KEY_ID = 'test'
$env:AWS_SECRET_ACCESS_KEY = 'test'
$env:AWS_DEFAULT_REGION = 'us-east-1'
```

### Verificar variables

```powershell
$env:AWS_ENDPOINT_URL     # http://localhost.floci.io:4566
$env:AWS_DEFAULT_REGION   # us-east-1
```

## 3. Comandos de gestión de Floci

```powershell
floci start    # iniciar
floci stop     # detener
floci doctor   # diagnóstico del contenedor (debe mostrar "All checks passed")
```

## 4. Prueba de AWS CLI

```powershell
aws s3 ls
```

Salida esperada: vacío (aún no hay buckets).

### Crear un bucket

```powershell
aws s3 mb s3://laboratorio-floci
```

Salida: `make_bucket: laboratorio-floci`

**Flujo de trabajo:**

```
PC → AWS CLI → AWS_ENDPOINT_URL → FLOCI → S3 → laboratorio-floci
                (http://localhost.floci.io:4566)
```

**Servicios simulables:** S3, DynamoDB, Lambda, API Gateway, SQS, IAM.

## 5. Subir y verificar un archivo en S3

```powershell
"este es un mensaje contenido en un archivo de texto" | Out-File mensaje.txt
aws s3 cp mensaje.txt s3://laboratorio-floci
aws s3 ls s3://laboratorio-floci
```

### Descargar un archivo

```powershell
aws s3 cp s3://laboratorio-floci/mensaje.txt .\mensaje.txt
```

### Conceptos clave

- **Bucket:** contenedor donde se almacenan los objetos.
- **Object:** archivo almacenado.
- **Key:** nombre/ruta lógica del objeto.

**Ejemplo:**
- Bucket: `laboratorio-floci`
- Object: `laptop.jpg`
- Key: `imagenes/productos/laptop.jpg`

### Ejercicio propuesto

Subir 3 archivos (PDF, JPG, TXT) al bucket y verificar su existencia.

## 6. App web para consumir AWS S3 (Node.js + Express)

### Inicializar proyecto

```bash
npm init -y
```

### Instalar dependencias

```bash
npm install express multer dotenv @aws-sdk/client-s3
```

| Paquete | Función |
|---|---|
| express | Framework backend |
| multer | Gestión de archivos binarios (subida) |
| dotenv | Carga de variables desde `.env` |
| @aws-sdk/client-s3 | SDK para consumir la API de S3 |

### Archivo `.env`

```env
PORT=3000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

AWS_ENDPOINT_URL=http://localhost.floci.io:4566

AWS_S3_BUCKET=laboratorio-floci
AWS_S3_PREFIX=mi-aplicacion/archivos/
```

---

> **Estado:** documento en construcción. Faltan los pasos de implementación del servidor Express (rutas, configuración del cliente S3 con `@aws-sdk/client-s3`, endpoint de subida con `multer`, arranque del servidor).