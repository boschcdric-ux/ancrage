# Installer Ancrage ⚓

> Guide d'installation pas à pas pour déployer Ancrage sur ton propre matériel.
> Durée estimée : 45 à 90 minutes selon ton niveau de familiarité avec le terminal.

---

## Tester sans Raspberry Pi

Tu veux voir l'app avant d'investir dans le matériel ? Lance-la en 2 minutes sur ton ordinateur :

### Prérequis
- [Node.js](https://nodejs.org) (v18+)
- [Git](https://git-scm.com)

### Lancer en local

```bash
git clone https://github.com/boschcdric-ux/ancrage.git
cd ancrage
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur.

> 💡 En mode local, les données sont sauvegardées dans ton navigateur uniquement. Aucun Raspberry Pi requis pour tester.

---

## Ce dont tu as besoin

### Matériel

| Élément | Détails |
|---------|---------|
| **Raspberry Pi 5** | 8 Go de RAM recommandés |
| **Carte SD** | 32 Go minimum (classe 10 ou A1) |
| **Alimentation officielle Pi 5** | 27W USB-C |
| **Câble réseau** (recommandé) | Ou Wi-Fi |
| **Un Mac ou PC** | Pour builder et déployer l'app |

> 💡 Le Pi consomme environ 5-8W en fonctionnement — soit ~5€/an d'électricité.

### Logiciels gratuits

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) — pour préparer la carte SD
- [Tailscale](https://tailscale.com) — pour accéder à l'app depuis partout
- [Node.js](https://nodejs.org) (v18+) — sur ton Mac/PC uniquement

---

## Étape 1 — Préparer le Raspberry Pi

### 1.1 Flasher la carte SD

1. Télécharge et installe **Raspberry Pi Imager** sur ton Mac/PC
2. Insère la carte SD dans ton Mac/PC
3. Lance Raspberry Pi Imager et choisis :
   - **Appareil** : Raspberry Pi 5
   - **Système** : Raspberry Pi OS Lite (64-bit) — version sans interface graphique
   - **Stockage** : ta carte SD
4. Clique sur **Modifier les réglages** avant d'écrire :
   - Coche "Définir le nom d'hôte" → `ancrage`
   - Coche "Activer SSH" → "Utiliser un mot de passe"
   - Coche "Définir le nom d'utilisateur" → `votre-utilisateur` (ou ton prénom)
   - Coche "Configurer le Wi-Fi" si tu n'utilises pas de câble réseau
5. Clique sur **Écrire** et attends la fin

### 1.2 Démarrer le Pi

1. Insère la carte SD dans le Pi
2. Branche le câble réseau (si tu l'utilises)
3. Branche l'alimentation
4. Attends 1-2 minutes que le Pi démarre

### 1.3 Trouver l'IP du Pi et se connecter

Sur ton Mac/PC, ouvre le terminal et tape :

```bash
ssh votre-utilisateur@ancrage.local
```

> Si ça ne fonctionne pas, cherche l'IP du Pi dans ton routeur (souvent accessible sur `192.168.1.1`) puis utilise `ssh votre-utilisateur@192.168.1.XXX`.

---

## Étape 2 — Installer les logiciels sur le Pi

Une fois connecté en SSH, copie-colle ces commandes **une par une** dans le terminal.

### 2.1 Mettre à jour le système

```bash
sudo apt update && sudo apt upgrade -y
```

> ☕ Cette étape peut prendre 5-10 minutes.

### 2.2 Installer Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Suis le lien affiché pour connecter le Pi à ton compte Tailscale.
Note l'IP Tailscale du Pi — elle ressemble à `100.XX.XX.XX`.

### 2.3 Installer PocketBase

```bash
mkdir -p ~/pocketbase && cd ~/pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_arm64.zip
unzip pocketbase_0.22.0_linux_arm64.zip
chmod +x pocketbase
```

Créer le service qui démarre PocketBase automatiquement :

```bash
sudo nano /etc/systemd/system/pocketbase.service
```

Colle ce contenu :

```
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=votre-utilisateur
WorkingDirectory=/home/votre-utilisateur/pocketbase
ExecStart=/home/votre-utilisateur/pocketbase/pocketbase serve --http="0.0.0.0:8090"
Restart=always

[Install]
WantedBy=multi-user.target
```

Sauvegarde avec `Ctrl+X` puis `Y` puis `Entrée`.

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

### 2.4 Installer mkcert (certificat HTTPS)

```bash
sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/arm64"
chmod +x mkcert-v*-linux-arm64
sudo mv mkcert-v*-linux-arm64 /usr/local/bin/mkcert
mkcert -install
mkcert 100.XX.XX.XX localhost 127.0.0.1
```

> Remplace `100.XX.XX.XX` par ton IP Tailscale.

### 2.5 Installer Nginx

```bash
sudo apt install -y nginx
```

Créer la configuration :

```bash
sudo nano /etc/nginx/sites-available/ancrage
```

Colle ce contenu en remplaçant `100.XX.XX.XX` par ton IP Tailscale :

```nginx
server {
    listen 443 ssl;
    server_name 100.XX.XX.XX;

    ssl_certificate /home/votre-utilisateur/100.XX.XX.XX+2.pem;
    ssl_certificate_key /home/votre-utilisateur/100.XX.XX.XX+2-key.pem;

    root /home/votre-utilisateur/ancrage/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_set_header Host $host;
    }

    location /_/ {
        proxy_pass http://127.0.0.1:8090/_/;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ancrage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Étape 3 — Configurer PocketBase

### 3.1 Créer le compte admin

Ouvre dans ton navigateur : `http://100.XX.XX.XX:8090/_/`

Crée un compte administrateur avec ton email et un mot de passe solide.

### 3.2 Créer les collections

Dans PocketBase, va dans **Collections** et crée les 20 collections suivantes.

**Pour chaque collection :**
1. Clique sur **New collection**
2. Donne-lui le nom indiqué ci-dessous
3. Ajoute un champ : **type JSON**, nom `payload`
4. Dans **API Rules**, mets `""` (chaîne vide) pour toutes les règles — cela autorise l'accès local
5. Clique sur **Save**

> ⚠️ Laisser les règles API vides est sécurisé uniquement parce que l'accès au Pi passe par Tailscale (VPN privé). Ne jamais exposer PocketBase directement sur internet sans authentification.

| # | Nom de la collection |
|---|---------------------|
| 1 | `captures` |
| 2 | `tasks` |
| 3 | `notes` |
| 4 | `memo` |
| 5 | `mood_entries` |
| 6 | `habits` |
| 7 | `habit_completions` |
| 8 | `journal_entries` |
| 9 | `calendar_events` |
| 10 | `pomodoro_history` |
| 11 | `recipes` |
| 12 | `shopping` |
| 13 | `shopping_history` |
| 14 | `budget_config` |
| 15 | `budget_expenses` |
| 16 | `budget_savings` |
| 17 | `breathing` |
| 18 | `medications` |
| 19 | `medications_history` |
| 20 | `planning_boulot` |

---

## Étape 4 — Builder et déployer l'app

Ces étapes se font sur ton **Mac ou PC**, pas sur le Pi.

### 4.1 Cloner le projet

```bash
git clone https://github.com/boschcdric-ux/ancrage.git
cd ancrage
npm install
```

### 4.2 Configurer l'URL de PocketBase

```bash
cp .env.example .env
```

Ouvre `.env` et remplace la valeur :

```
VITE_POCKETBASE_URL=https://100.XX.XX.XX
```

> Remplace `100.XX.XX.XX` par ton IP Tailscale.

### 4.2b Créer ton script de déploiement

```bash
cp deploy.example.sh deploy.sh
```

Ouvre `deploy.sh` et remplace les variables :
```
DEPLOY_USER="votre-utilisateur"
DEPLOY_HOST="votre-ip-tailscale"
DEPLOY_PATH="/home/votre-utilisateur/ancrage/dist"
```

### 4.3 Builder et déployer

```bash
npm run build
./deploy.sh
```

> La première fois, le script te demandera le mot de passe du Pi.

---

## Étape 5 — Installer le certificat sur tes appareils

Pour que Safari et Chrome acceptent la connexion HTTPS, tu dois installer le certificat mkcert sur chaque appareil.

### Sur Mac

```bash
scp votre-utilisateur@100.XX.XX.XX:~/.local/share/mkcert/rootCA.pem ~/Downloads/rootCA-ancrage.pem
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/Downloads/rootCA-ancrage.pem
```

### Sur iPhone

1. Envoie-toi le fichier `rootCA.pem` par email ou AirDrop
2. Ouvre le fichier sur iPhone → **Installer le profil**
3. Va dans **Réglages → Général → VPN et gestion → Certificats** et installe
4. Va dans **Réglages → Général → À propos → Réglages de confiance des certificats** et active le certificat

---

## Étape 6 — Ouvrir et installer l'app

1. Ouvre Safari sur iPhone ou Mac
2. Va sur `https://100.XX.XX.XX`
3. Pour installer comme app sur iPhone :
   - Clique sur **Partager** (icône en bas)
   - Sélectionne **Sur l'écran d'accueil**
   - Clique sur **Ajouter**

🎉 Ancrage est installé !

---

## Résolution de problèmes courants

| Problème | Solution |
|---------|----------|
| "Impossible de se connecter au serveur" | Vérifie que Tailscale est actif sur ton appareil ET sur le Pi |
| "Certificat non valide" | Réinstalle le certificat rootCA sur l'appareil concerné |
| Le voyant de sync est rouge | PocketBase n'est pas accessible — vérifie `sudo systemctl status pocketbase` |
| L'app ne charge pas | Vérifie que Nginx tourne : `sudo systemctl status nginx` |
| Erreur lors du déploiement | Vérifie que le dossier `~/ancrage/dist/` existe sur le Pi |

---

## Mise à jour d'Ancrage

Quand une nouvelle version est disponible :

```bash
cd ancrage
git pull
npm install
./deploy.sh
```

---

## Désinstaller

```bash
sudo systemctl stop pocketbase nginx
sudo systemctl disable pocketbase nginx
rm -rf ~/pocketbase ~/ancrage
```

---

## Pour aller plus loin

- 📖 [Architecture et décisions techniques](docs/decisions/)
- 🤝 [Contribuer à Ancrage](CONTRIBUTING.md)
- 🐛 [Signaler un bug](https://github.com/boschcdric-ux/ancrage/issues)

---

*Ancrage est un projet open source sous licence MIT.*
*Développé avec ❤️ et Claude (Anthropic) + Cursor.*

---

## Installation sur Android

### Installer le certificat sur Android

1. Copie le fichier `rootCA.pem` sur ton téléphone
   (par email, Google Drive, ou câble USB)
2. Va dans **Réglages → Sécurité → Chiffrement et identifiants**
3. Clique sur **Installer un certificat → Certificat CA**
4. Sélectionne le fichier `rootCA.pem`
5. Accepte l'avertissement de sécurité

> ⚠️ Sur certains Android, le chemin est différent :
> **Réglages → Sécurité → Plus de paramètres → Identifiants de confiance**

### Ouvrir et installer l'app sur Android

1. Ouvre **Chrome** sur Android
2. Va sur `https://100.XX.XX.XX`
3. Chrome affiche une bannière "Ajouter à l'écran d'accueil"
   → Clique dessus
4. Ou clique sur les **3 points** en haut à droite
   → **Ajouter à l'écran d'accueil**

---

## Installation depuis Windows

Si tu utilises un PC Windows pour builder et déployer l'app.

### Prérequis Windows

1. **Node.js** — télécharge et installe depuis [nodejs.org](https://nodejs.org)
2. **Git** — télécharge depuis [git-scm.com](https://git-scm.com)
3. **OpenSSH** — déjà inclus dans Windows 10 et 11

> 💡 Toutes les commandes suivantes se lancent dans **PowerShell** ou **Windows Terminal**
> (clic droit sur le bureau → "Ouvrir dans le terminal")

### Cloner et installer

```powershell
git clone https://github.com/boschcdric-ux/ancrage.git
cd ancrage
npm install
```

### Configurer l'URL PocketBase

```powershell
copy .env.example .env
notepad .env
```

Remplace la valeur dans le fichier qui s'ouvre :
```
VITE_POCKETBASE_URL=https://100.XX.XX.XX
```

### Builder l'app

```powershell
npm run build
```

### Déployer sur le Pi (depuis Windows)

PowerShell inclut `scp` nativement :

```powershell
scp -r dist/* votre-utilisateur@100.XX.XX.XX:/home/votre-utilisateur/ancrage/dist/
```

> La première fois, tape `yes` pour accepter la connexion SSH,
> puis entre le mot de passe du Pi.

### Installer le certificat sur Windows

```powershell
scp votre-utilisateur@100.XX.XX.XX:~/.local/share/mkcert/rootCA.pem $env:USERPROFILE\Downloads\rootCA-ancrage.pem
```

Puis installe le certificat :
1. Ouvre l'**Explorateur de fichiers**
2. Double-clique sur `rootCA-ancrage.pem` dans Téléchargements
3. Clique sur **Installer le certificat**
4. Choisis **Ordinateur local** → **Suivant**
5. Sélectionne **Placer tous les certificats dans le magasin suivant**
6. Clique sur **Parcourir** → **Autorités de certification racines de confiance**
7. Clique sur **OK** → **Suivant** → **Terminer**

Redémarre Chrome ou Edge.

### Script de déploiement Windows

Tu peux créer un fichier `deploy.ps1` à la racine du projet :

```powershell
Write-Host "Construction de l'application..."
npm run build
Write-Host "Déploiement vers le Raspberry Pi..."
scp -r dist/* votre-utilisateur@100.XX.XX.XX:/home/votre-utilisateur/ancrage/dist/
Write-Host "Déploiement terminé !"
```

Lance-le avec :
```powershell
.\deploy.ps1
```

---

## Notes sur les navigateurs compatibles

| Navigateur | iPhone/iPad | Android | Mac | Windows |
|-----------|-------------|---------|-----|---------|
| **Safari** | ✅ Recommandé | ❌ | ✅ | ❌ |
| **Chrome** | ⚠️ Limité | ✅ Recommandé | ✅ | ✅ |
| **Firefox** | ❌ PWA non supporté | ⚠️ Limité | ✅ | ✅ |
| **Edge** | ❌ | ⚠️ Limité | ✅ | ✅ |

> 💡 Pour une expérience optimale et l'installation comme app :
> - **iPhone/iPad** → Safari obligatoire
> - **Android** → Chrome recommandé
> - **Mac** → Safari ou Chrome
> - **Windows** → Chrome ou Edge

