# Documentación para las Rutas de Webhub-Backend v0.1

**Índice**
- [GET](#get)
- [POST](#post)
- [PUT](#update)
- [DELETE](#delete)

# Notas
Para la verificación de los correos:
1. Generar un código de verificación con `/gen-code`
2. Usar `/verify-code` para obtener un `True` o `False` si el código proporcionado es válido.
3. Si es verdadero, usar `/add-user` para agregar el usuario.

# To-Do
- Retornar token OAuth al usuario en /login

# GET

## /contests

Retorna la lista entera de concursos creados.

**Respuesta**
```json
{
	"0": {
		"nombre": "",
		"descripcion": "",
        "fecha_inicio": 0,
        "fecha_fin": 0,
        "foto_perfil": "bytes str",
        "banner": "bytes str",
        "interno": true
	},
    "1": {},
    "2": {}
}
```

# GET 

## /search-contest-by-name/:palabra 

**Parametro por url**
 palabra: palabra o frase en el nombre

 **Respuesta**
- `200`
```json
{
    {
		"nombre": "",
		"descripcion": "",
        "fecha_inicio": "0000-00-00T00:00:00.000Z",
        "fecha_fin": "9999-99-99T99:99:99.999Z",
        "foto_perfil": "bytes str",
        "banner": "bytes str",
        "interno": true,
        "activo":true
	},
    {}
}
```

- `400`
```json
{
    "status": 400,
    "message": "Missing search query"
}
```

- `404`
```json
{
    "status": 404,
    "message":"No contests found"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database operation failed"
}
```

# GET
## /contests-for-user/:userID
Esta ruta filtra y retorna la lista de concursos dependiendo del tipo de usuario:
Si el usuario es interno, retorna todos los concursos (internos y externos).
Si el usuario es externo, retorna solo los concursos externos.

**Parámetro por URL**
userId: Identificador único del usuario.

**Respuesta**

- `200` (para usuario interno)
```json
{
    "0": {
        "nombre": "",
        "descripcion": "",
        "fecha_inicio": "0000-00-00T00:00:00.000Z",
        "fecha_fin": "9999-99-99T99:99:99.999Z",
        "foto_perfil": "bytes str",
        "banner": "bytes str",
        "interno": true,
        "activo": true
    },
    "1": {
        "nombre": "",
        "descripcion": "",
        "fecha_inicio": "0000-00-00T00:00:00.000Z",
        "fecha_fin": "9999-99-99T99:99:99.999Z",
        "foto_perfil": "bytes str",
        "banner": "bytes str",
        "interno": false,
        "activo": true
    }
}
```
-`200` (para usuario externo)
```json
{
    "0": {
        "nombre": "",
        "descripcion": "",
        "fecha_inicio": "0000-00-00T00:00:00.000Z",
        "fecha_fin": "9999-99-99T99:99:99.999Z",
        "foto_perfil": "bytes str",
        "banner": "bytes str",
        "interno": false,
        "activo": true
    },
    "1": {}
}
```
`404`
```json
{
    "status": 404,
    "message": "No contests found for user"
}
```
`500`
```json
{
    "status": 500,
    "message": "Database operation failed"
}
```

## /users-unitec
Devuelve todos los usuarios de la organización UNITEC.

**Body Respuesta**
```json
{
    "0": {
        "id": 0,
        "nombre": "",
        "correo": "",
        "contrasena": "",
        "tipo": "",
        "carrera": "",
        "bio": "",
        "foto_perfil": "bytes str",
    },
    "1": {},
    "2": {}
}
```

# POST

## /create-contest
Registra un concurso en la base de datos
> Nota: todos los campos deben ser llenados 
> Nota: El concurso debe ser unico

**Parámetros de Body**
```json
{
    "id": "", 
    "nombre": "", 
    "descripcion": "", 
    "fecha_inicio": "", 
    "fecha_fin": "", 
    "foto_perfil": "bytes str", 
    "banner": "bytes str", 
    "interno": "boolean"
}
```
**Respuesta**

- `400`
```json
{
    "status": 400,
    "message": "Missing required files"
}
```

- `201`
```json
{
    "status": 201,
    "message": "contest created successfully"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database operation failed."
}
```


## /adduser
Registra un usuario en la base de datos.
> Nota: Es necesario comprobar primero si el usuario es propietario del correo ingresado.

**Parámetros de Body**
```json
{
    "nombre": "", 
    "correo": "", 
    "contrasena": "", 
    "tipo": "", 
    "carrera": "", 
    "bio": "", 
    "foto_perfil": "bytes str"
}
```

**Respuesta**

- `201`
```json
{
    "status": 201,
    "message": "User added successfully"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database operation failed."
}
```

## /sendemail

Envio de correos
> Nota: Es necesario que los correos existan
> Nota: El cuerpo del correo debe ser enviado en un formato html 
> Nota: El to representa un array, por ende se pueden mandar multiples correos a la vez, sin embargo el sender solo puede ser uno

**Parámetros de Body**
```json
{
    "subject": "",
    "to": 
    [{ "email": "", "name": "" }],
    "htmlContent": ""
}
```
**Respuesta**

- `200`
```json
{
    "status": 200,
    "message": "Email sent successfully"
}
```

- `400`
```json
{
    "status": 400,
    "message": "Missing requiered fileds"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Failed to send email"
}
```

## /gen-code
Genera un código de verificación para el registro de un usuario. Y envia el correo para

**Parámetros de Body**
```json
{
    "correo": "",
    "nombre": ""
}
```

**Respuesta**

- `200`
```json
{
    "valid_until": 0,
    "emailMsg": ""
}
```
- `400`
```json
{
    "error": "Code already generated.",
}
```
## /verify-code

Verifica si un código de verificación es válido.

**Parámetros de Body**
```json
{
    "correo": "",
    "code": ""
}
```

**Respuesta**
- `200`
```json
{
    "valid": true,
}
```
> Nota: Tambien puede ser false.

- `404`
```json
{
    "error": "Code not found."
}
```

# Put 

## /desactivate-contest/:id 
>Nota: El concurso debe existir 
>Nota: El concurso puede ser desactivado tanto porque su tiempo acabo como por el hub 

**Parametro por url**
 id: id contest

 **Respuesta**
- `200`
```json
{
    "status": 200,
    "message": "Contest desactivated succesfully"
}
```

- `404`
```json
{
    "status": 404,
    "message": "Contest not found "
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database eperation failed"
}
```

## /desactivate-user/:id 
>Nota: El user debe existir

**Parametro por url**
 id: id user

 **Respuesta**
- `200`
```json
{
    "status": 200,
    "message": "User desactivated succesfully"
}
```

- `404`
```json
{
    "status": 404,
    "message": "USer not found "
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database eperation failed"
}
```

## /update-password/:id
>Nota: El user debe existir

**Parametro por url**
 id: id user

 **Parámetros de Body**
```json
{
    "contrasena": "" 
}
```

 **Respuesta**
- `200`
```json
{
    "status": 200,
    "message": "Password changed successfuly"
}
```

- `404`
```json
{
    "status": 404,
    "message": "User not found"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database eperation failed"
}
```

## /change-career/:id
>Nota: El user debe existir
>Nota: 

**Parametro por url**
 id: id user

 **Parámetros de Body**
```json
{
    "carrera": "" 
}
```

 **Respuesta**
- `200`
```json
{
    "status": 200,
    "message": "Carreer updated"
}
```

- `404`
```json
{
    "status": 404,
    "message": "User not found"
}
```

- `500`
```json
{
    "status": 500,
    "message": "Database eperation failed"
}
```


# UPDATE

