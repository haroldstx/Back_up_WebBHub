# Documentación para las Rutas de Webhub-Backend v0.1

**Índice**
- [GET](#get)
- [POST](#post)
- [UPDATE](#update)
- [DELETE](#delete)

# Notas
Para la verificación de los correos:
1. Generar un código de verificación con `/gen-code` y enviarlo al HTML usando `/send-email`.
2. Usar `/verify-code` para obtener un `True` o `False` si el código proporcionado es válido.
3. Si es verdadero, usar `/add-user` para agregar el usuario.

# To-Do
- Retornar token OAuth al usuario en /login

# GET

# POST

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
> Nota: Es necesario que los correos existan, desde el del sender hasta el del receptor
> Nota: El cuerpo del correo debe ser enviado en un formato html 
> Nota: El to representa un array, por ende se pueden mandar multiples correos a la vez, sin embargo el sender solo puede ser uno

**Parámetros de Body**
```json
{
    "subject": "",
    "to": 
    [{ "email": "", "name": "" }],
    "senderemail":"",
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


# UPDATE

Added .env.example para referencia de .env e informacion para empezar a usar el projecto en readme# DELETE
