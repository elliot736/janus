# Real IP — Nginx is the edge, use TCP source directly
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;

# WebSocket support (for Next.js HMR in dev)
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Timeouts
proxy_connect_timeout 5s;
proxy_send_timeout 10s;
proxy_read_timeout 30s;

# Buffer settings
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
