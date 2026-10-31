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

# 6. Kernel & Network Optimization (Google BBR, Low Latency TCP & High Load Capacity)
echo "⚡ Tuning Linux Kernel TCP parameters for real-time multiplayer & voice under high load..."
cat << 'EOF' | sudo tee /etc/sysctl.d/99-game-server.conf
# File descriptor ceilings
fs.file-max = 2097152

# Socket listen backlog (prevents dropped connections on traffic spikes)
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Fast socket recycling & ephemeral port range
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Network memory buffer ceilings
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Real-time congestion control & pacing
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_notsent_lowat = 16384
net.ipv4.tcp_fastopen = 3
EOF
sudo sysctl -p /etc/sysctl.d/99-game-server.conf || true

# System-wide file descriptor limits for processes
echo "⚡ Setting system security limits (nofile 1048576)..."
cat << 'EOF' | sudo tee /etc/security/limits.d/99-game-nofile.conf
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
ubuntu soft nofile 1048576
ubuntu hard nofile 1048576
www-data soft nofile 1048576
www-data hard nofile 1048576
EOF

# 7. Configure Firewall
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

