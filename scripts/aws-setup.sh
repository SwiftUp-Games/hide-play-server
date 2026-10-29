#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Hide & Play Server — AWS Ubuntu Automated Setup Script"
echo "=========================================================="

# 1. Update and basic tools
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

# 2. Add 2GB Swap Memory (ensures npm build and spikes don't trigger OOM)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ 2GB Swap enabled."
else
    echo "ℹ️ Swap file already exists."
fi

# 3. Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# 5. Create log directory
mkdir -p logs

# 6. Configure Firewall
echo "🛡️ Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 7. Configure Nginx
echo "🌐 Configuring Nginx reverse proxy..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "$SCRIPT_DIR/nginx-hide-play.conf" /etc/nginx/sites-available/hide-play.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/hide-play.conf /etc/nginx/sites-enabled/hide-play.conf
sudo nginx -t
sudo systemctl restart nginx

echo "=========================================================="
echo "✅ AWS server environment is successfully configured!"
echo "Next step: Run ./scripts/deploy-aws.sh to build and start the server."
echo "=========================================================="

