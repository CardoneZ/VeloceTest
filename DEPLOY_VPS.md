# 🚀 Guía de Despliegue en VPS — VeloceExpress

Esta aplicación es **100% autónoma y ligera**: no requiere base de datos externa ni dependencias pesadas de `npm`. Utiliza el servidor nativo de Node.js con sincronización en tiempo real vía Server-Sent Events (SSE).

---

## 📁 Estructura del Proyecto

```text
VeloceExpress/
├── index.html            # Página pública de clientes y registro
├── panel.html            # Portal privado de administración y trazabilidad
├── app.js                # Lógica del cliente y sincronización
├── panel.js              # Lógica del panel de control
├── styles.css            # Estilos unificados
├── server.js             # Servidor HTTP y sincronización en tiempo real
├── package.json          # Metadatos del proyecto
├── ecosystem.config.js   # Configuración para PM2 en VPS
├── nginx.conf            # Plantilla de proxy inverso Nginx con SSE
├── Dockerfile            # Imagen ligera Docker (Node Alpine)
├── docker-compose.yml    # Orquestación Docker lista
├── start.bat             # Lanzador rápido para Windows
└── DEPLOY_VPS.md         # Esta guía de despliegue
```

---

## 🛠️ Requisitos Previos en tu VPS
Cualquier VPS con **Ubuntu 20.04 / 22.04 / 24.04**, Debian o CentOS con:
* **Node.js** (versión 18 o superior).
  ```bash
  # En Ubuntu/Debian:
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

---

## 🚀 Método 1: Despliegue con PM2 (El más recomendado)

PM2 mantiene la aplicación corriendo 24/7 y la reinicia automáticamente si el servidor se reinicia o falla.

### 1. Subir los archivos a tu VPS
Puedes subir la carpeta por SFTP (FileZilla / WinSCP) o clonarla en `/var/www/veloce-express`:
```bash
sudo mkdir -p /var/www/veloce-express
# Sube tus archivos aquí o cópialos
cd /var/www/veloce-express
```

### 2. Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

### 3. Iniciar la aplicación
```bash
pm2 start ecosystem.config.js
```

### 4. Configurar inicio automático con el sistema
```bash
pm2 save
pm2 startup
# (Ejecuta el comando que te indique la terminal para habilitar el servicio)
```

¡Listo! Tu aplicación ya estará respondiendo en `http://TU_IP_VPS:3000`.

---

## 🐳 Método 2: Despliegue con Docker (1 solo comando)

Si tu VPS ya tiene Docker y Docker Compose instalados:

```bash
cd /var/www/veloce-express
docker compose up -d --build
```

Para ver los logs o detener:
```bash
docker compose logs -f
docker compose down
```

---

## 🌐 Configurar Dominio y HTTPS (SSL Gratis con Nginx)

Para que tu web responda en `tu-dominio.com` con candado verde SSL:

### 1. Instalar Nginx y Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Copiar la configuración de Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/veloce-express
```

Edita el archivo y pon tu dominio real:
```bash
sudo nano /etc/nginx/sites-available/veloce-express
# Cambia 'tu-dominio.com' por tu dominio real
```

### 3. Habilitar el sitio y reiniciar Nginx
```bash
sudo ln -s /etc/nginx/sites-available/veloce-express /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Generar certificado SSL gratis (Let's Encrypt)
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot configurará automáticamente la renovación automática del SSL.

---

## 🔑 Credenciales de Acceso a Mi Portal

* **URL Pública**: `https://tu-dominio.com/index.html` (o directo a `/`)
* **URL Mi Portal**: `https://tu-dominio.com/panel.html` (o clic en "Mi Portal" en la cabecera)
* **Correo de Acceso**: Cualquier correo con dominio `@proton.me` (ej: `admin@proton.me`, `operaciones@proton.me`)
* **Contraseña**: `HailLucifer`

---

## 🔍 Comandos útiles de administración

* Ver estado de la aplicación: `pm2 status`
* Ver logs en tiempo real: `pm2 logs veloce-express`
* Reiniciar aplicación: `pm2 restart veloce-express`
* Detener aplicación: `pm2 stop veloce-express`
