# Backend API Endpoints - MindVoice

**URL Base:** `http://18.223.30.63:5000`

**Swagger UI:** `http://18.223.30.63:5000/swagger-ui`

---

## 🔐 Autenticación (`/auth`)

| Método | Endpoint      | Descripción           | Auth |
|--------|---------------|----------------------|------|
| POST   | `/auth/login` | Login usuario        | ❌   |

**Login Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Login Response:**
```json
{
  "access_token": "jwt_token_here",
  "refresh_token": "optional_refresh_token"
}
```

---

## 👥 Usuarios (`/users`)

| Método | Endpoint           | Descripción         | Auth |
|--------|--------------------|---------------------|------|
| GET    | `/users/`          | Listar usuarios     | ✅   |
| POST   | `/users/`          | Crear usuario       | ❌   |
| GET    | `/users/:id`       | Obtener usuario     | ✅   |
| PUT    | `/users/:id`       | Actualizar usuario  | ✅   |
| DELETE | `/users/:id`       | Eliminar usuario    | ✅   |

**Create User Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "name": "string",
  "roleId": "string (optional)"
}
```

---

## 🏷️ Tags (`/tags`)

| Método | Endpoint         | Descripción       | Auth |
|--------|------------------|-------------------|------|
| GET    | `/tags/`         | Listar tags       | ✅   |
| POST   | `/tags/`         | Crear tag         | ✅   |
| PUT    | `/tags/:id`      | Actualizar tag    | ✅   |
| DELETE | `/tags/:id`      | Eliminar tag      | ✅   |

**Response (GET /tags/):**
```json
{
  "tags": [
    {
      "_id": "24-char-hex",
      "name": "string",
      "color": "string (optional)",
      "user_id": "string",
      "created_at": "ISO date",
      "updated_at": "ISO date"
    }
  ]
}
```

---

## 🎵 Audios (`/audios`)

| Método | Endpoint           | Descripción       | Auth |
|--------|--------------------|-------------------|------|
| GET    | `/audios/`         | Listar audios     | ✅   |
| POST   | `/audios/`         | Crear audio       | ✅   |
| DELETE | `/audios/:id`      | Eliminar audio    | ✅   |

**Create Audio Request:**
```json
{
  "userId": "string",
  "filePath": "string",
  "duration": "number",
  "format": "string (optional)"
}
```

---

## 📝 Transcripciones (`/transcriptions`)

| Método | Endpoint                | Descripción            | Auth |
|--------|-------------------------|------------------------|------|
| GET    | `/transcriptions/`      | Listar transcripciones | ✅   |
| POST   | `/transcriptions/`      | Crear transcripción    | ✅   |
| DELETE | `/transcriptions/:id`   | Eliminar transcripción | ✅   |

**Create Transcription Request:**
```json
{
  "audioId": "string",
  "text": "string",
  "timestamps": []
}
```

---

## 🤖 Análisis IA (`/ai-analyses`)

| Método | Endpoint                | Descripción          | Auth |
|--------|-------------------------|----------------------|------|
| GET    | `/ai-analyses/`         | Listar análisis      | ✅   |
| POST   | `/ai-analyses/`         | Crear análisis       | ✅   |
| DELETE | `/ai-analyses/:id`      | Eliminar análisis    | ✅   |

**Create Analysis Request:**
```json
{
  "transcriptionId": "string",
  "result": {
    "resumen": "string",
    "temas": ["string"],
    "acciones": [{"accion": "string", "prioridad": "string"}],
    "sentimiento": "string (optional)"
  }
}
```

---

## 📁 Carpetas (`/folders`)

| Método | Endpoint          | Descripción      | Auth |
|--------|-------------------|------------------|------|
| GET    | `/folders/`       | Listar carpetas  | ✅   |
| POST   | `/folders/`       | Crear carpeta    | ✅   |
| PUT    | `/folders/:id`    | Actualizar       | ✅   |
| DELETE | `/folders/:id`    | Eliminar         | ✅   |

---

## 📄 Documentos (`/documents`)

| Método | Endpoint              | Descripción        | Auth |
|--------|-----------------------|--------------------|------|
| GET    | `/documents/`         | Listar documentos  | ✅   |
| POST   | `/documents/`         | Crear documento    | ✅   |
| PUT    | `/documents/:id`      | Actualizar         | ✅   |
| DELETE | `/documents/:id`      | Eliminar           | ✅   |

---

## 🧠 Mapas Mentales (`/mindmaps`)

| Método | Endpoint            | Descripción        | Auth |
|--------|---------------------|--------------------|------|
| GET    | `/mindmaps/`        | Listar mapas       | ✅   |
| POST   | `/mindmaps/`        | Crear mapa         | ✅   |
| GET    | `/mindmaps/:id`     | Obtener mapa       | ✅   |
| PUT    | `/mindmaps/:id`     | Actualizar mapa    | ✅   |
| DELETE | `/mindmaps/:id`     | Eliminar mapa      | ✅   |

**WebSocket:** `ws://18.223.30.63:5000`

Eventos Socket.IO:
- `mindmap:join` - Unirse a sala
- `mindmap:leave` - Salir de sala
- `mindmap:update` - Actualización completa
- `mindmap:node_added` - Nodo añadido
- `mindmap:node_deleted` - Nodo eliminado

---

## 🔍 MindVoice API (Análisis con IA)

| Método | Endpoint                  | Descripción           | Auth |
|--------|---------------------------|-----------------------|------|
| POST   | `/mindvoice-api/analyze/text`  | Analizar texto     | ✅   |
| POST   | `/mindvoice-api/analyze/audio` | Analizar audio     | ✅   |

**Analyze Text Request:**
```json
{
  "text": "string"
}
```

**Analyze Audio Request:** `multipart/form-data`
- `audio`: archivo de audio
- `api_key`: string (optional)

---

## 📊 Activity Logs (`/activity-logs`)

| Método | Endpoint                | Descripción          | Auth |
|--------|-------------------------|----------------------|------|
| GET    | `/activity-logs/`       | Listar logs          | ✅   |
| POST   | `/activity-logs/`       | Crear log            | ✅   |

---

## 🔑 Roles (`/roles`)

| Método | Endpoint       | Descripción     | Auth |
|--------|----------------|-----------------|------|
| GET    | `/roles/`      | Listar roles    | ✅   |

---

## 👤 Profiles (`/profiles`)

| Método | Endpoint         | Descripción       | Auth |
|--------|------------------|-------------------|------|
| GET    | `/profiles/`     | Listar perfiles   | ✅   |
| PUT    | `/profiles/:id`  | Actualizar perfil | ✅   |

---

## 🔑 Headers Requeridos

Para endpoints con auth (✅):
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## ⚠️ Notas Importantes

1. **Trailing Slash:** El backend Flask requiere `/` al final de las rutas
2. **IDs:** Todos los IDs son MongoDB ObjectIds (24 caracteres hex)
3. **JWT:** Token se envía en header `Authorization: Bearer <token>`
4. **CORS:** Configurado para aceptar peticiones del frontend
