# Guía de Deploy en Hostinger VPS

## Plan recomendado: KVM 2 (~$9/mes)
- 2 vCPU, 8 GB RAM, 100 GB NVMe SSD
- Suficiente para cientos de negocios activos
- Escala a KVM 4 sin downtime cuando crezcas

---

## 1. Configuración inicial del VPS (una sola vez)

```bash
# Conectarte al VPS
ssh root@IP_DE_TU_VPS

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar pnpm
npm install -g pnpm pm2

# Instalar MySQL
apt install -y mysql-server
mysql_secure_installation

# Instalar Nginx
apt install -y nginx certbot python3-certbot-nginx
```

## 2. Crear la base de datos

```bash
mysql -u root -p
```
```sql
CREATE DATABASE boutique_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'posuser'@'localhost' IDENTIFIED BY 'contraseña-segura';
GRANT ALL PRIVILEGES ON boutique_pos.* TO 'posuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Subir el proyecto

```bash
# En tu máquina local — empacar el proyecto
cd boutique-pos
git archive --format=zip HEAD -o ../boutique-pos.zip

# Subir al VPS
scp boutique-pos.zip root@IP_VPS:/var/www/

# En el VPS
cd /var/www
unzip boutique-pos.zip -d boutique-pos
cd boutique-pos
```

## 4. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
# Llena todos los valores (DATABASE_URL, JWT_SECRET, etc.)
```

## 5. Instalar dependencias y construir

```bash
pnpm install
pnpm db:push       # Crear/actualizar tablas en MySQL
pnpm build         # Construir frontend + servidor
```

## 6. Configurar Nginx

```bash
# Copiar configuración
cp docs/nginx.conf /etc/nginx/sites-available/boutique-pos

# Editar y cambiar "tudominio.com" por tu dominio real
nano /etc/nginx/sites-available/boutique-pos

# Activar el sitio
ln -s /etc/nginx/sites-available/boutique-pos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Obtener certificado SSL gratuito
certbot --nginx -d tudominio.com -d www.tudominio.com
```

## 7. Iniciar el servidor con PM2 (se reinicia solo)

```bash
cd /var/www/boutique-pos
pm2 start dist/index.js --name "boutique-pos"
pm2 startup                    # Configurar auto-inicio
pm2 save                       # Guardar configuración
```

## 8. Primer administrador

1. Abre `tudominio.com` en tu navegador
2. Crea tu cuenta con "Registrarse"
3. En MySQL, marca esa cuenta como admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
   ```
4. Obtén tu openId:
   ```sql
   SELECT openId FROM users WHERE email = 'tu@email.com';
   -- Resultado: local_1
   ```
5. Actualiza `.env`: `OWNER_OPEN_ID=local_1`
6. Reinicia: `pm2 restart boutique-pos`

---

## Actualizar la aplicación

```bash
cd /var/www/boutique-pos
git pull                 # o subir nuevo zip
pnpm install
pnpm db:push             # si hay cambios en el schema
pnpm build
pm2 restart boutique-pos
```

## Monitorear

```bash
pm2 logs boutique-pos    # Ver logs en tiempo real
pm2 status               # Ver estado del proceso
```
